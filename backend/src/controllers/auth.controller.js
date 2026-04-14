'use strict';

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const {
  generateTokens,
  verifyRefreshToken,
  clearRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
} = require('../services/auth.service');
const { sendPasswordResetEmail } = require('../services/email.service');
const { REFRESH_TOKEN_SECRET } = require('../config/env');
const { REFRESH_TOKEN_COOKIE_NAME } = require('../utils/constants');

const BCRYPT_COST = 12;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// ── Helpers ───────────────────────────────────────────────────────────────────

const sanitizeUser = (user) => ({
  _id: user._id,
  email: user.email,
  username: user.username,
  displayName: user.displayName,
  avatar: user.avatar,
  banner: user.banner,
  bio: user.bio,
  role: user.role,
  isHistoryPaused: user.isHistoryPaused,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 * Register a new user account.
 */
const register = asyncHandler(async (req, res) => {
  const { email, username, password, displayName } = req.body;

  // Check for duplicate email or username
  const existing = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });

  if (existing) {
    const field = existing.email === email.toLowerCase() ? 'email' : 'username';
    throw new ApiError(409, `An account with this ${field} already exists`);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  // Create user
  const user = await User.create({
    email,
    username,
    passwordHash,
    displayName: displayName || username,
  });

  // Generate tokens and set cookie
  const { accessToken, refreshToken } = await generateTokens(user);
  setRefreshCookie(res, refreshToken);

  return res
    .status(201)
    .json(
      new ApiResponse(201, { user: sanitizeUser(user), accessToken }, 'Account created successfully')
    );
});

/**
 * POST /api/v1/auth/login
 * Authenticate a user and issue tokens.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user — include passwordHash for comparison
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+passwordHash'
  );

  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Check suspension before password comparison (same generic message)
  if (user.isSuspended) {
    throw new ApiError(403, 'Account suspended');
  }

  const isMatch = await user.isPasswordCorrect(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const { accessToken, refreshToken } = await generateTokens(user);
  setRefreshCookie(res, refreshToken);

  return res
    .status(200)
    .json(
      new ApiResponse(200, { user: sanitizeUser(user), accessToken }, 'Login successful')
    );
});

/**
 * POST /api/v1/auth/logout
 * Invalidate the refresh token and clear the cookie.
 * Requires: verifyJWT middleware
 */
const logout = asyncHandler(async (req, res) => {
  await clearRefreshToken(req.user._id);
  clearRefreshCookie(res);

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'Logged out successfully'));
});

/**
 * POST /api/v1/auth/refresh
 * Rotate the refresh token and issue a new access token.
 */
const refreshToken = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];

  if (!incomingToken) {
    throw new ApiError(401, 'Authentication required');
  }

  // Decode to get user ID (without verifying signature yet — we verify via bcrypt)
  let decoded;
  try {
    decoded = jwt.verify(incomingToken, REFRESH_TOKEN_SECRET);
  } catch {
    throw new ApiError(401, 'Authentication required');
  }

  // Fetch user with refreshTokenHash
  const user = await User.findById(decoded._id).select('+refreshTokenHash');
  if (!user) {
    throw new ApiError(401, 'Authentication required');
  }

  const isValid = await verifyRefreshToken(incomingToken, user);
  if (!isValid) {
    throw new ApiError(401, 'Authentication required');
  }

  // Rotate tokens
  const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user);
  setRefreshCookie(res, newRefreshToken);

  return res
    .status(200)
    .json(new ApiResponse(200, { accessToken }, 'Token refreshed'));
});

/**
 * POST /api/v1/auth/forgot-password
 * Send a password reset email.
 * Body: { email }
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email is required');

  const user = await User.findOne({ email: email.toLowerCase() });

  // Always respond with success to prevent email enumeration
  if (!user) {
    return res.status(200).json(
      new ApiResponse(200, null, 'If that email exists, a reset link has been sent.')
    );
  }

  // Generate a secure random token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
  await user.save({ validateBeforeSave: false });

  // Build reset URL — use FRONTEND_URL env var or fall back to first CORS origin
  const frontendOrigin =
    process.env.FRONTEND_URL ||
    (Array.isArray(process.env.CORS_ORIGIN)
      ? process.env.CORS_ORIGIN[0]
      : (process.env.CORS_ORIGIN || '').split(',')[0].trim()) ||
    'http://localhost:5173';
  const resetUrl = `${frontendOrigin}/reset-password?token=${rawToken}`;

  try {
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (err) {
    // Clean up token if email fails
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, 'Failed to send reset email. Please try again.');
  }

  return res.status(200).json(
    new ApiResponse(200, null, 'If that email exists, a reset link has been sent.')
  );
});

/**
 * POST /api/v1/auth/reset-password
 * Reset password using the token from email.
 * Body: { token, newPassword }
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ApiError(400, 'Token and new password are required');
  }
  if (newPassword.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }

  // Hash the incoming token to compare with stored hash
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new ApiError(400, 'Reset link is invalid or has expired');
  }

  // Update password and clear reset fields
  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // Invalidate all existing sessions
  user.refreshTokenHash = undefined;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(200, null, 'Password reset successfully. Please sign in.')
  );
});

module.exports = { register, login, logout, refreshToken, forgotPassword, resetPassword };
