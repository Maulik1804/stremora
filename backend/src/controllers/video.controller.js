"use strict";

const fs = require("fs");
const Video = require("../models/Video");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const {
  uploadVideo: cloudinaryUploadVideo,
  uploadThumbnail: cloudinaryUploadThumbnail,
  deleteAsset,
} = require("../services/cloudinary.service");
const {
  PAGE_SIZE,
  cursorFilter,
  paginateResult,
} = require("../utils/pagination");
const { createNotification } = require("./notification.controller");
const Subscription = require("../models/Subscription");

// ── Helpers ───────────────────────────────────────────────────────────────────

const cleanTempFile = (path) => {
  if (path) {
    try {
      fs.unlinkSync(path);
    } catch {
      /* ignore */
    }
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
  if (!videoFile) throw new ApiError(400, "Video file is required");

  const { title, description = "", visibility = "public", tags } = req.body;

  if (!title || !title.trim()) {
    cleanTempFile(videoFile.path);
    throw new ApiError(400, "Title is required");
  }

  let videoData;
  try {
    videoData = await cloudinaryUploadVideo(videoFile.path);
  } catch (err) {
    // cloudinaryUploadVideo already cleans the temp file in its finally block
    throw err;
  }

  const parsedTags = tags
    ? (Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim()))
        .filter(Boolean)
        .slice(0, 15)
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
    status: "published",
  });

  // Notify all subscribers about the new video (non-blocking)
  if (visibility === "public") {
    setImmediate(async () => {
      try {
        const subs = await Subscription.find({
          channel: req.user._id,
          notificationPreference: { $ne: "none" },
        })
          .select("subscriber")
          .lean();

        const uploaderName = req.user.displayName || req.user.username;
        await Promise.all(
          subs.map((s) =>
            createNotification({
              recipient: s.subscriber,
              type: "new_video",
              actor: req.user._id,
              resourceId: video._id,
              resourceType: "video",
              message: `${uploaderName} uploaded a new video: "${video.title}"`,
            }),
          ),
        );
      } catch (err) {
        console.error(
          "[Notification] Failed to notify subscribers:",
          err.message,
        );
      }
    });
  }

  return res
    .status(201)
    .json(new ApiResponse(201, { video }, "Video uploaded successfully"));
});

/**
 * POST /api/v1/videos/:id/thumbnail
 * Upload a custom thumbnail. Requires: verifyJWT, uploadImage.single('thumbnail')
 */
const uploadThumbnail = asyncHandler(async (req, res) => {
  const imageFile = req.file;
  if (!imageFile) throw new ApiError(400, "Thumbnail image is required");

  const video = await Video.findOne({ _id: req.params.id, isDeleted: false });
  if (!video) throw new ApiError(404, "Video not found");
  if (!video.owner.equals(req.user._id)) throw new ApiError(403, "Forbidden");

  let imageData;
  try {
    imageData = await cloudinaryUploadThumbnail(imageFile.path);
  } catch (err) {
    cleanTempFile(imageFile.path);
    throw err;
  }

  // Delete old custom thumbnail if it exists
  if (video.thumbnailPublicId) {
    await deleteAsset(video.thumbnailPublicId, "image");
  }

  video.thumbnailUrl = imageData.url;
  video.thumbnailPublicId = imageData.publicId;
  await video.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { thumbnailUrl: video.thumbnailUrl },
        "Thumbnail updated",
      ),
    );
});

/**
 * GET /api/v1/videos/:id
 * Get a single video by ID.
 */
