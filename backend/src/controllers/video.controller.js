'use strict';

const fs = require('fs');
const Video = require('../models/Video');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const {
  uploadVideo: cloudinaryUploadVideo,
  uploadThumbnail: cloudinaryUploadThumbnail,
  deleteAsset,
} = require('../services/cloudinary.service');
const { PAGE_SIZE, cursorFilter, paginateResult } = require('../utils/pagination');

// ── Helpers ───────────────────────────────────────────────────────────────────

const cleanTempFile = (path) => {
  if (path) {
    try { fs.unlinkSync(path); } catch { /* ignore */ }
  }
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/videos
 * Upload a new video. Requires: verifyJWT, uploadVideo.single('video')
 * Cloudinary Free plan limit: 100 MB per video.
 */
const createVideo = asyncHandler(async (req, res) => {
  const videoFile = req.file;
  if (!videoFile) throw new ApiError(400, 'Video file is required');

  const { title, description = '', visibility = 'public', tags } = req.body;

  if (!title || !title.trim()) {
    cleanTempFile(videoFile.path);
    throw new ApiError(400, 'Title is required');
  }

  let videoData;
  try {
    videoData = await cloudinaryUploadVideo(videoFile.path);
  } catch (err) {
    // cloudinaryUploadVideo already cleans the temp file in its finally block
    throw err;
  }

  const parsedTags = tags
    ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim())).filter(Boolean).slice(0, 15)
    : [];

  const video = await Video.create({
    owner: req.user._id,
    title: title.trim(),
    description,
    visibility,
    tags: parsedTags,
    videoUrl: videoData.url,
    cloudinaryPublicId: videoData.publicId,
    thumbnailUrl: videoData.thumbnailUrl,
    duration: videoData.duration,
    status: 'published',
  });

  return res.status(201).json(new ApiResponse(201, { video }, 'Video uploaded successfully'));
});

/**
 * POST /api/v1/videos/:id/thumbnail
 * Upload a custom thumbnail. Requires: verifyJWT, uploadImage.single('thumbnail')
 */
const uploadThumbnail = asyncHandler(async (req, res) => {
  const imageFile = req.file;
  if (!imageFile) throw new ApiError(400, 'Thumbnail image is required');

  const video = await Video.findOne({ _id: req.params.id, isDeleted: false });
  if (!video) throw new ApiError(404, 'Video not found');
  if (!video.owner.equals(req.user._id)) throw new ApiError(403, 'Forbidden');

  let imageData;
  try {
    imageData = await cloudinaryUploadThumbnail(imageFile.path);
  } catch (err) {
    cleanTempFile(imageFile.path);
    throw err;
  }

  // Delete old custom thumbnail if it exists
  if (video.thumbnailPublicId) {
    await deleteAsset(video.thumbnailPublicId, 'image');
  }

  video.thumbnailUrl = imageData.url;
  video.thumbnailPublicId = imageData.publicId;
  await video.save();

  return res.status(200).json(new ApiResponse(200, { thumbnailUrl: video.thumbnailUrl }, 'Thumbnail updated'));
});

/**
 * GET /api/v1/videos/:id
 * Get a single video by ID.
 */
const getVideoById = asyncHandler(async (req, res) => {
  const Subscription = require('../models/Subscription');

  const video = await Video.findOne({
    _id: req.params.id,
    isDeleted: false,
    status: 'published',
  }).populate('owner', 'username displayName avatar');

  if (!video) throw new ApiError(404, 'Video not found');

  // Private videos only visible to owner
  if (video.visibility === 'private') {
    if (!req.user?._id || !video.owner._id.equals(req.user._id)) {
      throw new ApiError(403, 'Forbidden');
    }
  }

  // Attach live subscriber count to owner
  const subscriberCount = await Subscription.countDocuments({ channel: video.owner._id });

  // Check if requesting user is subscribed
  let isSubscribed = false;
  if (req.user?._id) {
    const sub = await Subscription.findOne({
      subscriber: req.user._id,
      channel: video.owner._id,
    });
    isSubscribed = !!sub;
  }

  const videoObj = video.toObject();
  videoObj.owner = { ...videoObj.owner, subscriberCount, isSubscribed };

  return res.status(200).json(new ApiResponse(200, { video: videoObj }));
});

/**
 * GET /api/v1/videos
 * Public feed — paginated, public published videos.
 * Query: cursor, limit
 */
const getAllVideos = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 50);
  const cursor = req.query.cursor;

  const filter = {
    status: 'published',
    visibility: 'public',
    isDeleted: false,
    ...cursorFilter(cursor),
  };

  const docs = await Video.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate('owner', 'username displayName avatar')
    .lean();

  const { items, nextCursor, hasMore } = paginateResult(docs, limit);

  return res.status(200).json(new ApiResponse(200, { videos: items, nextCursor, hasMore }));
});

/**
 * GET /api/v1/videos/trending
 * Trending videos — ranked by viewCount desc, last 7 days.
 */
const getTrendingVideos = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 50);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const videos = await Video.find({
    status: 'published',
    visibility: 'public',
    isDeleted: false,
    createdAt: { $gte: since },
  })
    .sort({ viewCount: -1, createdAt: -1 })
    .limit(limit)
    .populate('owner', 'username displayName avatar')
    .lean();

  return res.status(200).json(new ApiResponse(200, { videos }));
});

