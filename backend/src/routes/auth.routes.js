'use strict';

const { Router } = require('express');
const { body } = require('express-validator');

const { register, login, logout, refreshToken, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const verifyJWT = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { authRateLimiter } = require('../middlewares/rateLimiter.middleware');

const router = Router();

// Apply auth-specific rate limiter to all auth routes
router.use(authRateLimiter);

// ── Validation chains ─────────────────────────────────────────────────────────

const registerValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username may only contain letters, numbers, and underscores'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Display name must be 50 characters or fewer'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

// ── Routes ────────────────────────────────────────────────────────────────────

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/logout', verifyJWT, logout);
router.post('/refresh', refreshToken);

router.post(
  '/forgot-password',
  [body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email').normalizeEmail()],
  validate,
  forgotPassword
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  resetPassword
);

module.exports = router;
