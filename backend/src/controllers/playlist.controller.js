'use strict';

const Playlist = require('../models/Playlist');
const Video = require('../models/Video');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/**
 * POST /api/v1/playlists
 * Create a new playlist. Requires: verifyJWT
 */
const createPlaylist = asyncHandler(async (req, res) => {
  const { title, description = '', visibility = 'public' } = req.body;
  if (!title) throw new ApiError(400, 'Title is required');

  const playlist = await Playlist.create({
    owner: req.user._id,
    title,
    description,
    visibility,
  });

  return res.status(201).json(new ApiResponse(201, { playlist }, 'Playlist created'));
});

/**
 * GET /api/v1/playlists/:id
 * Get a playlist with its videos.
 */
const getPlaylist = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findById(req.params.id)
    .populate('owner', 'username displayName avatar')
    .populate('collaborators', 'username displayName avatar')
    .populate({
      path: 'videos',
      match: { isDeleted: false, status: 'published' },
      select: 'title thumbnailUrl duration viewCount owner createdAt',
      populate: { path: 'owner', select: 'username displayName' },
    });

  if (!playlist) throw new ApiError(404, 'Playlist not found');

  if (playlist.visibility === 'private') {
    const isOwner = req.user && playlist.owner._id.equals(req.user._id);
    const isCollaborator = req.user && playlist.collaborators.some((c) => c._id.equals(req.user._id));
    if (!isOwner && !isCollaborator) {
      throw new ApiError(403, 'Forbidden');
    }
  }

  return res.status(200).json(new ApiResponse(200, { playlist }));
});

/**
 * GET /api/v1/playlists/me
 * Get personal playlists (NOT channel playlists) owned by the authenticated user.
 * isSeries playlists belong to the channel section — excluded here.
 * Requires: verifyJWT
 */
const getMyPlaylists = asyncHandler(async (req, res) => {
  const playlists = await Playlist.find({ owner: req.user._id, isSeries: { $ne: true } })
    .sort({ createdAt: -1 })
    .select('title description visibility videos isWatchLater collaborators createdAt')
    .lean();

  return res.status(200).json(new ApiResponse(200, { playlists }));
});

/**
 * PATCH /api/v1/playlists/:id
 * Update playlist metadata. Requires: verifyJWT
 */
const updatePlaylist = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOne({ _id: req.params.id });
  if (!playlist) throw new ApiError(404, 'Playlist not found');
  if (!playlist.owner.equals(req.user._id)) throw new ApiError(403, 'Forbidden');

  const { title, description, visibility } = req.body;
  if (title !== undefined) playlist.title = title;
  if (description !== undefined) playlist.description = description;
  if (visibility !== undefined) playlist.visibility = visibility;

  await playlist.save();

  return res.status(200).json(new ApiResponse(200, { playlist }, 'Playlist updated'));
});

/**
 * DELETE /api/v1/playlists/:id
 * Delete a playlist. Requires: verifyJWT
 */
const deletePlaylist = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOne({ _id: req.params.id });
  if (!playlist) throw new ApiError(404, 'Playlist not found');
  if (!playlist.owner.equals(req.user._id)) throw new ApiError(403, 'Forbidden');
  if (playlist.isWatchLater) throw new ApiError(400, 'Cannot delete Watch Later playlist');

  await playlist.deleteOne();

  return res.status(200).json(new ApiResponse(200, null, 'Playlist deleted'));
});

/**
 * POST /api/v1/playlists/:id/videos
 * Add a video to a playlist. Owner OR collaborator can add. Requires: verifyJWT
 * Body: { videoId }
 */
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { videoId } = req.body;
  if (!videoId) throw new ApiError(400, 'videoId is required');

  const playlist = await Playlist.findOne({ _id: req.params.id });
  if (!playlist) throw new ApiError(404, 'Playlist not found');

  const isOwner = playlist.owner.equals(req.user._id);
  const isCollaborator = playlist.collaborators.some((c) => c.equals(req.user._id));
  if (!isOwner && !isCollaborator) throw new ApiError(403, 'Forbidden');

  const video = await Video.findOne({ _id: videoId, isDeleted: false });
  if (!video) throw new ApiError(404, 'Video not found');

  if (playlist.videos.some((v) => v.equals(videoId))) {
    throw new ApiError(409, 'Video already in playlist');
  }

  playlist.videos.push(videoId);
  await playlist.save();

  return res.status(200).json(new ApiResponse(200, { playlist }, 'Video added to playlist'));
});

