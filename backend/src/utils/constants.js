'use strict';

const VIDEO_VISIBILITY = Object.freeze({
  PUBLIC: 'public',
  UNLISTED: 'unlisted',
  PRIVATE: 'private',
});

const VIDEO_STATUS = Object.freeze({
  PROCESSING: 'processing',
  PUBLISHED: 'published',
  FAILED: 'failed',
});

const NOTIFICATION_TYPES = Object.freeze({
  NEW_VIDEO: 'new_video',
  NEW_COMMENT: 'new_comment',
  NEW_REPLY: 'new_reply',
  NEW_SUBSCRIBER: 'new_subscriber',
  MEMBERSHIP_PURCHASE: 'membership_purchase',
});

const USER_ROLES = Object.freeze({
  USER: 'user',
  CREATOR: 'creator',
  ADMIN: 'admin',
});

// In production the frontend (Netlify) and backend (Cloudflare) are on different
// domains — that is cross-site. Browsers block cookies with sameSite:'strict' or
// sameSite:'lax' on cross-site requests, so we MUST use sameSite:'none' + secure:true.
// In development both run on localhost so 'lax' is fine.
const IS_PROD = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = Object.freeze({
  httpOnly: true,
  secure: IS_PROD,                      // must be true when sameSite:'none'
  sameSite: IS_PROD ? 'none' : 'lax',  // 'none' required for cross-site (Netlify → Cloudflare)
});

const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

module.exports = {
  VIDEO_VISIBILITY,
  VIDEO_STATUS,
  NOTIFICATION_TYPES,
  USER_ROLES,
  COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE_NAME,
};
