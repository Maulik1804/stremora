'use strict';

const Video = require('../models/Video');
const Comment = require('../models/Comment');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// ── Feature 11: Real-time Trending ───────────────────────────────────────────

/**
 * GET /api/v1/features/trending-realtime
 * Trending based on views in the last 1–2 hours.
 * Uses a lightweight in-memory cache (60s TTL) to avoid hammering the DB.
 */
let trendingCache = { data: null, expiresAt: 0 };

const getTrendingRealtime = asyncHandler(async (req, res) => {
  const now = Date.now();
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const windowHours = Math.min(parseInt(req.query.hours) || 2, 24);

  // Serve from cache if still fresh (60s TTL)
  if (trendingCache.data && now < trendingCache.expiresAt) {
    return res.status(200).json(new ApiResponse(200, trendingCache.data));
  }

  const since = new Date(now - windowHours * 3600 * 1000);

  const videos = await Video.find({
    status: 'published',
    visibility: 'public',
    isDeleted: false,
    updatedAt: { $gte: since }, // recently active
  })
    .sort({ viewCount: -1, likeCount: -1, createdAt: -1 })
    .limit(limit)
    .populate('owner', 'username displayName avatar')
    .lean();

  const payload = { videos, windowHours, generatedAt: new Date().toISOString() };
  trendingCache = { data: payload, expiresAt: now + 60_000 }; // 60s cache

  return res.status(200).json(new ApiResponse(200, payload));
});

// ── Feature 12: Pinned Comment ────────────────────────────────────────────────

/**
 * GET /api/v1/features/pinned-comment/:videoId
 * Returns the top-liked non-deleted top-level comment for a video.
 */
const getPinnedComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findOne({
    video: req.params.videoId,
    parent: null,
    isDeleted: false,
    likeCount: { $gt: 0 },
  })
    .sort({ likeCount: -1, createdAt: -1 })
    .populate('author', 'username displayName avatar')
    .lean();

  return res.status(200).json(new ApiResponse(200, { comment: comment || null }));
});

// ── Feature 14: Search Inside Video ──────────────────────────────────────────

/**
 * PUT /api/v1/features/keywords/:videoId
 * Creator sets keyword timestamps for their video.
 * Body: { keywords: [{ word, timestamp }] }
 */
const setKeywords = asyncHandler(async (req, res) => {
  const { keywords } = req.body;

  if (!Array.isArray(keywords)) throw new ApiError(400, 'keywords must be an array');

  const video = await Video.findOne({ _id: req.params.videoId, isDeleted: false });
  if (!video) throw new ApiError(404, 'Video not found');
  if (!video.owner.equals(req.user._id)) throw new ApiError(403, 'Forbidden');

  // Validate and sanitize
  const sanitized = keywords
    .filter((k) => k.word && typeof k.timestamp === 'number')
    .map((k) => ({ word: String(k.word).trim().toLowerCase(), timestamp: Math.max(0, k.timestamp) }))
    .slice(0, 100); // max 100 keywords

  video.keywords = sanitized;
  await video.save();

  return res.status(200).json(new ApiResponse(200, { keywords: video.keywords }, 'Keywords saved'));
});

/**
 * GET /api/v1/features/keywords/:videoId?q=
 * Search keywords inside a video. Returns matching timestamps.
 */
const searchKeywords = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 1) throw new ApiError(400, 'q is required');

  const video = await Video.findOne({ _id: req.params.videoId, isDeleted: false })
    .select('keywords duration title')
    .lean();

  if (!video) throw new ApiError(404, 'Video not found');

  const term = q.trim().toLowerCase();
  const matches = (video.keywords || []).filter((k) => k.word && k.word.includes(term));

  return res.status(200).json(new ApiResponse(200, { matches, total: matches.length }));
});

module.exports = {
  getTrendingRealtime,
  getPinnedComment,
  setKeywords,
  searchKeywords,
};