const getVideoById = asyncHandler(async (req, res) => {
  const Subscription = require("../models/Subscription");

  const video = await Video.findOne({
    _id: req.params.id,
    isDeleted: false,
    status: "published",
  })
    .populate("owner", "username displayName avatar")
    .populate("collaborators.user", "username displayName avatar")
    .lean();

  if (!video) throw new ApiError(404, "Video not found");

  // Private videos only visible to owner
  if (video.visibility === "private") {
    if (!req.user?._id || !video.owner._id.equals(req.user._id)) {
      throw new ApiError(403, "Forbidden");
    }
  }

  // Attach live subscriber count to owner
  const subscriberCount = await Subscription.countDocuments({
    channel: video.owner._id,
  });

  // Check if requesting user is subscribed
  let isSubscribed = false;
  if (req.user?._id) {
    const sub = await Subscription.findOne({
      subscriber: req.user._id,
      channel: video.owner._id,
    });
    isSubscribed = !!sub;
  }

  const videoObj = {
    ...video,
    owner: { ...video.owner, subscriberCount, isSubscribed },
  };

  return res.status(200).json(new ApiResponse(200, { video: videoObj }));
});

/**
 * GET /api/v1/videos
 * Public feed — randomized like YouTube home page.
 * First page: random sample. Subsequent pages: cursor-based newest-first fallback.
 * Query: cursor, limit
 */
const getAllVideos = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 50);
  const cursor = req.query.cursor;

  // First page — return a random sample for YouTube-like discovery
  if (!cursor) {
    const baseFilter = {
      status: "published",
      visibility: "public",
      isDeleted: false,
    };

    const seedValue = Number.parseFloat(req.query.seed);
    const seed =
      Number.isFinite(seedValue) && seedValue >= 0 && seedValue < 1
        ? seedValue
        : Math.random();
    const selectFields =
      "title thumbnailUrl duration viewCount createdAt owner randomSortKey";

    let docs = await Video.find({
      ...baseFilter,
      randomSortKey: { $gte: seed },
    })
      .sort({ randomSortKey: 1, createdAt: -1 })
      .limit(limit + 1)
      .select(selectFields)
      .populate("owner", "username displayName avatar")
      .lean();

    if (docs.length < limit + 1) {
      const remaining = limit + 1 - docs.length;
      const wrapDocs = await Video.find({
        ...baseFilter,
        randomSortKey: { $lt: seed },
      })
        .sort({ randomSortKey: 1, createdAt: -1 })
        .limit(remaining)
        .select(selectFields)
        .populate("owner", "username displayName avatar")
        .lean();

      docs = docs.concat(wrapDocs);
    }

    const { items, nextCursor, hasMore } = paginateResult(docs, limit);

    return res
      .status(200)
      .json(new ApiResponse(200, { videos: items, nextCursor, hasMore }));
  }

  // Subsequent pages — cursor-based pagination (newest first)
  const filter = {
    status: "published",
    visibility: "public",
    isDeleted: false,
    ...cursorFilter(cursor),
  };

  const docs = await Video.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .select("title thumbnailUrl duration viewCount createdAt owner")
    .populate("owner", "username displayName avatar")
    .lean();

  const { items, nextCursor, hasMore } = paginateResult(docs, limit);

  return res
    .status(200)
    .json(new ApiResponse(200, { videos: items, nextCursor, hasMore }));
});

/**
 * GET /api/v1/videos/trending
 * Trending videos — ranked by viewCount desc, last 7 days.
 */
const getTrendingVideos = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 50);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const videos = await Video.find({
    status: "published",
    visibility: "public",
    isDeleted: false,
    createdAt: { $gte: since },
  })
    .sort({ viewCount: -1, createdAt: -1 })
    .limit(limit)
    .populate("owner", "username displayName avatar")
    .lean();

  return res.status(200).json(new ApiResponse(200, { videos }));
});

/**
 * GET /api/v1/videos/search
 * Full-text search with filters.
 * Query: q, cursor, sort (relevance|date|views), duration (short|medium|long), date (today|week|month|year)
 */
