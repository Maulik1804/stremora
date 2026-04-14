'use strict';

const dotenv = require('dotenv');

dotenv.config();

const REQUIRED_VARS = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI',
  'ACCESS_TOKEN_SECRET',
  'ACCESS_TOKEN_EXPIRY',
  'REFRESH_TOKEN_SECRET',
  'REFRESH_TOKEN_EXPIRY',
  'CORS_ORIGIN',
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please copy .env.example to .env and fill in all required values.'
  );
}

const NODE_ENV = process.env.NODE_ENV;
const IS_PRODUCTION = NODE_ENV === 'production';

const PORT = Number(process.env.PORT);
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_POOL_MIN = Number(process.env.MONGODB_POOL_MIN ?? 5);
const MONGODB_POOL_MAX = Number(process.env.MONGODB_POOL_MAX ?? 50);

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY;

// Support comma-separated origins e.g. "http://localhost:5173,http://192.168.1.159:5173"
const CORS_ORIGIN = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX ?? 100);

// Cloudinary (optional at startup — validated when upload routes are hit)
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

module.exports = {
  NODE_ENV,
  IS_PRODUCTION,
  PORT,
  MONGODB_URI,
  MONGODB_POOL_MIN,
  MONGODB_POOL_MAX,
  ACCESS_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRY,
  CORS_ORIGIN,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
};
