'use strict';

const WatchHistory = require('../models/WatchHistory');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { PAGE_SIZE, cursorFilter, paginateResult } = require('../utils/pagination');
const { incrementGoalProgress } = require('./goal.controller');

/**
 * POST /api/v1/history
 * Record or update a watch event. Requires: verifyJWT
 * Body: { videoId }
 */
const recordHistory = asyncHandler(async (req, res) => {
  const { videoId } = req.body;
  if (!videoId) throw new ApiError(400, 'videoId is required');

  // Respect history pause setting
  const user = await User.findById(req.user._id).select('isHistoryPaused');
  if (user?.isHistoryPaused) {
    return res.status(200).json(new ApiResponse(200, null, 'History is paused'));
  }

  // Upsert: update watchedAt if entry exists, create if not
  const existing = await WatchHistory.findOne({ user: req.user._id, video: videoId });
  const isNewEntry = !existing;

  await WatchHistory.findOneAndUpdate(
    { user: req.user._id, video: videoId },
    { watchedAt: new Date() },
    { upsert: true, new: true }
  );

  // Increment goal progress only on first watch of this video
  if (isNewEntry) {
    incrementGoalProgress(req.user._id).catch(() => {});
  }

  return res.status(200).json(new ApiResponse(200, null, 'History recorded'));
});

/**
 * GET /api/v1/history
 * Get watch history for the authenticated user. Requires: verifyJWT
 */
const getHistory = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 50);
  const cursor = req.query.cursor;

  const filter = { user: req.user._id };
  if (cursor) {
    filter.watchedAt = { $lt: new Date(parseInt(cursor)) };
  }

  const docs = await WatchHistory.find(filter)
    .sort({ watchedAt: -1 })
    .limit(limit + 1)
    .populate({
      path: 'video',
      match: { isDeleted: false, status: 'published' },
      select: 'title thumbnailUrl duration viewCount owner createdAt',
      populate: { path: 'owner', select: 'username displayName avatar' },
    })
    .lean();

  // Filter out entries where video was deleted/unpublished
  const validDocs = docs.filter((d) => d.video !== null);
  const hasMore = validDocs.length > limit;
  const items = hasMore ? validDocs.slice(0, limit) : validDocs;
  const nextCursor = hasMore ? items[items.length - 1].watchedAt.getTime().toString() : null;

  return res.status(200).json(new ApiResponse(200, { history: items, nextCursor, hasMore }));
});

/**
 * DELETE /api/v1/history/:videoId
 * Remove a single video from history. Requires: verifyJWT
 */
const deleteHistoryEntry = asyncHandler(async (req, res) => {
  await WatchHistory.findOneAndDelete({ user: req.user._id, video: req.params.videoId });
  return res.status(200).json(new ApiResponse(200, null, 'Entry removed from history'));
});

/**
 * DELETE /api/v1/history
 * Clear all watch history. Requires: verifyJWT
 */
const clearHistory = asyncHandler(async (req, res) => {
  await WatchHistory.deleteMany({ user: req.user._id });
  return res.status(200).json(new ApiResponse(200, null, 'Watch history cleared'));
});

/**
 * PATCH /api/v1/history/pause
 * Toggle history pause. Requires: verifyJWT
 */
const toggleHistoryPause = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('isHistoryPaused');
  user.isHistoryPaused = !user.isHistoryPaused;
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, { isHistoryPaused: user.isHistoryPaused },
      user.isHistoryPaused ? 'History paused' : 'History resumed')
  );
});

module.exports = { recordHistory, getHistory, deleteHistoryEntry, clearHistory, toggleHistoryPause };