const searchVideos = asyncHandler(async (req, res) => {
  const { q, cursor, sort = "relevance", duration, date } = req.query;

  if (!q || q.trim().length < 2) {
    throw new ApiError(400, "Search query must be at least 2 characters");
  }

  const limit = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 50);

  const filter = {
    $text: { $search: q.trim() },
    status: "published",
    visibility: "public",
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
      short: { $lt: 240 }, // < 4 min
      medium: { $gte: 240, $lt: 1200 }, // 4–20 min
      long: { $gte: 1200 }, // > 20 min
    };
    if (durationMap[duration]) filter.duration = durationMap[duration];
  }

  // Cursor
  if (cursor) {
    const { _id: cursorId } = cursorFilter(cursor);
    if (cursorId) filter._id = cursorId;
  }

  const sortMap = {
    relevance: { score: { $meta: "textScore" }, createdAt: -1 },
    date: { createdAt: -1 },
    views: { viewCount: -1 },
  };

  const projection =
    sort === "relevance" ? { score: { $meta: "textScore" } } : {};

  const docs = await Video.find(filter, projection)
    .sort(sortMap[sort] || sortMap.relevance)
    .limit(limit + 1)
    .select("title thumbnailUrl duration viewCount createdAt owner tags")
    .populate("owner", "username displayName avatar")
    .lean();

  const { items, nextCursor, hasMore } = paginateResult(docs, limit);

  return res.status(200).json(
    new ApiResponse(200, {
      videos: items,
      nextCursor,
      hasMore,
      total: items.length,
      message: items.length === 0 ? "No results found" : undefined,
    }),
  );
});

/**
 * PATCH /api/v1/videos/:id
 * Update video metadata. Requires: verifyJWT
 */
const updateVideo = asyncHandler(async (req, res) => {
  const video = await Video.findOne({ _id: req.params.id, isDeleted: false });
  if (!video) throw new ApiError(404, "Video not found");
  if (!video.owner.equals(req.user._id)) throw new ApiError(403, "Forbidden");

  const { title, description, visibility, tags } = req.body;

  if (title !== undefined) video.title = title;
  if (description !== undefined) video.description = description;
  if (visibility !== undefined) video.visibility = visibility;
  if (tags !== undefined) {
    const parsed = Array.isArray(tags)
      ? tags
      : tags.split(",").map((t) => t.trim());
    video.tags = parsed.slice(0, 15);
  }

  await video.save();

  return res.status(200).json(new ApiResponse(200, { video }, "Video updated"));
});

/**
 * DELETE /api/v1/videos/:id
 * Soft-delete a video and remove Cloudinary assets. Requires: verifyJWT
 */
const deleteVideo = asyncHandler(async (req, res) => {
  const video = await Video.findOne({ _id: req.params.id, isDeleted: false });
  if (!video) throw new ApiError(404, "Video not found");
  if (!video.owner.equals(req.user._id)) throw new ApiError(403, "Forbidden");

  video.isDeleted = true;
  await video.save();

  // Delete Cloudinary assets (non-blocking)
  deleteAsset(video.cloudinaryPublicId, "video").catch(() => {});
  if (video.thumbnailPublicId) {
    deleteAsset(video.thumbnailPublicId, "image").catch(() => {});
  }

  return res.status(200).json(new ApiResponse(200, null, "Video deleted"));
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

  // Include videos owned by this user OR where they are an accepted collaborator
  const filter = {
    $or: [
      {
        owner: req.params.userId,
        status: "published",
        visibility: "public",
        isDeleted: false,
        ...cursorFilter(cursor),
      },
      {
        collaborators: {
          $elemMatch: { user: req.params.userId, status: "accepted" },
        },
        status: "published",
        visibility: "public",
        isDeleted: false,
        ...cursorFilter(cursor),
      },
    ],
  };

  const docs = await Video.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate("owner", "username displayName avatar")
    .populate("collaborators.user", "username displayName avatar")
    .lean();

  const { items, nextCursor, hasMore } = paginateResult(docs, limit);

  return res
    .status(200)
    .json(new ApiResponse(200, { videos: items, nextCursor, hasMore }));
});
const getSubscriptionFeed = asyncHandler(async (req, res) => {
  const Subscription = require("../models/Subscription");
  const limit = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 50);
  const cursor = req.query.cursor;

  const subs = await Subscription.find({ subscriber: req.user._id })
    .select("channel")
    .lean();
  const channelIds = subs.map((s) => s.channel);

  if (channelIds.length === 0) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, { videos: [], nextCursor: null, hasMore: false }),
      );
  }

  const filter = {
    owner: { $in: channelIds },
    status: "published",
    visibility: "public",
    isDeleted: false,
    ...cursorFilter(cursor),
  };

  const docs = await Video.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate("owner", "username displayName avatar")
    .lean();

  const { items, nextCursor, hasMore } = paginateResult(docs, limit);

  return res
    .status(200)
    .json(new ApiResponse(200, { videos: items, nextCursor, hasMore }));
});

