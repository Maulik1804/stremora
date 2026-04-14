'use strict';

/**
 * Streamora API Test Suite
 * Run: node backend/tests/api-test.js
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.argv[2] || 'https://tunnel-rand-comic-praise.trycloudflare.com';
const API = `${BASE_URL}/api/v1`;

let passed = 0;
let failed = 0;
let warnings = 0;
const results = [];

// ── HTTP helper ───────────────────────────────────────────────────────────────
function request(method, url, body = null, headers = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : http;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Origin': 'https://streamora-web.netlify.app',
      ...headers,
    };

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method,
      headers: defaultHeaders,
      timeout: 15000,
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const ms = Date.now() - start;
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: json || data, ms });
      });
    });

    req.on('error', (e) => resolve({ status: 0, error: e.message, ms: Date.now() - start }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'TIMEOUT', ms: 15000 }); });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Test runner ───────────────────────────────────────────────────────────────
async function test(label, fn) {
  try {
    const result = await fn();
    if (result.pass) {
      passed++;
      console.log(`  ✅ ${label} (${result.ms}ms)`);
      if (result.warn) { warnings++; console.log(`     ⚠️  ${result.warn}`); }
    } else {
      failed++;
      console.log(`  ❌ ${label}`);
      console.log(`     → ${result.reason}`);
    }
    results.push({ label, ...result });
  } catch (e) {
    failed++;
    console.log(`  ❌ ${label} — EXCEPTION: ${e.message}`);
  }
}

function pass(ms, warn) { return { pass: true, ms, warn }; }
function fail(reason, ms = 0) { return { pass: false, reason, ms }; }

function checkPerf(ms) {
  if (ms > 3000) return `Slow response: ${ms}ms (>3000ms)`;
  if (ms > 1500) return `Moderate response: ${ms}ms`;
  return null;
}

// ── TESTS ─────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('  STREAMORA API TEST SUITE');
  console.log(`  Target: ${BASE_URL}`);
  console.log('═'.repeat(60));

  let accessToken = null;
  let refreshToken = null;
  let testVideoId = null;
  let testCommentId = null;
  let testPlaylistId = null;
  const testUser = {
    email: `test_${Date.now()}@streamora.test`,
    username: `tester_${Date.now()}`.slice(0, 20),
    password: 'Test@12345',
  };

  // ── 1. HEALTH ──────────────────────────────────────────────────────────────
  console.log('\n📋 HEALTH CHECK');
  await test('GET /health', async () => {
    const r = await request('GET', `${BASE_URL}/health`);
    if (r.error) return fail(`Connection failed: ${r.error}`);
    if (r.status !== 200) return fail(`Expected 200, got ${r.status}. Body: ${JSON.stringify(r.body)}`);
    return pass(r.ms, checkPerf(r.ms));
  });

  // ── 2. CORS ────────────────────────────────────────────────────────────────
  console.log('\n🔒 CORS & SECURITY HEADERS');
  await test('CORS header present for Netlify origin', async () => {
    const r = await request('GET', `${BASE_URL}/health`);
    if (r.error) return fail(r.error);
    const acao = r.headers['access-control-allow-origin'];
    if (!acao) return fail('Missing Access-Control-Allow-Origin header');
    return pass(r.ms);
  });

  await test('Security headers (helmet)', async () => {
    const r = await request('GET', `${BASE_URL}/health`);
    if (r.error) return fail(r.error);
    const missing = [];
    if (!r.headers['x-content-type-options']) missing.push('x-content-type-options');
    if (!r.headers['x-frame-options']) missing.push('x-frame-options');
    if (missing.length) return fail(`Missing security headers: ${missing.join(', ')}`);
    return pass(r.ms);
  });

  // ── 3. AUTH ────────────────────────────────────────────────────────────────
  console.log('\n🔐 AUTH ENDPOINTS');

  await test('POST /auth/register — missing fields → 400', async () => {
    const r = await request('POST', `${API}/auth/register`, {});
    if (r.error) return fail(r.error);
    if (r.status !== 400) return fail(`Expected 400, got ${r.status}`);
    return pass(r.ms);
  });

  await test('POST /auth/register — invalid email → 400', async () => {
    const r = await request('POST', `${API}/auth/register`, { email: 'notanemail', username: 'abc', password: '12345678' });
    if (r.error) return fail(r.error);
    if (r.status !== 400) return fail(`Expected 400, got ${r.status}`);
    return pass(r.ms);
  });

  await test('POST /auth/register — valid → 201', async () => {
    const r = await request('POST', `${API}/auth/register`, testUser);
    if (r.error) return fail(r.error);
    if (r.status !== 201) return fail(`Expected 201, got ${r.status}. Body: ${JSON.stringify(r.body)}`);
    return pass(r.ms, checkPerf(r.ms));
  });

  await test('POST /auth/register — duplicate → 409', async () => {
    const r = await request('POST', `${API}/auth/register`, testUser);
    if (r.error) return fail(r.error);
    if (r.status !== 409) return fail(`Expected 409, got ${r.status}`);
    return pass(r.ms);
  });

  await test('POST /auth/login — wrong password → 401', async () => {
    const r = await request('POST', `${API}/auth/login`, { email: testUser.email, password: 'wrongpass' });
    if (r.error) return fail(r.error);
    if (r.status !== 401) return fail(`Expected 401, got ${r.status}`);
    return pass(r.ms);
  });

  await test('POST /auth/login — valid → 200 + tokens', async () => {
    const r = await request('POST', `${API}/auth/login`, { email: testUser.email, password: testUser.password });
    if (r.error) return fail(r.error);
    if (r.status !== 200) return fail(`Expected 200, got ${r.status}. Body: ${JSON.stringify(r.body)}`);
    accessToken = r.body?.data?.accessToken;
    refreshToken = r.body?.data?.refreshToken;
    if (!accessToken) return fail('No accessToken in response');
    return pass(r.ms, checkPerf(r.ms));
  });

  await test('POST /auth/forgot-password — invalid email → 400', async () => {
    const r = await request('POST', `${API}/auth/forgot-password`, { email: 'bad' });
    if (r.error) return fail(r.error);
    if (r.status !== 400) return fail(`Expected 400, got ${r.status}`);
    return pass(r.ms);
  });

  await test('POST /auth/forgot-password — unknown email → 200 (no leak)', async () => {
    const r = await request('POST', `${API}/auth/forgot-password`, { email: 'nobody@nowhere.com' });
    if (r.error) return fail(r.error);
    if (r.status !== 200) return fail(`Expected 200 (security: no user enumeration), got ${r.status}`);
    return pass(r.ms);
  });

  // ── 4. USERS ───────────────────────────────────────────────────────────────
  console.log('\n👤 USER ENDPOINTS');

  await test('GET /users/me — no auth → 401', async () => {
    const r = await request('GET', `${API}/users/me`);
    if (r.error) return fail(r.error);
    if (r.status !== 401) return fail(`Expected 401, got ${r.status}`);
    return pass(r.ms);
  });

  await test('GET /users/me — with auth → 200', async () => {
    if (!accessToken) return fail('No access token (login failed)');
    const r = await request('GET', `${API}/users/me`, null, { Authorization: `Bearer ${accessToken}` });
    if (r.error) return fail(r.error);
    if (r.status !== 200) return fail(`Expected 200, got ${r.status}. Body: ${JSON.stringify(r.body)}`);
    return pass(r.ms, checkPerf(r.ms));
  });

  await test('GET /users/:username — valid username → 200', async () => {
    const r = await request('GET', `${API}/users/${testUser.username}`);
    if (r.error) return fail(r.error);
    if (r.status !== 200) return fail(`Expected 200, got ${r.status}`);
    return pass(r.ms, checkPerf(r.ms));
  });

  await test('GET /users/:username — nonexistent → 404', async () => {
    const r = await request('GET', `${API}/users/this_user_does_not_exist_xyz999`);
    if (r.error) return fail(r.error);
    if (r.status !== 404) return fail(`Expected 404, got ${r.status}`);
    return pass(r.ms);
  });

  // ── 5. VIDEOS ──────────────────────────────────────────────────────────────
  console.log('\n🎬 VIDEO ENDPOINTS');

  await test('GET /videos — public feed → 200', async () => {
    const r = await request('GET', `${API}/videos`);
    if (r.error) return fail(r.error);
    if (r.status !== 200) return fail(`Expected 200, got ${r.status}. Body: ${JSON.stringify(r.body)}`);
    const videos = r.body?.data?.videos || r.body?.data?.docs || [];
    if (videos.length > 0) testVideoId = videos[0]._id;
    return pass(r.ms, checkPerf(r.ms));
  });

  await test('GET /videos/trending → 200', async () => {
    const r = await request('GET', `${API}/videos/trending`);
    if (r.error) return fail(r.error);
    if (r.status !== 200) return fail(`Expected 200, got ${r.status}`);
    return pass(r.ms, checkPerf(r.ms));
  });

  await test('GET /videos/search — missing query → 400', async () => {
    const r = await request('GET', `${API}/videos/search`);
    if (r.error) return fail(r.error);
    if (r.status !== 400) return fail(`Expected 400, got ${r.status}`);
    return pass(r.ms);
  });

  await test('GET /videos/search?q=test → 200', async () => {
    const r = await request('GET', `${API}/videos/search?q=test`);
    if (r.error) return fail(r.error);
    if (r.status !== 200) return fail(`Expected 200, got ${r.status}`);
    return pass(r.ms, checkPerf(r.ms));
  });

  await test('GET /videos/:id — invalid id → 400/404', async () => {
    const r = await request('GET', `${API}/videos/notanid`);
    if (r.error) return fail(r.error);
    if (![400, 404].includes(r.status)) return fail(`Expected 400 or 404, got ${r.status}`);
    return pass(r.ms);
  });

  if (testVideoId) {
    await test(`GET /videos/${testVideoId} — valid id → 200`, async () => {
      const r = await request('GET', `${API}/videos/${testVideoId}`);
      if (r.error) return fail(r.error);
      if (r.status !== 200) return fail(`Expected 200, got ${r.status}`);
      return pass(r.ms, checkPerf(r.ms));
    });
  }

  await test('POST /videos — no auth → 401', async () => {
    const r = await request('POST', `${API}/videos`, { title: 'test' });
    if (r.error) return fail(r.error);
    if (r.status !== 401) return fail(`Expected 401, got ${r.status}`);
    return pass(r.ms);
  });

  await test('GET /videos/subscriptions/feed — no auth → 401', async () => {
    const r = await request('GET', `${API}/videos/subscriptions/feed`);
    if (r.error) return fail(r.error);
    if (r.status !== 401) return fail(`Expected 401, got ${r.status}`);
    return pass(r.ms);
  });

  // ── 6. COMMENTS ───────────────────────────────────────────────────────────
  console.log('\n💬 COMMENT ENDPOINTS');

  await test('GET /comments — no videoId → 400', async () => {
    const r = await request('GET', `${API}/comments`);
    if (r.error) return fail(r.error);
    if (![400, 200].includes(r.status)) return fail(`Got ${r.status}`);
    return pass(r.ms);
  });

  if (testVideoId) {
    await test(`GET /comments?videoId=${testVideoId} → 200`, async () => {
      const r = await request('GET', `${API}/comments?videoId=${testVideoId}`);
      if (r.error) return fail(r.error);
      if (r.status !== 200) return fail(`Expected 200, got ${r.status}`);
      return pass(r.ms, checkPerf(r.ms));
    });

    await test('POST /comments — with auth → 201', async () => {
      if (!accessToken) return fail('No access token');
      const r = await request('POST', `${API}/comments`,
        { videoId: testVideoId, text: 'Automated test comment' },
        { Authorization: `Bearer ${accessToken}` }
      );
      if (r.error) return fail(r.error);
      if (r.status !== 201) return fail(`Expected 201, got ${r.status}. Body: ${JSON.stringify(r.body)}`);
      testCommentId = r.body?.data?._id;
      return pass(r.ms, checkPerf(r.ms));
    });
  }

  await test('POST /comments — no auth → 401', async () => {
    const r = await request('POST', `${API}/comments`, { videoId: 'fakeid', text: 'hi' });
    if (r.error) return fail(r.error);
    if (r.status !== 401) return fail(`Expected 401, got ${r.status}`);
    return pass(r.ms);
  });

  // ── 7. LIKES ──────────────────────────────────────────────────────────────
  console.log('\n👍 LIKE ENDPOINTS');

  await test('POST /likes — no auth → 401', async () => {
    const r = await request('POST', `${API}/likes`, { resourceType: 'video', resourceId: 'fakeid', reaction: 'like' });
    if (r.error) return fail(r.error);
    if (r.status !== 401) return fail(`Expected 401, got ${r.status}`);
    return pass(r.ms);
  });

  await test('POST /likes — invalid resourceType → 400', async () => {
    if (!accessToken) return fail('No access token');
    const r = await request('POST', `${API}/likes`,
      { resourceType: 'invalid', resourceId: testVideoId || '507f1f77bcf86cd799439011', reaction: 'like' },
      { Authorization: `Bearer ${accessToken}` }
    );
    if (r.error) return fail(r.error);
    if (r.status !== 400) return fail(`Expected 400, got ${r.status}`);
    return pass(r.ms);
  });

  await test('GET /likes/me/videos — no auth → 401', async () => {
    const r = await request('GET', `${API}/likes/me/videos`);
    if (r.error) return fail(r.error);
    if (r.status !== 401) return fail(`Expected 401, got ${r.status}`);
    return pass(r.ms);
  });

  // ── 8. PLAYLISTS ──────────────────────────────────────────────────────────
  console.log('\n📋 PLAYLIST ENDPOINTS');

  await test('GET /playlists/me — no auth → 401', async () => {
    const r = await request('GET', `${API}/playlists/me`);
    if (r.error) return fail(r.error);
    if (r.status !== 401) return fail(`Expected 401, got ${r.status}`);
    return pass(r.ms);
  });

  await test('POST /playlists — with auth → 201', async () => {
    if (!accessToken) return fail('No access token');
    const r = await request('POST', `${API}/playlists`,
      { title: 'Test Playlist', visibility: 'private' },
      { Authorization: `Bearer ${accessToken}` }
    );
    if (r.error) return fail(r.error);
    if (r.status !== 201) return fail(`Expected 201, got ${r.status}. Body: ${JSON.stringify(r.body)}`);
    testPlaylistId = r.body?.data?._id;
    return pass(r.ms, checkPerf(r.ms));
  });

  await test('POST /playlists — missing title → 400', async () => {
    if (!accessToken) return fail('No access token');
    const r = await request('POST', `${API}/playlists`,
      { visibility: 'public' },
      { Authorization: `Bearer ${accessToken}` }
    );
    if (r.error) return fail(r.error);
    if (r.status !== 400) return fail(`Expected 400, got ${r.status}`);
    return pass(r.ms);
  });

  // ── 9. SUBSCRIPTIONS ──────────────────────────────────────────────────────
  console.log('\n🔔 SUBSCRIPTION ENDPOINTS');

  await test('GET /subscriptions/me — no auth → 401', async () => {
    const r = await request('GET', `${API}/subscriptions/me`);
    if (r.error) return fail(r.error);
    if (r.status !== 401) return fail(`Expected 401, got ${r.status}`);
    return pass(r.ms);
  });

  // ── 10. HISTORY ───────────────────────────────────────────────────────────
  console.log('\n📜 HISTORY ENDPOINTS');

  await test('GET /history — no auth → 401', async () => {
    const r = await request('GET', `${API}/history`);
    if (r.error) return fail(r.error);
    if (r.status !== 401) return fail(`Expected 401, got ${r.status}`);
    return pass(r.ms);
  });

  await test('GET /history — with auth → 200', async () => {
    if (!accessToken) return fail('No access token');
    const r = await request('GET', `${API}/history`, null, { Authorization: `Bearer ${accessToken}` });
    if (r.error) return fail(r.error);
    if (r.status !== 200) return fail(`Expected 200, got ${r.status}`);
    return pass(r.ms, checkPerf(r.ms));
  });

  // ── 11. GOALS ─────────────────────────────────────────────────────────────
  console.log('\n🎯 GOAL ENDPOINTS');

  await test('GET /goals — no auth → 401', async () => {
    const r = await request('GET', `${API}/goals`);
    if (r.error) return fail(r.error);
    if (r.status !== 401) return fail(`Expected 401, got ${r.status}`);
    return pass(r.ms);
  });

  await test('GET /goals — with auth → 200', async () => {
    if (!accessToken) return fail('No access token');
    const r = await request('GET', `${API}/goals`, null, { Authorization: `Bearer ${accessToken}` });
    if (r.error) return fail(r.error);
    if (r.status !== 200) return fail(`Expected 200, got ${r.status}`);
    return pass(r.ms, checkPerf(r.ms));
  });

  // ── 12. NOTIFICATIONS ─────────────────────────────────────────────────────
  console.log('\n🔔 NOTIFICATION ENDPOINTS');

  await test('GET /notifications — no auth → 401', async () => {
    const r = await request('GET', `${API}/notifications`);
    if (r.error) return fail(r.error);
    if (r.status !== 401) return fail(`Expected 401, got ${r.status}`);
    return pass(r.ms);
  });

  await test('GET /notifications — with auth → 200', async () => {
    if (!accessToken) return fail('No access token');
    const r = await request('GET', `${API}/notifications`, null, { Authorization: `Bearer ${accessToken}` });
    if (r.error) return fail(r.error);
    if (r.status !== 200) return fail(`Expected 200, got ${r.status}`);
    return pass(r.ms, checkPerf(r.ms));
  });

  // ── 13. FEATURES ──────────────────────────────────────────────────────────
  console.log('\n⚡ FEATURE ENDPOINTS');

  await test('GET /features/trending-realtime → 200', async () => {
    const r = await request('GET', `${API}/features/trending-realtime`);
    if (r.error) return fail(r.error);
    if (r.status !== 200) return fail(`Expected 200, got ${r.status}`);
    return pass(r.ms, checkPerf(r.ms));
  });

  await test('GET /features/random-video → 200', async () => {
    const r = await request('GET', `${API}/features/random-video`);
    if (r.error) return fail(r.error);
    if (r.status !== 200) return fail(`Expected 200, got ${r.status}`);
    return pass(r.ms, checkPerf(r.ms));
  });

  await test('GET /features/smart-playlists → 200', async () => {
    const r = await request('GET', `${API}/features/smart-playlists`);
    if (r.error) return fail(r.error);
    if (r.status !== 200) return fail(`Expected 200, got ${r.status}`);
    return pass(r.ms, checkPerf(r.ms));
  });

  await test('GET /features/xp — no auth → 401', async () => {
    const r = await request('GET', `${API}/features/xp`);
    if (r.error) return fail(r.error);
    if (r.status !== 401) return fail(`Expected 401, got ${r.status}`);
    return pass(r.ms);
  });

  await test('GET /features/xp — with auth → 200', async () => {
    if (!accessToken) return fail('No access token');
    const r = await request('GET', `${API}/features/xp`, null, { Authorization: `Bearer ${accessToken}` });
    if (r.error) return fail(r.error);
    if (r.status !== 200) return fail(`Expected 200, got ${r.status}`);
    return pass(r.ms, checkPerf(r.ms));
  });

  await test('GET /features/continue-watching — with auth → 200', async () => {
    if (!accessToken) return fail('No access token');
    const r = await request('GET', `${API}/features/continue-watching`, null, { Authorization: `Bearer ${accessToken}` });
    if (r.error) return fail(r.error);
    if (r.status !== 200) return fail(`Expected 200, got ${r.status}`);
    return pass(r.ms, checkPerf(r.ms));
  });

  await test('GET /features/watch-later-reminders — with auth → 200', async () => {
    if (!accessToken) return fail('No access token');
    const r = await request('GET', `${API}/features/watch-later-reminders`, null, { Authorization: `Bearer ${accessToken}` });
    if (r.error) return fail(r.error);
    if (r.status !== 200) return fail(`Expected 200, got ${r.status}`);
    return pass(r.ms, checkPerf(r.ms));
  });

  // ── 14. 404 HANDLER ───────────────────────────────────────────────────────
  console.log('\n🚫 ERROR HANDLING');

  await test('GET /api/v1/nonexistent → 404', async () => {
    const r = await request('GET', `${API}/nonexistent-route-xyz`);
    if (r.error) return fail(r.error);
    if (r.status !== 404) return fail(`Expected 404, got ${r.status}`);
    return pass(r.ms);
  });

  await test('No server info leak in error response', async () => {
    const r = await request('GET', `${API}/nonexistent-route-xyz`);
    if (r.error) return fail(r.error);
    const serverHeader = r.headers['x-powered-by'];
    if (serverHeader) return fail(`x-powered-by header exposed: ${serverHeader}`);
    return pass(r.ms);
  });

  // ── 15. CLEANUP ───────────────────────────────────────────────────────────
  console.log('\n🧹 CLEANUP');

  if (testCommentId && accessToken) {
    await test(`DELETE /comments/${testCommentId} — cleanup`, async () => {
      const r = await request('DELETE', `${API}/comments/${testCommentId}`, null, { Authorization: `Bearer ${accessToken}` });
      if (r.error) return fail(r.error);
      if (![200, 204].includes(r.status)) return fail(`Expected 200/204, got ${r.status}`);
      return pass(r.ms);
    });
  }

  if (testPlaylistId && accessToken) {
    await test(`DELETE /playlists/${testPlaylistId} — cleanup`, async () => {
      const r = await request('DELETE', `${API}/playlists/${testPlaylistId}`, null, { Authorization: `Bearer ${accessToken}` });
      if (r.error) return fail(r.error);
      if (![200, 204].includes(r.status)) return fail(`Expected 200/204, got ${r.status}`);
      return pass(r.ms);
    });
  }

  if (accessToken) {
    await test('POST /auth/logout — cleanup', async () => {
      const r = await request('POST', `${API}/auth/logout`, null, { Authorization: `Bearer ${accessToken}` });
      if (r.error) return fail(r.error);
      if (r.status !== 200) return fail(`Expected 200, got ${r.status}`);
      return pass(r.ms);
    });
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  ✅ Passed  : ${passed}`);
  console.log(`  ❌ Failed  : ${failed}`);
  console.log(`  ⚠️  Warnings: ${warnings}`);
  console.log('─'.repeat(60));

  if (failed === 0) {
    console.log('\n  🎉 All APIs are working smoothly on Cloudflare!\n');
  } else {
    console.log('\n  ⚠️  Some tests failed. Review the issues above.\n');
    const failures = results.filter(r => !r.pass);
    console.log('  FAILED TESTS:');
    failures.forEach(f => console.log(`   - ${f.label}: ${f.reason}`));
    console.log('');
  }
}

runTests().catch(console.error);