/**
 * DELETE /api/v1/playlists/:id/videos/:videoId
 * Remove a video from a playlist. Owner OR collaborator can remove. Requires: verifyJWT
 */
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOne({ _id: req.params.id });
  if (!playlist) throw new ApiError(404, 'Playlist not found');

  const isOwner = playlist.owner.equals(req.user._id);
  const isCollaborator = playlist.collaborators.some((c) => c.equals(req.user._id));
  if (!isOwner && !isCollaborator) throw new ApiError(403, 'Forbidden');

  playlist.videos = playlist.videos.filter((v) => !v.equals(req.params.videoId));
  await playlist.save();

  return res.status(200).json(new ApiResponse(200, { playlist }, 'Video removed from playlist'));
});

/**
 * POST /api/v1/playlists/:id/collaborators
 * Invite a collaborator by username or email. Owner only. Requires: verifyJWT
 * Body: { usernameOrEmail }
 * — Sends a notification to the invitee; they must accept before being added.
 */
const addCollaborator = asyncHandler(async (req, res) => {
  const { usernameOrEmail } = req.body;
  if (!usernameOrEmail) throw new ApiError(400, 'usernameOrEmail is required');

  const playlist = await Playlist.findOne({ _id: req.params.id })
    .populate('owner', 'username displayName');
  if (!playlist) throw new ApiError(404, 'Playlist not found');
  if (!playlist.owner._id.equals(req.user._id)) throw new ApiError(403, 'Only the owner can invite collaborators');

  const invitee = await User.findOne({
    $or: [
      { username: usernameOrEmail.toLowerCase() },
      { email: usernameOrEmail.toLowerCase() },
    ],
  }).select('_id username displayName avatar');

  if (!invitee) throw new ApiError(404, 'User not found');
  if (invitee._id.equals(req.user._id)) throw new ApiError(400, 'Cannot invite yourself');

  if (playlist.collaborators.some((c) => c.equals(invitee._id))) {
    throw new ApiError(409, 'User is already a collaborator');
  }
  if (playlist.pendingCollaborators.some((p) => p.user.equals(invitee._id))) {
    throw new ApiError(409, 'Invite already sent to this user');
  }

  playlist.pendingCollaborators.push({ user: invitee._id });
  await playlist.save();

  // Notify the invitee
  const { createNotification } = require('./notification.controller');
  await createNotification({
    recipient: invitee._id,
    type: 'collab_invite',
    actor: req.user._id,
    resourceId: playlist._id,
    resourceType: 'playlist',
    message: `${playlist.owner.displayName || playlist.owner.username} invited you to collaborate on "${playlist.title}"`,
  });

  return res.status(200).json(new ApiResponse(200, { invitee }, 'Invite sent'));
});

/**
 * POST /api/v1/playlists/:id/collaborators/accept
 * Accept a collaboration invite. Requires: verifyJWT (invitee only)
 */
const acceptCollabInvite = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOne({ _id: req.params.id })
    .populate('owner', 'username displayName');
  if (!playlist) throw new ApiError(404, 'Playlist not found');

  const pendingIdx = playlist.pendingCollaborators.findIndex((p) => p.user.equals(req.user._id));
  if (pendingIdx === -1) throw new ApiError(404, 'No pending invite found');

  // Move from pending → active collaborators
  playlist.pendingCollaborators.splice(pendingIdx, 1);
  playlist.collaborators.push(req.user._id);
  await playlist.save();

  // Notify the owner
  const { createNotification } = require('./notification.controller');
  await createNotification({
    recipient: playlist.owner._id,
    type: 'collab_invite_accepted',
    actor: req.user._id,
    resourceId: playlist._id,
    resourceType: 'playlist',
    message: `${req.user.displayName || req.user.username} accepted your collaboration invite for "${playlist.title}"`,
  });

  return res.status(200).json(new ApiResponse(200, null, 'Invite accepted'));
});