/**
 * POST /api/v1/videos/upload/init
 * Initialize a chunked upload session. Requires: verifyJWT
 */
const initChunkedUpload = asyncHandler(async (req, res) => {
  const { fileName, fileSize, title, description, visibility, tags } = req.body;

  if (!title || !title.trim()) {
    throw new ApiError(400, "Title is required");
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
    description: description || "",
    visibility: visibility || "public",
    tags: tags
      ? (Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim()))
          .filter(Boolean)
          .slice(0, 15)
      : [],
    chunks: {},
    createdAt: Date.now(),
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, { uploadSessionId }, "Upload session initialized"),
    );
});

/**
 * POST /api/v1/videos/upload/:uploadSessionId/chunk
 * Upload a single chunk. Requires: verifyJWT
 */
const uploadChunk = asyncHandler(async (req, res) => {
  const { uploadSessionId } = req.params;
  const chunkFile = req.file;

  if (!chunkFile) throw new ApiError(400, "Chunk file is required");

  global.uploadSessions = global.uploadSessions || {};
  const session = global.uploadSessions[uploadSessionId];

  if (!session) throw new ApiError(404, "Upload session not found");
  if (!session.userId.equals(req.user._id))
    throw new ApiError(403, "Forbidden");

  const { chunkIndex, totalChunks } = req.body;

  if (chunkIndex === undefined || totalChunks === undefined) {
    cleanTempFile(chunkFile.path);
    throw new ApiError(400, "chunkIndex and totalChunks are required");
  }

  // Store chunk path
  session.chunks[chunkIndex] = chunkFile.path;
  session.totalChunks = totalChunks;

  return res
    .status(200)
    .json(new ApiResponse(200, { chunkIndex }, "Chunk uploaded"));
});

/**
 * POST /api/v1/videos/upload/:uploadSessionId/finalize
 * Finalize upload — combines chunks, uploads to Cloudinary in background,
 * returns immediately with a processing video so the frontend never times out.
 */
