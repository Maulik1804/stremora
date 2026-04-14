'use strict';

const bcrypt = require('bcrypt');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const {
  uploadAvatar,
  uploadBanner,
  deleteAsset,
} = require('../services/cloudinary.service');

const BCRYPT_COST = 12;

// ── Helpers ───────────────────────────────────────────────────────────────────

const sanitizeUser = (user) => ({
  _id: user._id,
  email: user.email,
  username: user.username,
  displayName: user.displayName,
  avatar: user.avatar,
  avatarPublicId: user.avatarPublicId,
  banner: user.banner,
  bannerPublicId: user.bannerPublicId,
  bio: user.bio,
  role: user.role,
  isHistoryPaused: user.isHistoryPaused,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/v1/users/:username
 * Public channel profile.
 */
const getChannelProfile = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    username: req.params.username.toLowerCase(),
    isSuspended: false,
  }).select('username displayName avatar banner bio role createdAt');

  if (!user) throw new ApiError(404, 'Channel not found');

  // Attach subscriber count via aggregation
  const Subscription = require('../models/Subscription');
  const subscriberCount = await Subscription.countDocuments({ channel: user._id });

  // Check if the requesting user is subscribed
  let isSubscribed = false;
  if (req.user?._id) {
    const sub = await Subscription.findOne({
      subscriber: req.user._id,
      channel: user._id,
    });
    isSubscribed = !!sub;
  }

  return res.status(200).json(
    new ApiResponse(200, { channel: { ...user.toObject(), subscriberCount, isSubscribed } })
  );
});

/**
 * GET /api/v1/users/me
 * Get own profile. Requires: verifyJWT
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, 'User not found');
  return res.status(200).json(new ApiResponse(200, { user: sanitizeUser(user) }));
});

/**
 * PATCH /api/v1/users/me
 * Update profile text fields. Requires: verifyJWT
 * Body: { displayName?, bio? }
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { displayName, bio } = req.body;

  const updates = {};
  if (displayName !== undefined) updates.displayName = displayName.trim();
  if (bio !== undefined) {
    if (bio.length > 1000) throw new ApiError(400, 'Bio must be 1000 characters or fewer');
    updates.bio = bio.trim();
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'No updatable fields provided');
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
  return res.status(200).json(new ApiResponse(200, { user: sanitizeUser(user) }, 'Profile updated'));
});

/**
 * PATCH /api/v1/users/me/password
 * Change password. Requires: verifyJWT
 * Body: { currentPassword, newPassword }
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'currentPassword and newPassword are required');
  }
  if (newPassword.length < 8) {
    throw new ApiError(400, 'New password must be at least 8 characters');
  }

  const user = await User.findById(req.user._id).select('+passwordHash');
  const isMatch = await user.isPasswordCorrect(currentPassword);
  if (!isMatch) throw new ApiError(401, 'Current password is incorrect');

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await user.save();

  return res.status(200).json(new ApiResponse(200, null, 'Password changed successfully'));
});

/**
 * POST /api/v1/users/me/avatar
 * Upload or replace avatar. Requires: verifyJWT, uploadAvatar.single('avatar')
 */
const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Avatar image is required');

  const user = await User.findById(req.user._id);

  // Upload new avatar with face-aware crop
  const { url, publicId } = await uploadAvatar(req.file.path);

  // Delete old avatar from Cloudinary if it exists
  if (user.avatarPublicId) {
    await deleteAsset(user.avatarPublicId, 'image');
  }

  user.avatar = url;
  user.avatarPublicId = publicId;
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, { avatar: user.avatar }, 'Avatar updated successfully')
  );
});

/**
 * POST /api/v1/users/me/banner
 * Upload or replace channel banner. Requires: verifyJWT, uploadBanner.single('banner')
 */
const updateBanner = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Banner image is required');

  const user = await User.findById(req.user._id);

  // Upload new banner (2560×1440, auto crop)
  const { url, publicId } = await uploadBanner(req.file.path);

  // Delete old banner from Cloudinary if it exists
  if (user.bannerPublicId) {
    await deleteAsset(user.bannerPublicId, 'image');
  }

  user.banner = url;
  user.bannerPublicId = publicId;
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, { banner: user.banner }, 'Banner updated successfully')
  );
});

/**
 * DELETE /api/v1/users/me/avatar
 * Remove avatar. Requires: verifyJWT
 */
const removeAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.avatarPublicId) {
    await deleteAsset(user.avatarPublicId, 'image');
  }

  user.avatar = '';
  user.avatarPublicId = '';
  await user.save();

  return res.status(200).json(new ApiResponse(200, null, 'Avatar removed'));
});

/**
 * DELETE /api/v1/users/me/banner
 * Remove banner. Requires: verifyJWT
 */
const removeBanner = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.bannerPublicId) {
    await deleteAsset(user.bannerPublicId, 'image');
  }

  user.banner = '';
  user.bannerPublicId = '';
  await user.save();

  return res.status(200).json(new ApiResponse(200, null, 'Banner removed'));
});

module.exports = {
  getChannelProfile,
  getMe,
  updateProfile,
  changePassword,
  updateAvatar,
  updateBanner,
  removeAvatar,
  removeBanner,
};
