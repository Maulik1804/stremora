'use strict';

const { Router } = require('express');
const { body, param } = require('express-validator');

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
  acceptCollabInvite,
  declineCollabInvite,
  removeCollaborator,
  leavePlaylist,
  getCollaborators,
  getPendingInvites,
  proposeCollabVideo,
  approveCollabVideo,
  rejectCollabVideo,
  getCollabVideoRequests,
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
router.get('/invites/pending', verifyJWT, getPendingInvites);

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

// Collaborators — invite flow
router.get('/:id/collaborators', verifyJWT, getCollaborators);
router.post('/:id/collaborators', verifyJWT, [
  body('usernameOrEmail').trim().notEmpty().withMessage('usernameOrEmail is required'),
], validate, addCollaborator);
router.post('/:id/collaborators/accept', verifyJWT, acceptCollabInvite);
router.post('/:id/collaborators/decline', verifyJWT, declineCollabInvite);
router.post('/:id/collaborators/leave', verifyJWT, leavePlaylist);
router.delete('/:id/collaborators/:userId', verifyJWT, removeCollaborator);

// Collab video requests
router.get('/:id/collab-video/requests', verifyJWT, getCollabVideoRequests);
router.post('/:id/collab-video', verifyJWT, [
  body('videoId').notEmpty().withMessage('videoId is required'),
], validate, proposeCollabVideo);
router.patch('/:id/collab-video/:videoId/approve', verifyJWT, approveCollabVideo);
router.patch('/:id/collab-video/:videoId/reject', verifyJWT, rejectCollabVideo);

module.exports = router;