const finalizeChunkedUpload = asyncHandler(async (req, res) => {
  const { uploadSessionId } = req.params;

  global.uploadSessions = global.uploadSessions || {};
  const session = global.uploadSessions[uploadSessionId];

  if (!session) throw new ApiError(404, "Upload session not found");
  if (!session.userId.equals(req.user._id))
    throw new ApiError(403, "Forbidden");

  const path = require("path");
  const os = require("os");

  // Verify all chunks exist before starting
  for (let i = 0; i < session.totalChunks; i++) {
    if (!session.chunks[i]) {
      throw new ApiError(400, `Missing chunk ${i} of ${session.totalChunks}`);
    }
  }

  // Create video record immediately with status 'processing'
  // This lets us return a response right away without waiting for Cloudinary
  const video = await Video.create({
    owner: session.userId,
    title: session.title,
    description: session.description,
    visibility: session.visibility,
    tags: session.tags,
    videoUrl: "",
    cloudinaryPublicId: "",
    thumbnailUrl: "",
    duration: 0,
    status: "processing",
  });

  console.log(`[Upload] Video record created (processing): ${video._id}`);

  // Return immediately — frontend gets success right away
  res
    .status(201)
    .json(new ApiResponse(201, { video }, "Video processing started"));

  // ── Background: combine + upload to Cloudinary ────────────────────────────
  setImmediate(async () => {
    const combinedPath = path.join(
      os.tmpdir(),
      `combined_${uploadSessionId}.mp4`,
    );

    try {
      console.log(
        `[Upload] Background: combining ${session.totalChunks} chunks...`,
      );

      const writeStream = fs.createWriteStream(combinedPath, {
        highWaterMark: 1024 * 1024,
        flags: "w",
        mode: 0o666,
      });

      for (let i = 0; i < session.totalChunks; i++) {
        const chunkPath = session.chunks[i];
        if (!fs.existsSync(chunkPath)) {
          throw new Error(`Chunk file ${i} not found`);
        }

        await new Promise((resolve, reject) => {
          const readStream = fs.createReadStream(chunkPath, {
            highWaterMark: 1024 * 1024,
          });
          readStream.on("error", reject);
          readStream.on("end", resolve);
          readStream.pipe(writeStream, { end: false });
        });

        cleanTempFile(chunkPath);
        delete session.chunks[i];
      }

      await new Promise((resolve, reject) => {
        writeStream.end(resolve);
        writeStream.on("error", reject);
      });

      const stats = fs.statSync(combinedPath);
      if (stats.size === 0) throw new Error("Combined file is empty");

      console.log(
        `[Upload] Background: combined file ${(stats.size / 1024 / 1024).toFixed(2)} MB, uploading to Cloudinary...`,
      );

      const videoData = await cloudinaryUploadVideo(combinedPath);

      console.log(
        `[Upload] Background: Cloudinary upload done — ${videoData.publicId}`,
      );

      // Update video record to published
      await Video.findByIdAndUpdate(video._id, {
        videoUrl: videoData.url,
        cloudinaryPublicId: videoData.publicId,
        thumbnailUrl: videoData.thumbnailUrl,
        duration: videoData.duration,
        status: "published",
      });

      console.log(`[Upload] Background: video ${video._id} published`);

      // Notify subscribers
      if (session.visibility === "public") {
        try {
          const subs = await Subscription.find({
            channel: session.userId,
            notificationPreference: { $ne: "none" },
          })
            .select("subscriber")
            .lean();

          const uploader = await require("../models/User")
            .findById(session.userId)
            .select("displayName username")
            .lean();
          const uploaderName =
            uploader?.displayName || uploader?.username || "Someone";

          await Promise.all(
            subs.map((s) =>
              createNotification({
                recipient: s.subscriber,
                type: "new_video",
                actor: session.userId,
                resourceId: video._id,
                resourceType: "video",
                message: `${uploaderName} uploaded a new video: "${video.title}"`,
              }),
            ),
          );
        } catch (notifErr) {
          console.error(
            "[Notification] Failed to notify subscribers:",
            notifErr.message,
          );
        }
      }
    } catch (bgErr) {
      console.error(
        `[Upload] Background processing failed for video ${video._id}:`,
        bgErr.message,
      );
      // Mark video as failed so it doesn't show as processing forever
      await Video.findByIdAndUpdate(video._id, { status: "failed" }).catch(
        () => {},
      );
      cleanTempFile(combinedPath);
    } finally {
      delete global.uploadSessions[uploadSessionId];
      cleanTempFile(combinedPath);
    }
  });
});

/**
 * POST /api/v1/videos/:id/view
 * Increment view count. Called by frontend after watch threshold.
 */
const getUploadStatus = asyncHandler(async (req, res) => {
  const { uploadSessionId } = req.params;

  // Check if session still exists (still processing chunks)
  global.uploadSessions = global.uploadSessions || {};
  const session = global.uploadSessions[uploadSessionId];

  if (session) {
    // Session still active — finalize hasn't been called yet or is in progress
    return res
      .status(200)
      .json(new ApiResponse(200, { video: null, status: "pending" }));
  }

  // Session gone — look for the video by matching the session pattern in owner + recent creation
  // We use the userId embedded in the sessionId: "userId_timestamp_random"
  const parts = uploadSessionId.split("_");
  if (parts.length < 2) {
    return res
      .status(200)
      .json(new ApiResponse(200, { video: null, status: "pending" }));
  }

  const userId = parts[0];
  const sessionTimestamp = parseInt(parts[1]);

  if (!sessionTimestamp) {
    return res
      .status(200)
      .json(new ApiResponse(200, { video: null, status: "pending" }));
  }

  // Find the most recent video created by this user around the session time (±5 min)
  const video = await Video.findOne({
    owner: userId,
    createdAt: {
      $gte: new Date(sessionTimestamp - 60000), // 1 min before session
      $lte: new Date(sessionTimestamp + 600000), // 10 min after session
    },
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!video) {
    return res
      .status(200)
      .json(new ApiResponse(200, { video: null, status: "pending" }));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { video, status: video.status }));
});
const recordView = asyncHandler(async (req, res) => {
  await Video.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
  return res.status(200).json(new ApiResponse(200, null, "View recorded"));
});

