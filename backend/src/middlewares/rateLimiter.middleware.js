'use strict';

const rateLimit = require('express-rate-limit');
const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } = require('../config/env');

const globalRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Never rate-limit token refresh — it's called automatically by the app
    // req.path at the app level includes the full path
    if (req.path.endsWith('/auth/refresh')) return true;
    return false;
  },
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    errors: [],
  },
});

// Auth rate limiter — only applies to login, register, forgot-password
// NOT applied to /refresh (the app calls that automatically on every load)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                   // raised from 10 — allows normal usage without false 429s
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/refresh', // never rate-limit token refresh
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    errors: [],
  },
});

module.exports = { globalRateLimiter, authRateLimiter };