/**
 * POST /api/v1/playlists/:id/collaborators/decline
 * Decline a collaboration invite. Requires: verifyJWT (invitee only)
 */
const declineCollabInvite = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOne({ _id: req.params.id })
    .populate('owner', 'username displayName');
  if (!playlist) throw new ApiError(404, 'Playlist not found');

  const pendingIdx = playlist.pendingCollaborators.findIndex((p) => p.user.equals(req.user._id));
  if (pendingIdx === -1) throw new ApiError(404, 'No pending invite found');

  playlist.pendingCollaborators.splice(pendingIdx, 1);
  await playlist.save();

  // Notify the owner
  const { createNotification } = require('./notification.controller');
  await createNotification({
    recipient: playlist.owner._id,
    type: 'collab_invite_declined',
    actor: req.user._id,
    resourceId: playlist._id,
    resourceType: 'playlist',
    message: `${req.user.displayName || req.user.username} declined your collaboration invite for "${playlist.title}"`,
  });

  return res.status(200).json(new ApiResponse(200, null, 'Invite declined'));
});

/**
 * DELETE /api/v1/playlists/:id/collaborators/:userId
 * Remove a collaborator or cancel a pending invite. Owner only. Requires: verifyJWT
 */
const removeCollaborator = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOne({ _id: req.params.id });
  if (!playlist) throw new ApiError(404, 'Playlist not found');
  if (!playlist.owner.equals(req.user._id)) throw new ApiError(403, 'Only the owner can remove collaborators');

  playlist.collaborators = playlist.collaborators.filter((c) => !c.equals(req.params.userId));
  playlist.pendingCollaborators = playlist.pendingCollaborators.filter((p) => !p.user.equals(req.params.userId));
  await playlist.save();

  return res.status(200).json(new ApiResponse(200, null, 'Collaborator removed'));
});

/**
 * GET /api/v1/playlists/:id/collaborators
 * Get collaborators list (active + pending). Requires: verifyJWT (owner only)
 */
const getCollaborators = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOne({ _id: req.params.id })
    .populate('collaborators', 'username displayName avatar')
    .populate('pendingCollaborators.user', 'username displayName avatar');

  if (!playlist) throw new ApiError(404, 'Playlist not found');
  if (!playlist.owner.equals(req.user._id)) throw new ApiError(403, 'Forbidden');

  return res.status(200).json(new ApiResponse(200, {
    collaborators: playlist.collaborators,
    pendingCollaborators: playlist.pendingCollaborators,
  }));
});

/**
 * GET /api/v1/playlists/invites/pending
 * Get all pending collab invites for the current user. Requires: verifyJWT
 */
const getPendingInvites = asyncHandler(async (req, res) => {
  const playlists = await Playlist.find({
    'pendingCollaborators.user': req.user._id,
  })
    .populate('owner', 'username displayName avatar')
    .select('title description owner pendingCollaborators')
    .lean();

  return res.status(200).json(new ApiResponse(200, { invites: playlists }));
});

/**
 * POST /api/v1/playlists/:id/collab-video
 * Collaborator proposes a video to be added to the playlist.
 * Owner gets a notification to approve/reject. Requires: verifyJWT (collaborator)
 * Body: { videoId }
 */
const proposeCollabVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.body;
  if (!videoId) throw new ApiError(400, 'videoId is required');

  const playlist = await Playlist.findOne({ _id: req.params.id })
    .populate('owner', 'username displayName');
  if (!playlist) throw new ApiError(404, 'Playlist not found');

  const isCollaborator = playlist.collaborators.some((c) => c.equals(req.user._id));
  const isOwner = playlist.owner._id.equals(req.user._id);
  if (!isCollaborator && !isOwner) throw new ApiError(403, 'Only collaborators can propose videos');

  // Owner can add directly without approval
  if (isOwner) {
    const video = await Video.findOne({ _id: videoId, isDeleted: false });
    if (!video) throw new ApiError(404, 'Video not found');
    if (playlist.videos.some((v) => v.equals(videoId))) throw new ApiError(409, 'Video already in playlist');
    playlist.videos.push(videoId);
    await playlist.save();
    return res.status(200).json(new ApiResponse(200, null, 'Video added'));
  }

  const video = await Video.findOne({ _id: videoId, isDeleted: false });
  if (!video) throw new ApiError(404, 'Video not found');

  // Check not already in playlist or pending
  if (playlist.videos.some((v) => v.equals(videoId))) throw new ApiError(409, 'Video already in playlist');
  const alreadyPending = playlist.collabVideoRequests.some(
    (r) => r.video.equals(videoId) && r.status === 'pending'
  );
  if (alreadyPending) throw new ApiError(409, 'Video already pending approval');

  playlist.collabVideoRequests.push({ video: videoId, proposedBy: req.user._id });
  await playlist.save();

  // Notify the owner
  const { createNotification } = require('./notification.controller');
  await createNotification({
    recipient: playlist.owner._id,
    type: 'collab_video_request',
    actor: req.user._id,
    resourceId: playlist._id,
    resourceType: 'playlist',
    message: `${req.user.displayName || req.user.username} proposed a video for "${playlist.title}" — review it in your playlist`,
  });

  return res.status(200).json(new ApiResponse(200, null, 'Video proposed for approval'));
});