/**
 * GET /api/v1/videos/search
 * Full-text search with filters.
 * Query: q, cursor, sort (relevance|date|views), duration (short|medium|long), date (today|week|month|year)
 */
const searchVideos = asyncHandler(async (req, res) => {
  const { q, cursor, sort = 'relevance', duration, date } = req.query;

  if (!q || q.trim().length < 2) {
    throw new ApiError(400, 'Search query must be at least 2 characters');
  }

  const limit = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 50);

  const filter = {
    $text: { $search: q.trim() },
    status: 'published',
    visibility: 'public',
    isDeleted: false,
  };

  // Date filter
  if (date) {
    const now = new Date();
    const dateMap = {
      today: new Date(now.setHours(0, 0, 0, 0)),
      week: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      year: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    };
    if (dateMap[date]) filter.createdAt = { $gte: dateMap[date] };
  }

  // Duration filter (seconds)
  if (duration) {
    const durationMap = {
      short: { $lt: 240 },        // < 4 min
      medium: { $gte: 240, $lt: 1200 }, // 4–20 min
      long: { $gte: 1200 },       // > 20 min
    };
    if (durationMap[duration]) filter.duration = durationMap[duration];
  }

  // Cursor
  if (cursor) {
    const { _id: cursorId } = cursorFilter(cursor);
    if (cursorId) filter._id = cursorId;
  }

  const sortMap = {
    relevance: { score: { $meta: 'textScore' }, createdAt: -1 },
    date: { createdAt: -1 },
    views: { viewCount: -1 },
  };

  const projection = sort === 'relevance' ? { score: { $meta: 'textScore' } } : {};

  const docs = await Video.find(filter, projection)
    .sort(sortMap[sort] || sortMap.relevance)
    .limit(limit + 1)
    .populate('owner', 'username displayName avatar')
    .lean();

  const { items, nextCursor, hasMore } = paginateResult(docs, limit);

  return res.status(200).json(
    new ApiResponse(200, {
      videos: items,
      nextCursor,
      hasMore,
      total: items.length,
      message: items.length === 0 ? 'No results found' : undefined,
    })
  );
});

/**
 * PATCH /api/v1/videos/:id
 * Update video metadata. Requires: verifyJWT
 */
const updateVideo = asyncHandler(async (req, res) => {
  const video = await Video.findOne({ _id: req.params.id, isDeleted: false });
  if (!video) throw new ApiError(404, 'Video not found');
  if (!video.owner.equals(req.user._id)) throw new ApiError(403, 'Forbidden');

  const { title, description, visibility, tags } = req.body;

  if (title !== undefined) video.title = title;
  if (description !== undefined) video.description = description;
  if (visibility !== undefined) video.visibility = visibility;
  if (tags !== undefined) {
    const parsed = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim());
    video.tags = parsed.slice(0, 15);
  }

  await video.save();

  return res.status(200).json(new ApiResponse(200, { video }, 'Video updated'));
});

/**
 * DELETE /api/v1/videos/:id
 * Soft-delete a video and remove Cloudinary assets. Requires: verifyJWT
 */
const deleteVideo = asyncHandler(async (req, res) => {
  const video = await Video.findOne({ _id: req.params.id, isDeleted: false });
  if (!video) throw new ApiError(404, 'Video not found');
  if (!video.owner.equals(req.user._id)) throw new ApiError(403, 'Forbidden');

  video.isDeleted = true;
  await video.save();

  // Delete Cloudinary assets (non-blocking)
  deleteAsset(video.cloudinaryPublicId, 'video').catch(() => {});
  if (video.thumbnailPublicId) {
    deleteAsset(video.thumbnailPublicId, 'image').catch(() => {});
  }

  return res.status(200).json(new ApiResponse(200, null, 'Video deleted'));
});

/**
 * GET /api/v1/videos/subscriptions
 * Feed of videos from subscribed channels. Requires: verifyJWT
 */
const getSubscriptionFeed = asyncHandler(async (req, res) => {
  const Subscription = require('../models/Subscription');
  const limit = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 50);
  const cursor = req.query.cursor;

  const subs = await Subscription.find({ subscriber: req.user._id }).select('channel').lean();
  const channelIds = subs.map((s) => s.channel);

  if (channelIds.length === 0) {
    return res.status(200).json(new ApiResponse(200, { videos: [], nextCursor: null, hasMore: false }));
  }

  const filter = {
    owner: { $in: channelIds },
    status: 'published',
    visibility: 'public',
    isDeleted: false,
    ...cursorFilter(cursor),
  };

  const docs = await Video.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate('owner', 'username displayName avatar')
    .lean();

  const { items, nextCursor, hasMore } = paginateResult(docs, limit);

  return res.status(200).json(new ApiResponse(200, { videos: items, nextCursor, hasMore }));
});

/**
 * POST /api/v1/videos/:id/view
 * Increment view count. Called by frontend after watch threshold.
 */
const recordView = asyncHandler(async (req, res) => {
  await Video.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
  return res.status(200).json(new ApiResponse(200, null, 'View recorded'));
});

module.exports = {
  createVideo,
  uploadThumbnail,
  getVideoById,
  getAllVideos,
  getTrendingVideos,
  searchVideos,
  updateVideo,
  deleteVideo,
  getSubscriptionFeed,
  recordView,
};
