'use strict';

const { Router } = require('express');
const { body } = require('express-validator');

const {
  createPlaylist,
  getPlaylist,
  getMyPlaylists,
  updatePlaylist,
  deletePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  reorderPlaylist,
  addCollaborator,
  removeCollaborator,
  getCollaborators,
  getCollaborativePlaylists,
  createSeries,
  getMySeries,
  getChannelSeries,
  updateSeriesThumbnail,
} = require('../controllers/playlist.controller');
const verifyJWT = require('../middlewares/auth.middleware');
const optionalJWT = require('../middlewares/optionalAuth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = Router();

// ── Static routes MUST come before /:id ──────────────────────────────────────
router.get('/me', verifyJWT, getMyPlaylists);
router.get('/collaborative', verifyJWT, getCollaborativePlaylists);

// ── Series routes ─────────────────────────────────────────────────────────────
router.post(
  '/series',
  verifyJWT,
  [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 150 }).withMessage('Max 150 chars'),
    body('visibility').optional().isIn(['public', 'private']).withMessage('Invalid visibility'),
  ],
  validate,
  createSeries
);
router.get('/series/me', verifyJWT, getMySeries);
router.get('/series/channel/:userId', getChannelSeries);

// ── Dynamic /:id routes ───────────────────────────────────────────────────────
router.get('/:id', optionalJWT, getPlaylist);

router.post(
  '/',
  verifyJWT,
  [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 150 }).withMessage('Max 150 chars'),
    body('visibility').optional().isIn(['public', 'private']).withMessage('Invalid visibility'),
  ],
  validate,
  createPlaylist
);

router.patch('/:id', verifyJWT, updatePlaylist);
router.delete('/:id', verifyJWT, deletePlaylist);

// Videos
router.post('/:id/videos', verifyJWT, [
  body('videoId').notEmpty().withMessage('videoId is required'),
], validate, addVideoToPlaylist);
router.delete('/:id/videos/:videoId', verifyJWT, removeVideoFromPlaylist);
router.patch('/:id/reorder', verifyJWT, [
  body('videoId').notEmpty().withMessage('videoId is required'),
  body('newIndex').isInt({ min: 0 }).withMessage('newIndex must be a non-negative integer'),
], validate, reorderPlaylist);

// Series thumbnail
router.patch('/:id/series-thumbnail', verifyJWT, [
  body('thumbnailUrl').optional().isURL().withMessage('Invalid URL'),
], validate, updateSeriesThumbnail);

// Collaborators
router.get('/:id/collaborators', verifyJWT, getCollaborators);
router.post('/:id/collaborators', verifyJWT, [
  body('usernameOrEmail').trim().notEmpty().withMessage('usernameOrEmail is required'),
], validate, addCollaborator);
router.delete('/:id/collaborators/:userId', verifyJWT, removeCollaborator);

module.exports = router;
