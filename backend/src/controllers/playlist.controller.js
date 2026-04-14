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
 * Get all playlists owned by the authenticated user. Requires: verifyJWT
 */
const getMyPlaylists = asyncHandler(async (req, res) => {
  const playlists = await Playlist.find({ owner: req.user._id })
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
 * Add a collaborator by username or email. Owner only. Requires: verifyJWT
 * Body: { usernameOrEmail }
 */
const addCollaborator = asyncHandler(async (req, res) => {
  const { usernameOrEmail } = req.body;
  if (!usernameOrEmail) throw new ApiError(400, 'usernameOrEmail is required');

  const playlist = await Playlist.findOne({ _id: req.params.id });
  if (!playlist) throw new ApiError(404, 'Playlist not found');
  if (!playlist.owner.equals(req.user._id)) throw new ApiError(403, 'Only the owner can add collaborators');

  const collaboratorUser = await User.findOne({
    $or: [
      { username: usernameOrEmail.toLowerCase() },
      { email: usernameOrEmail.toLowerCase() },
    ],
  }).select('_id username displayName avatar');

  if (!collaboratorUser) throw new ApiError(404, 'User not found');
  if (collaboratorUser._id.equals(req.user._id)) throw new ApiError(400, 'Cannot add yourself as collaborator');

  if (playlist.collaborators.some((c) => c.equals(collaboratorUser._id))) {
    throw new ApiError(409, 'User is already a collaborator');
  }

  playlist.collaborators.push(collaboratorUser._id);
  await playlist.save();

  return res.status(200).json(new ApiResponse(200, { collaborator: collaboratorUser }, 'Collaborator added'));
});

/**
 * DELETE /api/v1/playlists/:id/collaborators/:userId
 * Remove a collaborator. Owner only. Requires: verifyJWT
 */
const removeCollaborator = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOne({ _id: req.params.id });
  if (!playlist) throw new ApiError(404, 'Playlist not found');
  if (!playlist.owner.equals(req.user._id)) throw new ApiError(403, 'Only the owner can remove collaborators');

  playlist.collaborators = playlist.collaborators.filter((c) => !c.equals(req.params.userId));
  await playlist.save();

  return res.status(200).json(new ApiResponse(200, null, 'Collaborator removed'));
});

/**
 * GET /api/v1/playlists/:id/collaborators
 * Get collaborators list. Requires: verifyJWT (owner only)
 */
const getCollaborators = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOne({ _id: req.params.id })
    .populate('collaborators', 'username displayName avatar');

  if (!playlist) throw new ApiError(404, 'Playlist not found');
  if (!playlist.owner.equals(req.user._id)) throw new ApiError(403, 'Forbidden');

  return res.status(200).json(new ApiResponse(200, { collaborators: playlist.collaborators }));
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
  removeCollaborator,
  getCollaborators,
  getCollaborativePlaylists,
};