/**
 * PATCH /api/v1/playlists/:id/collab-video/:videoId/approve
 * Owner approves a collab video request. Requires: verifyJWT (owner only)
 */
const approveCollabVideo = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOne({ _id: req.params.id });
  if (!playlist) throw new ApiError(404, 'Playlist not found');
  if (!playlist.owner.equals(req.user._id)) throw new ApiError(403, 'Only the owner can approve');

  const request = playlist.collabVideoRequests.find(
    (r) => r.video.equals(req.params.videoId) && r.status === 'pending'
  );
  if (!request) throw new ApiError(404, 'Request not found');

  request.status = 'approved';
  if (!playlist.videos.some((v) => v.equals(req.params.videoId))) {
    playlist.videos.push(req.params.videoId);
  }
  await playlist.save();

  // Notify the proposer
  const { createNotification } = require('./notification.controller');
  await createNotification({
    recipient: request.proposedBy,
    type: 'collab_video_approved',
    actor: req.user._id,
    resourceId: playlist._id,
    resourceType: 'playlist',
    message: `Your video was approved and added to "${playlist.title}"`,
  });

  return res.status(200).json(new ApiResponse(200, null, 'Video approved and added'));
});

/**
 * PATCH /api/v1/playlists/:id/collab-video/:videoId/reject
 * Owner rejects a collab video request. Requires: verifyJWT (owner only)
 */
const rejectCollabVideo = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOne({ _id: req.params.id });
  if (!playlist) throw new ApiError(404, 'Playlist not found');
  if (!playlist.owner.equals(req.user._id)) throw new ApiError(403, 'Only the owner can reject');

  const request = playlist.collabVideoRequests.find(
    (r) => r.video.equals(req.params.videoId) && r.status === 'pending'
  );
  if (!request) throw new ApiError(404, 'Request not found');

  request.status = 'rejected';
  await playlist.save();

  // Notify the proposer
  const { createNotification } = require('./notification.controller');
  await createNotification({
    recipient: request.proposedBy,
    type: 'collab_video_rejected',
    actor: req.user._id,
    resourceId: playlist._id,
    resourceType: 'playlist',
    message: `Your video proposal for "${playlist.title}" was not approved`,
  });

  return res.status(200).json(new ApiResponse(200, null, 'Video request rejected'));
});

/**
 * GET /api/v1/playlists/:id/collab-video/requests
 * Get pending collab video requests for a playlist. Owner only. Requires: verifyJWT
 */
const getCollabVideoRequests = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOne({ _id: req.params.id })
    .populate({
      path: 'collabVideoRequests.video',
      match: { isDeleted: false },
      select: 'title thumbnailUrl duration viewCount owner',
      populate: { path: 'owner', select: 'username displayName avatar' },
    })
    .populate('collabVideoRequests.proposedBy', 'username displayName avatar');

  if (!playlist) throw new ApiError(404, 'Playlist not found');
  if (!playlist.owner.equals(req.user._id)) throw new ApiError(403, 'Forbidden');

  const pending = playlist.collabVideoRequests.filter((r) => r.status === 'pending');

  return res.status(200).json(new ApiResponse(200, { requests: pending }));
});

/**
 * GET /api/v1/playlists/collaborative
 * Get playlists where the user is a collaborator. Requires: verifyJWT
 */
