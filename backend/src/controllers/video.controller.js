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
 * GET /api/v1/videos/mine
 * Get all videos owned by the authenticated user (all statuses, all visibilities).
 * Used by Studio and Dashboard. Requires: verifyJWT
 */
const getMyVideos = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, 200);

  const videos = await Video.find({
    owner: req.user._id,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return res.status(200).json(new ApiResponse(200, { videos }));
});

/**
 * GET /api/v1/videos/channel/:userId
 * Get all published public videos for a specific channel.
 * Used by the Channel page to show only that creator's videos.
 */
const getChannelVideos = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const cursor = req.query.cursor;

  const filter = {
    owner: req.params.userId,
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
 * POST /api/v1/videos/upload/init
 * Initialize a chunked upload session. Requires: verifyJWT
 */
const initChunkedUpload = asyncHandler(async (req, res) => {
  const { fileName, fileSize, title, description, visibility, tags } = req.body;

  if (!title || !title.trim()) {
    throw new ApiError(400, 'Title is required');
  }

  // Store upload session in memory (in production, use Redis or database)
  const uploadSessionId = `${req.user._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Store metadata for later use
  global.uploadSessions = global.uploadSessions || {};
  global.uploadSessions[uploadSessionId] = {
    userId: req.user._id,
    fileName,
    fileSize,
    title: title.trim(),
    description: description || '',
    visibility: visibility || 'public',
    tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())).filter(Boolean).slice(0, 15) : [],
    chunks: {},
    createdAt: Date.now(),
  };

  return res.status(200).json(new ApiResponse(200, { uploadSessionId }, 'Upload session initialized'));
});

/**
 * POST /api/v1/videos/upload/:uploadSessionId/chunk
 * Upload a single chunk. Requires: verifyJWT
 */
const uploadChunk = asyncHandler(async (req, res) => {
  const { uploadSessionId } = req.params;
  const chunkFile = req.file;
  
  if (!chunkFile) throw new ApiError(400, 'Chunk file is required');

  global.uploadSessions = global.uploadSessions || {};
  const session = global.uploadSessions[uploadSessionId];
  
  if (!session) throw new ApiError(404, 'Upload session not found');
  if (!session.userId.equals(req.user._id)) throw new ApiError(403, 'Forbidden');

  const { chunkIndex, totalChunks } = req.body;
  
  if (chunkIndex === undefined || totalChunks === undefined) {
    cleanTempFile(chunkFile.path);
    throw new ApiError(400, 'chunkIndex and totalChunks are required');
  }

  // Store chunk path
  session.chunks[chunkIndex] = chunkFile.path;
  session.totalChunks = totalChunks;

  return res.status(200).json(new ApiResponse(200, { chunkIndex }, 'Chunk uploaded'));
});

/**
 * POST /api/v1/videos/upload/:uploadSessionId/finalize
 * Finalize upload by combining chunks and uploading to Cloudinary. Requires: verifyJWT
 */
const finalizeChunkedUpload = asyncHandler(async (req, res) => {
  const { uploadSessionId } = req.params;

  global.uploadSessions = global.uploadSessions || {};
  const session = global.uploadSessions[uploadSessionId];
  
  if (!session) throw new ApiError(404, 'Upload session not found');
  if (!session.userId.equals(req.user._id)) throw new ApiError(403, 'Forbidden');

  let combinedPath = null;

  try {
    // Combine chunks into a single file using streams for memory efficiency
    const path = require('path');
    const os = require('os');
    combinedPath = path.join(os.tmpdir(), `combined_${uploadSessionId}.mp4`);
    
    console.log(`[Upload] Starting finalization for session ${uploadSessionId}`);
    console.log(`[Upload] Total chunks: ${session.totalChunks}`);

    // Verify all chunks exist before combining
    for (let i = 0; i < session.totalChunks; i++) {
      if (!session.chunks[i]) {
        throw new ApiError(400, `Missing chunk ${i} of ${session.totalChunks}`);
      }
    }

    // Combine chunks sequentially using streams
    console.log(`[Upload] Combining ${session.totalChunks} chunks...`);
    
    const writeStream = fs.createWriteStream(combinedPath, { 
      highWaterMark: 1024 * 1024, // 1MB buffer for better performance
      flags: 'w',
      mode: 0o666
    });

    let combinedSize = 0;

    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = session.chunks[i];
      
      // Verify chunk file exists
      if (!fs.existsSync(chunkPath)) {
        throw new ApiError(400, `Chunk file ${i} not found at ${chunkPath}`);
      }

      const chunkStats = fs.statSync(chunkPath);
      console.log(`[Upload] Processing chunk ${i + 1}/${session.totalChunks} (${(chunkStats.size / 1024 / 1024).toFixed(2)} MB)`);

      await new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(chunkPath, { 
          highWaterMark: 1024 * 1024 // 1MB buffer
        });

        readStream.on('error', (err) => {
          console.error(`[Upload] Error reading chunk ${i}:`, err.message);
          reject(err);
        });

        writeStream.on('error', (err) => {
          console.error(`[Upload] Error writing combined file:`, err.message);
          reject(err);
        });

        readStream.on('end', () => {
          combinedSize += chunkStats.size;
          resolve();
        });

        readStream.pipe(writeStream, { end: false });
      });

      // Clean up chunk immediately after combining
      cleanTempFile(chunkPath);
      delete session.chunks[i];
    }

    // End the write stream
    await new Promise((resolve, reject) => {
      writeStream.end(() => {
        console.log(`[Upload] Write stream ended`);
        resolve();
      });
      writeStream.on('error', reject);
    });

    // Verify combined file exists and has content
    if (!fs.existsSync(combinedPath)) {
      throw new ApiError(400, 'Combined file was not created');
    }

    const stats = fs.statSync(combinedPath);
    if (stats.size === 0) {
      throw new ApiError(400, 'Combined file is empty');
    }

    console.log(`[Upload] Combined file created: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // Upload combined file to Cloudinary with extended timeout
    let videoData;
    try {
      console.log(`[Upload] Starting Cloudinary upload...`);
      
      // Set a timeout for Cloudinary upload (10 minutes for very large files)
      const uploadPromise = cloudinaryUploadVideo(combinedPath);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => {
          const err = new Error('Cloudinary upload timeout after 10 minutes');
          err.code = 'CLOUDINARY_TIMEOUT';
          reject(err);
        }, 10 * 60 * 1000)
      );

      videoData = await Promise.race([uploadPromise, timeoutPromise]);
      console.log(`[Upload] Cloudinary upload completed successfully`);
    } catch (cloudinaryErr) {
      console.error('[Cloudinary] Upload error:', cloudinaryErr.message);
      
      // Provide more specific error messages
      if (cloudinaryErr.code === 'CLOUDINARY_TIMEOUT') {
        throw new ApiError(504, 'Video upload to storage service timed out. Please try again or use a smaller file.');
      }
      
      throw new ApiError(502, `Storage service error: ${cloudinaryErr.message || 'upload failed'}`);
    }

    // Create video document
    const video = await Video.create({
      owner: session.userId,
      title: session.title,
      description: session.description,
      visibility: session.visibility,
      tags: session.tags,
      videoUrl: videoData.url,
      cloudinaryPublicId: videoData.publicId,
      thumbnailUrl: videoData.thumbnailUrl,
      duration: videoData.duration,
      status: 'published',
    });

    console.log(`[Upload] Video document created: ${video._id}`);

    // Clean up session
    delete global.uploadSessions[uploadSessionId];

    return res.status(201).json(new ApiResponse(201, { video }, 'Video uploaded successfully'));
  } catch (err) {
    console.error('[Upload] Finalize error:', err.message);
    
    // Clean up all chunks on error
    if (session && session.chunks) {
      console.log(`[Upload] Cleaning up ${Object.keys(session.chunks).length} chunks...`);
      Object.values(session.chunks).forEach(chunkPath => cleanTempFile(chunkPath));
    }
    
    // Clean up combined file
    cleanTempFile(combinedPath);
    
    // Clean up session
    if (uploadSessionId) {
      delete global.uploadSessions[uploadSessionId];
    }

    // Return appropriate error
    if (err instanceof ApiError) {
      throw err;
    }
    
    throw new ApiError(500, err.message || 'Upload finalization failed');
  }
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
  getMyVideos,
  getChannelVideos,
  getSubscriptionFeed,
  recordView,
  initChunkedUpload,
  uploadChunk,
  finalizeChunkedUpload,
};
