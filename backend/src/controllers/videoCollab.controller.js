'use strict';

const Video = require('../models/Video');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { createNotification } = require('./notification.controller');

/**
 * POST /api/v1/videos/:id/collab/invite
 * Owner invites a user to collab on this video.
 * Body: { usernameOrEmail }
 */
const inviteCollaborator = asyncHandler(async (req, res) => {
  const { usernameOrEmail } = req.body;
  if (!usernameOrEmail) throw new ApiError(400, 'usernameOrEmail is required');

  const video = await Video.findOne({ _id: req.params.id, isDeleted: false })
    .populate('owner', 'username displayName');
  if (!video) throw new ApiError(404, 'Video not found');
  if (!video.owner._id.equals(req.user._id)) throw new ApiError(403, 'Only the owner can invite collaborators');

  const invitee = await User.findOne({
    $or: [
      { username: usernameOrEmail.toLowerCase() },
      { email: usernameOrEmail.toLowerCase() },
    ],
  }).select('_id username displayName avatar');

  if (!invitee) throw new ApiError(404, 'User not found');
  if (invitee._id.equals(req.user._id)) throw new ApiError(400, 'Cannot invite yourself');

  // Check not already a collaborator
  const existing = video.collaborators.find((c) => c.user.equals(invitee._id));
  if (existing) {
    if (existing.status === 'accepted') throw new ApiError(409, 'User is already a collaborator');
    if (existing.status === 'pending') throw new ApiError(409, 'Invite already sent to this user');
    // If declined, allow re-invite
    existing.status = 'pending';
    existing.invitedAt = new Date();
  } else {
    video.collaborators.push({ user: invitee._id, status: 'pending' });
  }

  await video.save();

  await createNotification({
    recipient: invitee._id,
    type: 'video_collab_invite',
    actor: req.user._id,
    resourceId: video._id,
    resourceType: 'video',
    message: `${video.owner.displayName || video.owner.username} invited you to collaborate on "${video.title}"`,
  });

  return res.status(200).json(new ApiResponse(200, { invitee }, 'Collab invite sent'));
});

/**
 * POST /api/v1/videos/:id/collab/accept
 * Invitee accepts the collab invite.
 */
const acceptCollabInvite = asyncHandler(async (req, res) => {
  const video = await Video.findOne({ _id: req.params.id, isDeleted: false })
    .populate('owner', 'username displayName');
  if (!video) throw new ApiError(404, 'Video not found');

  const entry = video.collaborators.find(
    (c) => c.user.equals(req.user._id) && c.status === 'pending'
  );
  if (!entry) throw new ApiError(404, 'No pending collab invite found');

  entry.status = 'accepted';
  await video.save();

  await createNotification({
    recipient: video.owner._id,
    type: 'video_collab_accepted',
    actor: req.user._id,
    resourceId: video._id,
    resourceType: 'video',
    message: `${req.user.displayName || req.user.username} accepted your collab invite for "${video.title}"`,
  });

  return res.status(200).json(new ApiResponse(200, null, 'Collab invite accepted'));
});

/**
 * POST /api/v1/videos/:id/collab/decline
 * Invitee declines the collab invite.
 */
const declineCollabInvite = asyncHandler(async (req, res) => {
  const video = await Video.findOne({ _id: req.params.id, isDeleted: false })
    .populate('owner', 'username displayName');
  if (!video) throw new ApiError(404, 'Video not found');

  const entry = video.collaborators.find(
    (c) => c.user.equals(req.user._id) && c.status === 'pending'
  );
  if (!entry) throw new ApiError(404, 'No pending collab invite found');

  entry.status = 'declined';
  await video.save();

  await createNotification({
    recipient: video.owner._id,
    type: 'video_collab_declined',
    actor: req.user._id,
    resourceId: video._id,
    resourceType: 'video',
    message: `${req.user.displayName || req.user.username} declined your collab invite for "${video.title}"`,
  });

  return res.status(200).json(new ApiResponse(200, null, 'Collab invite declined'));
});