const getCollaborativePlaylists = asyncHandler(async (req, res) => {
  const playlists = await Playlist.find({ collaborators: req.user._id })
    .populate('owner', 'username displayName avatar')
    .sort({ updatedAt: -1 })
    .select('title description visibility videos owner createdAt updatedAt')
    .lean();

  return res.status(200).json(new ApiResponse(200, { playlists }));
});

/**
 * PATCH /api/v1/playlists/:id/reorder
 * Reorder videos in a playlist. Requires: verifyJWT
 * Body: { videoId, newIndex }
 */
const reorderPlaylist = asyncHandler(async (req, res) => {
  const { videoId, newIndex } = req.body;
  if (videoId === undefined || newIndex === undefined) {
    throw new ApiError(400, 'videoId and newIndex are required');
  }

  const playlist = await Playlist.findOne({ _id: req.params.id });
  if (!playlist) throw new ApiError(404, 'Playlist not found');
  if (!playlist.owner.equals(req.user._id)) throw new ApiError(403, 'Forbidden');

  const currentIndex = playlist.videos.findIndex((v) => v.equals(videoId));
  if (currentIndex === -1) throw new ApiError(404, 'Video not in playlist');

  const [item] = playlist.videos.splice(currentIndex, 1);
  playlist.videos.splice(Math.max(0, newIndex), 0, item);
  await playlist.save();

  return res.status(200).json(new ApiResponse(200, { playlist }, 'Playlist reordered'));
});

/**
 * POST /api/v1/playlists/series
 * Create a new series playlist. Requires: verifyJWT
 */
const createSeries = asyncHandler(async (req, res) => {
  const { title, description = '', visibility = 'public' } = req.body;
  if (!title) throw new ApiError(400, 'Title is required');

  const series = await Playlist.create({
    owner: req.user._id,
    title,
    description,
    visibility,
    isSeries: true,
  });

  return res.status(201).json(new ApiResponse(201, { playlist: series }, 'Series created'));
});

/**
 * GET /api/v1/playlists/series/me
 * Get all series owned by the authenticated user. Requires: verifyJWT
 */
const getMySeries = asyncHandler(async (req, res) => {
  const series = await Playlist.find({ owner: req.user._id, isSeries: true })
    .sort({ createdAt: -1 })
    .select('title description visibility videos isSeries seriesThumbnail createdAt updatedAt')
    .lean();

  return res.status(200).json(new ApiResponse(200, { series }));
});

/**
 * GET /api/v1/playlists/series/channel/:userId
 * Get all public channel playlists for a channel (by userId). Public endpoint.
 */
const getChannelSeries = asyncHandler(async (req, res) => {
  const series = await Playlist.find({
    owner: req.params.userId,
    isSeries: true,
    visibility: 'public',
  })
    .sort({ createdAt: -1 })
    .populate('owner', 'username displayName avatar')
    .populate({
      path: 'videos',
      match: { isDeleted: false, status: 'published' },
      select: 'title thumbnailUrl duration viewCount createdAt',
    })
    .lean();

  // Auto-set seriesThumbnail from first video if not explicitly set
  const enriched = series.map((s) => ({
    ...s,
    seriesThumbnail: s.seriesThumbnail || s.videos?.[0]?.thumbnailUrl || '',
    episodeCount: s.videos?.length ?? 0,
  }));

  return res.status(200).json(new ApiResponse(200, { series: enriched }));
});

/**
 * PATCH /api/v1/playlists/:id/series-thumbnail
 * Update the series thumbnail. Owner only. Requires: verifyJWT
 * Body: { thumbnailUrl } — use first episode's thumbnail or custom URL
 */
const updateSeriesThumbnail = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOne({ _id: req.params.id, isSeries: true });
  if (!playlist) throw new ApiError(404, 'Series not found');
  if (!playlist.owner.equals(req.user._id)) throw new ApiError(403, 'Forbidden');

  const { thumbnailUrl } = req.body;
  playlist.seriesThumbnail = thumbnailUrl || '';
  await playlist.save();

  return res.status(200).json(new ApiResponse(200, { playlist }, 'Series thumbnail updated'));
});

module.exports = {
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
};
