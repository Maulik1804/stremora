'use strict';

const { Router } = require('express');
const { body, param } = require('express-validator');

// Features 2–5
const {
  markSkipSegment, getSkipSegments,
  trackEngagement, getEngagement,
  awardXP, getXP, getRandomVideo,
} = require('../controllers/features.controller');

// Features 6–10
const {
  createQuiz, getQuiz, submitQuiz,
  getSmartPlaylists,
  getWatchLaterReminders, dismissReminder, addToWatchLater,
  saveProgress, getContinueWatching,
} = require('../controllers/features2.controller');

// Features 11–14
const {
  getTrendingRealtime,
  getPinnedComment,
  setKeywords,
  searchKeywords,
} = require('../controllers/features3.controller');

const verifyJWT = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = Router();

// Reusable ObjectId param validator
const validVideoId = param('videoId')
  .isMongoId()
  .withMessage('Invalid videoId');

// ── Feature 2 ─────────────────────────────────────────────────────────────────
router.post('/skip-segment', verifyJWT,
  [
    body('videoId').isMongoId().withMessage('Invalid videoId'),
    body('start').isNumeric().withMessage('start must be a number'),
    body('end').isNumeric().withMessage('end must be a number'),
  ],
  validate, markSkipSegment);

router.get('/skip-segments/:videoId', [validVideoId], validate, getSkipSegments);

// ── Feature 3 ─────────────────────────────────────────────────────────────────
router.post('/engagement',
  [
    body('videoId').isMongoId().withMessage('Invalid videoId'),
    body('eventType').isIn(['play', 'pause', 'seek', 'skip', 'rewind']).withMessage('Invalid eventType'),
    body('timestamp').isNumeric().withMessage('timestamp must be a number'),
  ],
  validate, trackEngagement);

router.get('/engagement/:videoId', [validVideoId], validate, getEngagement);

// ── Feature 4 ─────────────────────────────────────────────────────────────────
router.post('/xp', verifyJWT,
  [body('action').isIn(['watch', 'comment', 'upload', 'like']).withMessage('Invalid action')],
  validate, awardXP);
router.get('/xp', verifyJWT, getXP);

// ── Feature 5 ─────────────────────────────────────────────────────────────────
router.get('/random-video', getRandomVideo);

// ── Feature 6 ─────────────────────────────────────────────────────────────────
router.post('/quiz', verifyJWT,
  [
    body('videoId').isMongoId().withMessage('Invalid videoId'),
    body('questions').isArray({ min: 1, max: 10 }).withMessage('Provide 1–10 questions'),
  ],
  validate, createQuiz);

router.get('/quiz/:videoId', [validVideoId], validate, getQuiz);

router.post('/quiz/:videoId/submit', verifyJWT,
  [
    validVideoId,
    body('answers').isArray().withMessage('answers must be an array'),
  ],
  validate, submitQuiz);

// ── Feature 7 ─────────────────────────────────────────────────────────────────
router.get('/smart-playlists', getSmartPlaylists);

// ── Feature 8 ─────────────────────────────────────────────────────────────────
router.get('/watch-later-reminders', verifyJWT, getWatchLaterReminders);
router.patch('/watch-later-reminders/:videoId/dismiss',
  verifyJWT, [validVideoId], validate, dismissReminder);
router.post('/watch-later/:videoId',
  verifyJWT, [validVideoId], validate, addToWatchLater);

// ── Feature 10 ────────────────────────────────────────────────────────────────
router.post('/progress', verifyJWT,
  [
    body('videoId').isMongoId().withMessage('Invalid videoId'),
    body('progressSeconds').isNumeric().withMessage('progressSeconds must be a number'),
  ],
  validate, saveProgress);
router.get('/continue-watching', verifyJWT, getContinueWatching);

// ── Feature 11: Real-time trending ───────────────────────────────────────────
router.get('/trending-realtime', getTrendingRealtime);

// ── Feature 12: Pinned comment ────────────────────────────────────────────────
router.get('/pinned-comment/:videoId', [validVideoId], validate, getPinnedComment);

// ── Feature 14: Search inside video ──────────────────────────────────────────
router.put('/keywords/:videoId', verifyJWT,
  [
    validVideoId,
    body('keywords').isArray().withMessage('keywords must be an array'),
  ],
  validate, setKeywords);
router.get('/keywords/:videoId', [validVideoId], validate, searchKeywords);

module.exports = router;