/**
 * GET /api/v1/videos/upload/signature
 * Generate a signed Cloudinary upload signature for direct browser-to-Cloudinary upload.
 * Requires: verifyJWT
 */
const getUploadSignature = asyncHandler(async (req, res) => {
  const cloudinaryInstance = require("../config/cloudinary");
  const {
    CLOUDINARY_API_KEY,
    CLOUDINARY_CLOUD_NAME,
  } = require("../config/env");

  const resourceType = req.query.resourceType || "video";
  const timestamp = Math.round(Date.now() / 1000);
  const folder =
    resourceType === "image" ? "streamora/thumbnails" : "streamora/videos";

  // Build params to sign
  const paramsToSign = { timestamp, folder };

  // For images (thumbnails), include transformation in signature
  if (resourceType === "image") {
    paramsToSign.transformation = "w_1280,h_720,c_fill,q_auto,f_auto";
  }

  const signature = cloudinaryInstance.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET,
  );

  return res.status(200).json(
    new ApiResponse(200, {
      signature,
      timestamp,
      folder,
      transformation: paramsToSign.transformation,
      apiKey: CLOUDINARY_API_KEY,
      cloudName: CLOUDINARY_CLOUD_NAME,
    }),
  );
});

/**
 * POST /api/v1/videos/save
 * Save video metadata after direct Cloudinary upload from browser.
 * Body: { title, description, visibility, tags, cloudinaryPublicId, videoUrl, thumbnailUrl, duration }
 * Requires: verifyJWT
 */
const saveVideo = asyncHandler(async (req, res) => {
  const {
    title,
    description = "",
    visibility = "public",
    tags,
    cloudinaryPublicId,
    videoUrl,
    thumbnailUrl,
    duration,
  } = req.body;

  if (!title?.trim()) throw new ApiError(400, "Title is required");
  if (!cloudinaryPublicId || !videoUrl)
    throw new ApiError(400, "Cloudinary upload data is required");

  const parsedTags = tags
    ? (Array.isArray(tags)
        ? tags
        : String(tags)
            .split(",")
            .map((t) => t.trim())
      )
        .filter(Boolean)
        .slice(0, 15)
    : [];

  const video = await Video.create({
    owner: req.user._id,
    title: title.trim(),
    description,
    visibility,
    tags: parsedTags,
    videoUrl,
    cloudinaryPublicId,
    thumbnailUrl: thumbnailUrl || "",
    duration: Math.round(duration || 0),
    status: "published",
  });

  // Notify subscribers (non-blocking)
  if (visibility === "public") {
    setImmediate(async () => {
      try {
        const subs = await Subscription.find({
          channel: req.user._id,
          notificationPreference: { $ne: "none" },
        })
          .select("subscriber")
          .lean();
        const uploaderName = req.user.displayName || req.user.username;
        await Promise.all(
          subs.map((s) =>
            createNotification({
              recipient: s.subscriber,
              type: "new_video",
              actor: req.user._id,
              resourceId: video._id,
              resourceType: "video",
              message: `${uploaderName} uploaded a new video: "${video.title}"`,
            }),
          ),
        );
      } catch (err) {
        console.error("[Notification] Failed:", err.message);
      }
    });
  }

  return res
    .status(201)
    .json(new ApiResponse(201, { video }, "Video saved successfully"));
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
  getUploadStatus,
  getUploadSignature,
  saveVideo,
};
