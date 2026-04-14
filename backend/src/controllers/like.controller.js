'use strict';

const Like = require('../models/Like');
const Video = require('../models/Video');
const Comment = require('../models/Comment');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { PAGE_SIZE, cursorFilter, paginateResult } = require('../utils/pagination');

/**
 * POST /api/v1/likes
 * Toggle like/dislike on a video or comment. Requires: verifyJWT
 * Body: { resourceType: 'video'|'comment', resourceId, reaction: 'like'|'dislike' }
 */
const toggleReaction = asyncHandler(async (req, res) => {
  const { resourceType, resourceId, reaction } = req.body;

  if (!['video', 'comment'].includes(resourceType)) {
    throw new ApiError(400, 'resourceType must be "video" or "comment"');
  }
  if (!['like', 'dislike'].includes(reaction)) {
    throw new ApiError(400, 'reaction must be "like" or "dislike"');
  }
  if (!resourceId) throw new ApiError(400, 'resourceId is required');

  const existing = await Like.findOne({
    user: req.user._id,
    resourceType,
    resourceId,
  });

  let reactionState = null;
  let likeCountDelta = 0;
  let dislikeCountDelta = 0;

  if (existing) {
    if (existing.reaction === reaction) {
      // Toggle off — remove the reaction
      await existing.deleteOne();
      if (reaction === 'like') likeCountDelta = -1;
      else dislikeCountDelta = -1;
      reactionState = null;
    } else {
      // Switch reaction
      const oldReaction = existing.reaction;
      existing.reaction = reaction;
      await existing.save();

      if (reaction === 'like') {
        likeCountDelta = 1;
        dislikeCountDelta = -1;
      } else {
        likeCountDelta = -1;
        dislikeCountDelta = 1;
      }
      reactionState = reaction;
    }
  } else {
    // New reaction
    await Like.create({ user: req.user._id, resourceType, resourceId, reaction });
    if (reaction === 'like') likeCountDelta = 1;
    else dislikeCountDelta = 1;
    reactionState = reaction;
  }

  // Update denormalized counts on the resource
  let updatedResource;
  if (resourceType === 'video') {
    updatedResource = await Video.findByIdAndUpdate(
      resourceId,
      {
        $inc: {
          likeCount: likeCountDelta,
          dislikeCount: dislikeCountDelta,
        },
      },
      { new: true }
    ).select('likeCount dislikeCount');
  } else {
    updatedResource = await Comment.findByIdAndUpdate(
      resourceId,
      { $inc: { likeCount: likeCountDelta } },
      { new: true }
    ).select('likeCount');
  }

  return res.status(200).json(
    new ApiResponse(200, {
      reactionState,
      likeCount: updatedResource?.likeCount ?? 0,
      dislikeCount: updatedResource?.dislikeCount ?? 0,
    })
  );
});

/**
 * GET /api/v1/likes/me/videos
 * Get the authenticated user's liked videos. Requires: verifyJWT
 */
const getLikedVideos = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 50);
  const cursor = req.query.cursor;

  const likeFilter = {
    user: req.user._id,
    resourceType: 'video',
    reaction: 'like',
    ...cursorFilter(cursor),
  };

  const likes = await Like.find(likeFilter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean();

  const { items: likeItems, nextCursor, hasMore } = paginateResult(likes, limit);

  const videoIds = likeItems.map((l) => l.resourceId);
  const videos = await Video.find({
    _id: { $in: videoIds },
    isDeleted: false,
    status: 'published',
  })
    .populate('owner', 'username displayName avatar')
    .lean();

  // Preserve like order
  const videoMap = Object.fromEntries(videos.map((v) => [v._id.toString(), v]));
  const orderedVideos = videoIds.map((id) => videoMap[id.toString()]).filter(Boolean);

  return res.status(200).json(new ApiResponse(200, { videos: orderedVideos, nextCursor, hasMore }));
});

module.exports = { toggleReaction, getLikedVideos };
