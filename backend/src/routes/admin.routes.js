'use strict';

const { Router } = require('express');
const verifyJWT = require('../middlewares/auth.middleware');
const requireAdmin = require('../middlewares/admin.middleware');
const {
  getStats,
  getVideos,
  getVideosByUser,
  getDeletedVideos,
  deleteVideo,
  getUsers,
  suspendUser,
  changeRole,
  deleteUser,
} = require('../controllers/admin.controller');const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

const router = Router();

// ── One-time seed route (no auth — GET so it works directly in browser) ──────
// GET /api/v1/admin/seed-admin?secret=streamora_seed_2026
router.get('/seed-admin', asyncHandler(async (req, res) => {
  const { secret } = req.query;
  if (secret !== 'streamora_seed_2026') {
    throw new ApiError(403, 'Invalid seed secret');
  }

  const ADMIN_EMAIL = 'maulikmakwana00@gmail.com';
  const user = await User.findOne({ email: ADMIN_EMAIL });

  if (!user) {
    throw new ApiError(404, `No account found for ${ADMIN_EMAIL}. Register first at localhost:5173/register`);
  }

  user.role = 'admin';
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, { username: user.username, role: user.role }, `✅ ${user.username} is now admin — logout and login again`)
  );
}));

// All routes below require valid JWT + admin role
router.use(verifyJWT, requireAdmin);

// Stats
router.get('/stats', getStats);

// Videos
router.get('/videos', getVideos);
router.get('/videos/by-user', getVideosByUser);
router.get('/videos/deleted', getDeletedVideos);
router.delete('/videos/:id', deleteVideo);

// Users
router.get('/users', getUsers);
router.patch('/users/:id/suspend', suspendUser);
router.patch('/users/:id/role', changeRole);
router.delete('/users/:id', deleteUser);

module.exports = router;
