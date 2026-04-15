'use strict';

const { Router } = require('express');
const { body, query } = require('express-validator');

const {
  createVideo,
  uploadThumbnail: uploadThumbnailHandler,
  getVideoById,
  getAllVideos,
  getTrendingVideos,
  searchVideos,
  updateVideo,
  deleteVideo,
  getMyVideos,
  getChannelVideos,
  getSubscriptionFeed,
  recordView,
  initChunkedUpload,
  uploadChunk,
  finalizeChunkedUpload,
} = require('../controllers/video.controller');

const verifyJWT = require('../middlewares/auth.middleware');
const optionalJWT = require('../middlewares/optionalAuth.middleware');
const validate = require('../middlewares/validate.middleware');
const { uploadVideo, uploadThumbnail, handleUploadError } = require('../middlewares/upload.middleware');

const router = Router();

// ── IMPORTANT: Specific routes MUST come before /:id wildcard ─────────────────

// Static public routes
router.get('/trending', getTrendingVideos);
router.get('/search', [
  query('q').trim().isLength({ min: 2 }).withMessage('Query must be at least 2 characters'),
], validate, searchVideos);

// Authenticated static routes (before /:id)
router.get('/subscriptions/feed', verifyJWT, getSubscriptionFeed);

// Creator-only: own videos (Studio / Dashboard)
router.get('/mine', verifyJWT, getMyVideos);

// Public: all videos for a specific channel
router.get('/channel/:userId', getChannelVideos);

// Chunked upload routes
router.post('/upload/init', verifyJWT, [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 100 }).withMessage('Title max 100 chars'),
  body('fileSize').isInt({ min: 1 }).withMessage('fileSize must be a positive integer'),
], validate, initChunkedUpload);

router.post('/upload/:uploadSessionId/chunk', verifyJWT, uploadVideo.single('chunk'), handleUploadError, uploadChunk);

router.post('/upload/:uploadSessionId/finalize', verifyJWT, finalizeChunkedUpload);

// Upload (POST /)
router.post(
  '/',
  verifyJWT,
  uploadVideo.single('video'),
  handleUploadError,
  [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 100 }).withMessage('Title max 100 chars'),
    body('visibility').optional().isIn(['public', 'unlisted', 'private']).withMessage('Invalid visibility'),
  ],
  validate,
  createVideo
);

// Feed (GET /)
router.get('/', getAllVideos);

// ── Dynamic /:id routes ───────────────────────────────────────────────────────
router.get('/:id', optionalJWT, getVideoById);
router.post('/:id/thumbnail', verifyJWT, uploadThumbnail.single('thumbnail'), handleUploadError, uploadThumbnailHandler);
router.post('/:id/view', recordView);

router.patch(
  '/:id',
  verifyJWT,
  [
    body('title').optional().trim().isLength({ max: 100 }).withMessage('Title max 100 chars'),
    body('visibility').optional().isIn(['public', 'unlisted', 'private']).withMessage('Invalid visibility'),
  ],
  validate,
  updateVideo
);

router.delete('/:id', verifyJWT, deleteVideo);

module.exports = router;
