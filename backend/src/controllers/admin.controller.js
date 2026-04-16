'use strict';

const User = require('../models/User');
const Video = require('../models/Video');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { createNotification } = require('./notification.controller');
const { deleteAsset } = require('../services/cloudinary.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

const parsePage = (val, def = 1) => Math.max(1, parseInt(val) || def);
const parseLimit = (val, def = 20) => Math.min(100, Math.max(1, parseInt(val) || def));

// ── Stats ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/stats
 */
const getStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalVideos,
    suspendedUsers,
    deletedVideos,
    viewsAgg,
  ] = await Promise.all([
    User.countDocuments(),
    Video.countDocuments({ isDeleted: false }),
    User.countDocuments({ isSuspended: true }),
    Video.countDocuments({ isDeleted: true }),
    Video.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$viewCount' } } },
    ]),
  ]);

  const totalViews = viewsAgg[0]?.total ?? 0;

  return res.status(200).json(
    new ApiResponse(200, { totalUsers, totalVideos, totalViews, suspendedUsers, deletedVideos })
  );
});

// ── Videos ────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/videos
 * Query params: page, limit, search, status ('published'|'deleted'|'processing'|'failed')
 */
const getVideos = asyncHandler(async (req, res) => {
  const page = parsePage(req.query.page);
  const limit = parseLimit(req.query.limit);
  const skip = (page - 1) * limit;
  const { search, status } = req.query;

  const filter = {};

  if (status === 'deleted') {
    filter.isDeleted = true;
  } else if (status && status !== 'deleted') {
    filter.isDeleted = false;
    filter.status = status;
  }
  // no status filter → return all (including deleted)

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
    ];
  }

  const [videos, total] = await Promise.all([
    Video.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('owner', 'username displayName avatar')
      .lean(),
    Video.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  );
});

/**
 * DELETE /api/v1/admin/videos/:id
 * Soft-deletes the video, removes Cloudinary assets, notifies owner.
 */
const deleteVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id).populate('owner', '_id username');
  if (!video) throw new ApiError(404, 'Video not found');

  // Soft-delete with audit trail
  video.isDeleted = true;
  video.deletedBy = req.user._id;
  video.deletedAt = new Date();
  await video.save();

  // Remove Cloudinary assets (non-fatal)
  await Promise.allSettled([
    deleteAsset(video.cloudinaryPublicId, 'video'),
    video.thumbnailPublicId ? deleteAsset(video.thumbnailPublicId, 'image') : Promise.resolve(),
  ]);

  // Notify owner
  if (video.owner) {
    await createNotification({
      recipient: video.owner._id,
      type: 'new_video',
      actor: req.user._id,
      resourceId: video._id,
      resourceType: 'video',
      message: `Your video "${video.title}" was removed by an administrator for violating community guidelines.`,
    });
  }

  return res.status(200).json(new ApiResponse(200, null, 'Video removed'));
});

// ── Users ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/users
 * Query params: page, limit, search
 */
const getUsers = asyncHandler(async (req, res) => {
  const page = parsePage(req.query.page);
  const limit = parseLimit(req.query.limit);
  const skip = (page - 1) * limit;
  const { search } = req.query;

  const filter = {};
  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: 'i' } },
      { displayName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-passwordHash -refreshTokenHash -passwordResetToken -passwordResetExpires')
      .lean(),
    User.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  );
});

/**
 * PATCH /api/v1/admin/users/:id/suspend
 * Toggles isSuspended. Sends notification when suspending.
 */
const suspendUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  // Prevent suspending another admin
  if (user.role === 'admin') {
    throw new ApiError(403, 'Cannot suspend an admin account');
  }

  const wasSuspended = user.isSuspended;
  user.isSuspended = !wasSuspended;
  await user.save();

  // Notify only when suspending (not when unsuspending)
  if (user.isSuspended) {
    await createNotification({
      recipient: user._id,
      type: 'new_video',
      actor: req.user._id,
      resourceId: user._id,
      resourceType: 'user',
      message: 'Your account has been suspended for violating community guidelines.',
    });
  }

  const action = user.isSuspended ? 'suspended' : 'unsuspended';
  return res.status(200).json(
    new ApiResponse(200, { isSuspended: user.isSuspended }, `User ${action}`)
  );
});

