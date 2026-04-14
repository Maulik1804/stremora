'use strict';

const multer = require('multer');
const path = require('path');
const os = require('os');
const ApiError = require('../utils/ApiError');

// ── Limits ────────────────────────────────────────────────────────────────────
// Cloudinary Free plan: 100 MB max per video, 5 MB max per image
const LIMITS = {
  VIDEO: 100 * 1024 * 1024, // 100 MB
  IMAGE: 5 * 1024 * 1024,   // 5 MB
};

// ── Allowed MIME types ────────────────────────────────────────────────────────
// Windows/browsers report AVI with multiple MIME types — accept all variants.
const ALLOWED_VIDEO_MIMES = new Set([
  'video/mp4',
  'video/mpeg',
  // MOV
  'video/quicktime',
  // AVI — Windows may report any of these
  'video/avi',
  'video/msvideo',
  'video/x-msvideo',
  'video/x-avi',
  // MKV
  'video/x-matroska',
  'video/mkv',
  // Generic — some browsers send this for unknown types
  'application/octet-stream',
]);

const ALLOWED_VIDEO_EXTS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.mpeg', '.mpg']);

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
]);

const ALLOWED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

// ── Storage — OS temp dir ─────────────────────────────────────────────────────

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, file, cb) => {
    const uid = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uid}${path.extname(file.originalname).toLowerCase()}`);
  },
});

// ── File filters ──────────────────────────────────────────────────────────────

const videoFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_VIDEO_MIMES.has(file.mimetype) || ALLOWED_VIDEO_EXTS.has(ext)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `Invalid video type "${file.mimetype}". Allowed: MP4, MOV, AVI, MKV`), false);
  }
};

const imageFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_IMAGE_MIMES.has(file.mimetype) || ALLOWED_IMAGE_EXTS.has(ext)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `Invalid image type "${file.mimetype}". Allowed: JPEG, PNG, WebP, GIF`), false);
  }
};

// ── Multer instances ──────────────────────────────────────────────────────────

const uploadVideo = multer({
  storage: diskStorage,
  fileFilter: videoFilter,
  limits: { fileSize: LIMITS.VIDEO },
});

const uploadThumbnail = multer({
  storage: diskStorage,
  fileFilter: imageFilter,
  limits: { fileSize: LIMITS.IMAGE },
});

const uploadAvatar = multer({
  storage: diskStorage,
  fileFilter: imageFilter,
  limits: { fileSize: LIMITS.IMAGE },
});

const uploadBanner = multer({
  storage: diskStorage,
  fileFilter: imageFilter,
  limits: { fileSize: LIMITS.IMAGE },
});

// ── Multer error handler ──────────────────────────────────────────────────────

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(413, `File too large. Maximum video size is 100 MB (Cloudinary Free plan).`));
    }
    return next(new ApiError(400, `Upload error: ${err.message}`));
  }
  next(err);
};

module.exports = {
  uploadVideo,
  uploadThumbnail,
  uploadAvatar,
  uploadBanner,
  handleUploadError,
  LIMITS,
};
