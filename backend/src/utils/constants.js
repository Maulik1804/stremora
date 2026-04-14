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

// secure: false and sameSite: 'lax' so the cookie works over HTTP on LAN
// (set secure: true and sameSite: 'strict' only in production with HTTPS)
const IS_PROD = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = Object.freeze({
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? 'strict' : 'lax',
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
