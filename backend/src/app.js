'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
// xss sanitization applied via express-mongo-sanitize + helmet CSP

const { CORS_ORIGIN } = require('./config/env');
const { globalRateLimiter } = require('./middlewares/rateLimiter.middleware');
const globalErrorHandler = require('./middlewares/error.middleware');
const ApiError = require('./utils/ApiError');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
// In development, the Vite dev server proxies all /api requests to this backend.
// The proxy sends requests with no Origin header (server-to-server), so we must
// allow no-origin requests. The browser never talks directly to port 8000.
app.use(
  cors({
    origin: (origin, callback) => {
      // No origin = Vite proxy or curl/Postman — always allow
      if (!origin) return callback(null, true);
      // Allow any localhost port (covers any dev machine)
      if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
      // Allow any Cloudflare tunnel URL — so you never need to update backend when tunnel restarts
      if (/^https:\/\/[^.]+\.trycloudflare\.com$/.test(origin)) return callback(null, true);
      // Allow explicitly listed origins from env (production domains)
      if (CORS_ORIGIN.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Increase request timeout for large file uploads ───────────────────────────
// Set to 10 minutes for large video uploads
app.use((req, res, next) => {
  req.setTimeout(10 * 60 * 1000); // 10 minutes
  res.setTimeout(10 * 60 * 1000); // 10 minutes
  next();
});

// ── Cookie parser ─────────────────────────────────────────────────────────────
app.use(cookieParser());

// ── Sanitization ──────────────────────────────────────────────────────────────
app.use(mongoSanitize());

// ── Global rate limiter ───────────────────────────────────────────────────────
app.use(globalRateLimiter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Streamora API is running' });
});

// ── API routes ────────────────────────────────────────────────────────────────
const apiRouter = require('./routes/index');
app.use('/api/v1', apiRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(globalErrorHandler);

module.exports = app;
