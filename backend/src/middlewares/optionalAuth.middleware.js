'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ACCESS_TOKEN_SECRET } = require('../config/env');

/**
 * Optional JWT middleware.
 * Attaches req.user if a valid Bearer token is present.
 * Does NOT reject the request if the token is missing or invalid.
 * Use on public routes that have auth-dependent behaviour (e.g. isSubscribed).
 */
const optionalJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded._id).select('-passwordHash -refreshTokenHash');
    if (user) req.user = user;
  } catch {
    // Token invalid or expired — just continue without req.user
  }
  next();
};

module.exports = optionalJWT;