/**
 * DELETE /api/v1/videos/:id/collab/:userId
 * Owner removes a collaborator.
 */
const removeCollaborator = asyncHandler(async (req, res) => {
  const video = await Video.findOne({ _id: req.params.id, isDeleted: false })
    .populate('owner', 'username displayName');
  if (!video) throw new ApiError(404, 'Video not found');
  if (!video.owner._id.equals(req.user._id)) throw new ApiError(403, 'Only the owner can remove collaborators');

  video.collaborators = video.collaborators.filter((c) => !c.user.equals(req.params.userId));
  await video.save();

  // Notify the removed user
  await createNotification({
    recipient: req.params.userId,
    type: 'video_collab_declined', // closest existing type for "removed"
    actor: req.user._id,
    resourceId: video._id,
    resourceType: 'video',
    message: `${video.owner.displayName || video.owner.username} removed you as a collaborator on "${video.title}"`,
  });

  return res.status(200).json(new ApiResponse(200, null, 'Collaborator removed'));
});

/**
 * POST /api/v1/videos/:id/collab/leave
 * Collaborator removes themselves from the video.
 */
const leaveCollab = asyncHandler(async (req, res) => {
  const video = await Video.findOne({ _id: req.params.id, isDeleted: false })
    .populate('owner', 'username displayName');
  if (!video) throw new ApiError(404, 'Video not found');

  if (video.owner._id.equals(req.user._id)) {
    throw new ApiError(400, 'You are the owner — delete the video instead');
  }

  const entry = video.collaborators.find((c) => c.user.equals(req.user._id));
  if (!entry) throw new ApiError(400, 'You are not a collaborator on this video');

  video.collaborators = video.collaborators.filter((c) => !c.user.equals(req.user._id));
  await video.save();

  await createNotification({
    recipient: video.owner._id,
    type: 'new_subscriber', // reuse generic type
    actor: req.user._id,
    resourceId: video._id,
    resourceType: 'video',
    message: `${req.user.displayName || req.user.username} left the collab on "${video.title}"`,
  });

  return res.status(200).json(new ApiResponse(200, null, 'You have left the collab'));
});

/**
 * GET /api/v1/videos/collab/mine
 * Get all collab videos for the current user:
 * - Videos where user is an accepted collaborator (they were invited)
 * - Videos owned by user that have at least one collaborator entry (any status)
 */
const getMyCollabVideos = asyncHandler(async (req, res) => {
  const videos = await Video.find({
    $or: [
      // Videos where user is an accepted collaborator
      { 'collaborators': { $elemMatch: { user: req.user._id, status: 'accepted' } } },
      // Videos owned by user that have any collaborator (accepted, pending, or declined)
      { owner: req.user._id, 'collaborators.0': { $exists: true } },
    ],
    isDeleted: false,
    status: 'published',
  })
    .sort({ createdAt: -1 })
    .populate('owner', 'username displayName avatar')
    .populate('collaborators.user', 'username displayName avatar')
    .lean();

  return res.status(200).json(new ApiResponse(200, { videos }));
});

/**
 * GET /api/v1/videos/collab/invites
 * Get all videos where the current user has a pending collab invite.
 */
const getMyVideoCollabInvites = asyncHandler(async (req, res) => {
  const videos = await Video.find({
    'collaborators': {
      $elemMatch: { user: req.user._id, status: 'pending' },
    },
    isDeleted: false,
  })
    .populate('owner', 'username displayName avatar')
    .select('title thumbnailUrl owner collaborators createdAt')
    .lean();

  return res.status(200).json(new ApiResponse(200, { videos }));
});

module.exports = {
  inviteCollaborator,
  acceptCollabInvite,
  declineCollabInvite,
  removeCollaborator,
  leaveCollab,
  getMyCollabVideos,
  getMyVideoCollabInvites,
};