/**
 * PATCH /api/v1/admin/users/:id/role
 * Body: { role: 'user'|'creator'|'admin' }
 */
const changeRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const validRoles = ['user', 'creator', 'admin'];

  if (!role || !validRoles.includes(role)) {
    throw new ApiError(400, `Role must be one of: ${validRoles.join(', ')}`);
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  user.role = role;
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, { role: user.role }, 'Role updated')
  );
});

/**
 * DELETE /api/v1/admin/users/:id
 * Deletes the user account and all their videos (with Cloudinary cleanup).
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  if (user.role === 'admin') {
    throw new ApiError(403, 'Cannot delete an admin account');
  }

  // Fetch all user videos for Cloudinary cleanup
  const videos = await Video.find({ owner: user._id }).lean();

  // Delete Cloudinary assets (non-fatal)
  const assetDeletions = videos.flatMap((v) => {
    const tasks = [deleteAsset(v.cloudinaryPublicId, 'video')];
    if (v.thumbnailPublicId) tasks.push(deleteAsset(v.thumbnailPublicId, 'image'));
    return tasks;
  });
  if (user.avatarPublicId) assetDeletions.push(deleteAsset(user.avatarPublicId, 'image'));
  if (user.bannerPublicId) assetDeletions.push(deleteAsset(user.bannerPublicId, 'image'));

  await Promise.allSettled(assetDeletions);

  // Delete all videos and the user
  await Promise.all([
    Video.deleteMany({ owner: user._id }),
    User.findByIdAndDelete(user._id),
  ]);

  return res.status(200).json(new ApiResponse(200, null, 'User and all their content deleted'));
});

/**
 * GET /api/v1/admin/videos/by-user
 * Returns all users who have uploaded videos, with their video list.
 * Query: search (searches user username/displayName)
 */
const getVideosByUser = asyncHandler(async (req, res) => {
  const { search } = req.query;

  // Get ALL non-deleted videos with owner info
  const allVideos = await Video.find({ isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .select('title thumbnailUrl viewCount likeCount commentCount status visibility createdAt owner cloudinaryPublicId thumbnailPublicId')
    .populate('owner', 'username displayName avatar email')
    .lean();

  if (allVideos.length === 0) {
    return res.status(200).json(new ApiResponse(200, { groups: [] }));
  }

  // Group by owner
  const groupMap = new Map();
  for (const video of allVideos) {
    if (!video.owner) continue;
    const ownerId = video.owner._id.toString();

    // Apply search filter on owner
    if (search) {
      const s = search.toLowerCase();
      const name = (video.owner.displayName || '').toLowerCase();
      const uname = (video.owner.username || '').toLowerCase();
      if (!name.includes(s) && !uname.includes(s)) continue;
    }

    if (!groupMap.has(ownerId)) {
      groupMap.set(ownerId, { user: video.owner, videos: [], totalVideos: 0 });
    }
    const group = groupMap.get(ownerId);
    // Remove owner from video object to avoid duplication
    const { owner: _owner, ...videoData } = video;
    group.videos.push(videoData);
    group.totalVideos++;
  }

  const groups = Array.from(groupMap.values())
    .sort((a, b) => b.totalVideos - a.totalVideos);

  return res.status(200).json(new ApiResponse(200, { groups }));
});

/**
 * GET /api/v1/admin/videos/deleted
 * Returns all soft-deleted videos with owner and deletedBy info.
 */
const getDeletedVideos = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const filter = { isDeleted: true };
  if (search) {
    filter.title = { $regex: search, $options: 'i' };
  }

  const videos = await Video.find(filter)
    .sort({ deletedAt: -1, updatedAt: -1 })
    .select('title thumbnailUrl viewCount owner deletedBy deletedAt updatedAt createdAt')
    .populate('owner', 'username displayName avatar')
    .populate('deletedBy', 'username displayName')
    .lean();

  return res.status(200).json(new ApiResponse(200, { videos }));
});

module.exports = {
  getStats,
  getVideos,
  getVideosByUser,
  getDeletedVideos,
  deleteVideo,
  getUsers,
  suspendUser,
  changeRole,
  deleteUser,
};
