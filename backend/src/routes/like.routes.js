'use strict';

const { Router } = require('express');
const { body, param } = require('express-validator');

const { toggleReaction, getVideoReaction, getCommentReaction, getLikedVideos } = require('../controllers/like.controller');
const verifyJWT = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = Router();

router.get('/me/videos', verifyJWT, getLikedVideos);

router.get(
  '/video/:videoId',
  verifyJWT,
  [
    param('videoId').isMongoId().withMessage('Invalid videoId'),
  ],
  validate,
  getVideoReaction
);

router.get(
  '/comment/:commentId',
  verifyJWT,
  [
    param('commentId').isMongoId().withMessage('Invalid commentId'),
  ],
  validate,
  getCommentReaction
);

router.post(
  '/',
  verifyJWT,
  [
    body('resourceType').isIn(['video', 'comment']).withMessage('resourceType must be "video" or "comment"'),
    body('resourceId').isMongoId().withMessage('Invalid resourceId'),
    body('reaction').isIn(['like', 'dislike']).withMessage('reaction must be "like" or "dislike"'),
  ],
  validate,
  toggleReaction
);

module.exports = router;
