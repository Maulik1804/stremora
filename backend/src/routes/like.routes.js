'use strict';

const { Router } = require('express');
const { body } = require('express-validator');

const { toggleReaction, getLikedVideos } = require('../controllers/like.controller');
const verifyJWT = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = Router();

router.get('/me/videos', verifyJWT, getLikedVideos);

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
