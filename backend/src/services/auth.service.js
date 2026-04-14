'use strict';

const bcrypt = require('bcrypt');
const User = require('../models/User');
const { REFRESH_TOKEN_EXPIRY } = require('../config/env');
const { COOKIE_OPTIONS, REFRESH_TOKEN_COOKIE_NAME } = require('../utils/constants');

const BCRYPT_REFRESH_COST = 10;

// Parse "7d" → milliseconds for cookie maxAge
const parseExpiryToMs = (expiry) => {
  const unit = expiry.slice(-1);
  const value = parseInt(expiry.slice(0, -1), 10);
  const map = { s: 1000, m: 60 * 1000, h: 3600 * 1000, d: 86400 * 1000 };
  return value * (map[unit] || 1000);
};

/**
 * Generate access + refresh tokens, hash and persist the refresh token.
 * @param {import('../models/User')} user - Mongoose User document
 * @returns {{ accessToken: string, refreshToken: string }}
 */
const generateTokens = async (user) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_REFRESH_COST);

  await User.findByIdAndUpdate(user._id, { refreshTokenHash });

  return { accessToken, refreshToken };
};

/**
 * Verify an incoming refresh token against the stored hash.
 * @param {string} token - Raw refresh token from cookie
 * @param {import('../models/User')} user - User document with refreshTokenHash selected
 * @returns {Promise<boolean>}
 */
const verifyRefreshToken = async (token, user) => {
  if (!user.refreshTokenHash) return false;
  return bcrypt.compare(token, user.refreshTokenHash);
};

/**
 * Clear the stored refresh token hash for a user (logout / invalidation).
 * @param {string} userId
 */
const clearRefreshToken = async (userId) => {
  await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: '' } });
};

/**
 * Set the refresh token as an HTTP-only cookie on the response.
 * @param {import('express').Response} res
 * @param {string} refreshToken
 */
const setRefreshCookie = (res, refreshToken) => {
  const maxAge = parseExpiryToMs(REFRESH_TOKEN_EXPIRY);
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge,
  });
};

/**
 * Clear the refresh token cookie.
 * @param {import('express').Response} res
 */
const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, COOKIE_OPTIONS);
};

module.exports = {
  generateTokens,
  verifyRefreshToken,
  clearRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
};
