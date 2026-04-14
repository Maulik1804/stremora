'use strict';

const Comment = require('../models/Comment');
const Video = require('../models/Video');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { PAGE_SIZE, cursorFilter, paginateResult } = require('../utils/pagination');

/**
 * GET /api/v1/comments?videoId=&cursor=&sort=
 * List top-level comments for a video with replies count.
 */
const getComments = asyncHandler(async (req, res) => {
  const { videoId, cursor, sort = 'date' } = req.query;
  if (!videoId) throw new ApiError(400, 'videoId is required');

  const limit = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 50);

  const sortMap = {
    date: { createdAt: -1 },
    likes: { likeCount: -1, createdAt: -1 },
  };

  const filter = {
    video: videoId,
    parent: null,
    isDeleted: false,
    ...cursorFilter(cursor),
  };

  const docs = await Comment.find(filter)
    .sort(sortMap[sort] || sortMap.date)
    .limit(limit + 1)
    .populate('author', 'username displayName avatar')
    .lean();

  const { items, nextCursor, hasMore } = paginateResult(docs, limit);

  return res.status(200).json(new ApiResponse(200, { comments: items, nextCursor, hasMore }));
});

/**
 * GET /api/v1/comments/:id/replies
 * List replies for a comment.
 */
const getReplies = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 50);
  const cursor = req.query.cursor;

  const filter = {
    parent: req.params.id,
    isDeleted: false,
    ...cursorFilter(cursor),
  };

  const docs = await Comment.find(filter)
    .sort({ createdAt: 1 })
    .limit(limit + 1)
    .populate('author', 'username displayName avatar')
    .lean();

  const { items, nextCursor, hasMore } = paginateResult(docs, limit);

  return res.status(200).json(new ApiResponse(200, { replies: items, nextCursor, hasMore }));
});

/**
 * POST /api/v1/comments
 * Post a comment or reply. Requires: verifyJWT
 * Body: { videoId, text, parentId?, timestamp? }
 */
const createComment = asyncHandler(async (req, res) => {
  const { videoId, text, parentId, timestamp } = req.body;

  if (!videoId) throw new ApiError(400, 'videoId is required');
  if (!text || text.trim().length === 0) throw new ApiError(400, 'Comment text is required');
  if (text.length > 1000) throw new ApiError(400, 'Comment must be 1000 characters or fewer');

  const video = await Video.findOne({ _id: videoId, isDeleted: false, status: 'published' });
  if (!video) throw new ApiError(404, 'Video not found');

  let depth = 0;
  let parent = null;

  if (parentId) {
    parent = await Comment.findOne({ _id: parentId, isDeleted: false });
    if (!parent) throw new ApiError(404, 'Parent comment not found');
    if (parent.depth >= 1) throw new ApiError(400, 'Replies are limited to 2 levels deep');
    depth = parent.depth + 1;
  }

  // Feature 1: validate timestamp (seconds, must be within video duration)
  let parsedTimestamp = null;
  if (timestamp !== undefined && timestamp !== null) {
    parsedTimestamp = Math.max(0, Number(timestamp));
    if (video.duration > 0) parsedTimestamp = Math.min(parsedTimestamp, video.duration);
  }

  const comment = await Comment.create({
    video: videoId,
    author: req.user._id,
    parent: parentId || null,
    depth,
    text: text.trim(),
    timestamp: parsedTimestamp,
  });

  await Video.findByIdAndUpdate(videoId, { $inc: { commentCount: 1 } });
  await comment.populate('author', 'username displayName avatar');

  return res.status(201).json(new ApiResponse(201, { comment }, 'Comment posted'));
});

/**
 * DELETE /api/v1/comments/:id
 * Soft-delete a comment. Requires: verifyJWT (author or video owner)
 */
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findOne({ _id: req.params.id, isDeleted: false }).populate('video', 'owner');
  if (!comment) throw new ApiError(404, 'Comment not found');

  const isAuthor = comment.author.equals(req.user._id);
  const isVideoOwner = comment.video?.owner?.equals(req.user._id);

  if (!isAuthor && !isVideoOwner) throw new ApiError(403, 'Forbidden');

  comment.isDeleted = true;
  comment.text = '[deleted]';
  await comment.save();

  await Video.findByIdAndUpdate(comment.video._id, { $inc: { commentCount: -1 } });

  return res.status(200).json(new ApiResponse(200, null, 'Comment deleted'));
});

module.exports = { getComments, getReplies, createComment, deleteComment, getTimestampComments };

/**
 * GET /api/v1/comments/timestamps?videoId=
 * Feature 1: Get all timestamp comments for a video, sorted by timestamp asc.
 */
async function getTimestampComments(req, res) {
  const { videoId } = req.query;
  if (!videoId) throw new ApiError(400, 'videoId is required');

  const comments = await Comment.find({
    video: videoId,
    timestamp: { $ne: null },
    isDeleted: false,
    parent: null,
  })
    .sort({ timestamp: 1 })
    .populate('author', 'username displayName avatar')
    .lean();

  return res.status(200).json(new ApiResponse(200, { comments }));
}
