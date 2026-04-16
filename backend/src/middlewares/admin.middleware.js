'use strict';

const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * requireAdmin — must be used AFTER verifyJWT.
 * Checks that req.user.role === 'admin', throws 403 otherwise.
 */
const requireAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new ApiError(403, 'Forbidden: admin access required');
  }
  next();
});

module.exports = requireAdmin;
