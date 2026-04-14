'use strict';

const { Router } = require('express');
const { body } = require('express-validator');

const {
  getChannelProfile,
  getMe,
  updateProfile,
  changePassword,
  updateAvatar,
  updateBanner,
  removeAvatar,
  removeBanner,
} = require('../controllers/user.controller');

const verifyJWT = require('../middlewares/auth.middleware');
const optionalJWT = require('../middlewares/optionalAuth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  uploadAvatar,
  uploadBanner,
  handleUploadError,
} = require('../middlewares/upload.middleware');

const router = Router();

// ── IMPORTANT: /me routes MUST come before /:username wildcard ────────────────

router.get('/me', verifyJWT, getMe);

router.patch(
  '/me',
  verifyJWT,
  [
    body('displayName').optional().trim().isLength({ max: 50 }).withMessage('Max 50 characters'),
    body('bio').optional().isLength({ max: 1000 }).withMessage('Max 1000 characters'),
  ],
  validate,
  updateProfile
);

router.patch(
  '/me/password',
  verifyJWT,
  [
    body('currentPassword').notEmpty().withMessage('currentPassword is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('At least 8 characters'),
  ],
  validate,
  changePassword
);

router.post('/me/avatar', verifyJWT, uploadAvatar.single('avatar'), handleUploadError, updateAvatar);
router.delete('/me/avatar', verifyJWT, removeAvatar);

router.post('/me/banner', verifyJWT, uploadBanner.single('banner'), handleUploadError, updateBanner);
router.delete('/me/banner', verifyJWT, removeBanner);

// ── Public channel profile — AFTER /me routes ─────────────────────────────────
router.get('/:username', optionalJWT, getChannelProfile);

module.exports = router;
