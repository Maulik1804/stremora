'use strict';

const mongoose = require('mongoose');
const { IS_PRODUCTION } = require('../config/env');

const globalErrorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';

  // ── Mongoose CastError (invalid ObjectId) → 400 ───────────────────────────
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for field '${err.path}': ${err.value}`;
  }

  // ── Mongoose ValidationError → 422 ───────────────────────────────────────
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 422;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  // ── MongoDB duplicate key → 409 ───────────────────────────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for '${field}'`;
  }

  const isServerError = statusCode >= 500;

  res.status(statusCode).json({
    success: false,
    message:
      isServerError && IS_PRODUCTION
        ? 'An internal server error occurred'
        : message,
    errors: err.errors || [],
    ...(IS_PRODUCTION ? {} : { stack: err.stack }),
  });
};

module.exports = globalErrorHandler;
