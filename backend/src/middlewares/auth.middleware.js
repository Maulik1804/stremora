'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ACCESS_TOKEN_SECRET } = require('../config/env');

const verifyJWT = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication required');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Authentication required');
  }

  const user = await User.findById(decoded._id).select(
    '-passwordHash -refreshTokenHash'
  );
  if (!user) {
    throw new ApiError(401, 'Authentication required');
  }

  req.user = user;
  next();
});

module.exports = verifyJWT;
