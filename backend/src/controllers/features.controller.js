'use strict';

const Video = require('../models/Video');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// ── Feature 2: Skip Segments ──────────────────────────────────────────────────

/**
 * POST /api/v1/features/skip-segment
 * Mark a time range as "boring" / skip-worthy.
 * Body: { videoId, start, end }
 */
const markSkipSegment = asyncHandler(async (req, res) => {
  const { videoId, start, end } = req.body;

  if (!videoId) throw new ApiError(400, 'videoId is required');
  if (typeof start !== 'number' || typeof end !== 'number' || start >= end) {
    throw new ApiError(400, 'start and end must be valid numbers with start < end');
  }

  const video = await Video.findOne({ _id: videoId, isDeleted: false });
  if (!video) throw new ApiError(404, 'Video not found');

  // Check if an overlapping segment already exists (within 5s tolerance)
  const TOLERANCE = 5;
  const existing = video.skipSegments.find(
    (s) => Math.abs(s.start - start) <= TOLERANCE && Math.abs(s.end - end) <= TOLERANCE
  );

  if (existing) {
    existing.count += 1;
  } else {
    video.skipSegments.push({ start, end, count: 1 });
  }

  await video.save();

  return res.status(200).json(
    new ApiResponse(200, { skipSegments: video.skipSegments }, 'Skip segment recorded')
  );
});

/**
 * GET /api/v1/features/skip-segments/:videoId
 * Get skip segments for a video. Returns segments with count >= threshold.
 */
const getSkipSegments = asyncHandler(async (req, res) => {
  const video = await Video.findOne({ _id: req.params.videoId, isDeleted: false })
    .select('skipSegments duration')
    .lean();

  if (!video) throw new ApiError(404, 'Video not found');

  // Only return segments marked by >= 3 users (or 1 for dev)
  const SKIP_THRESHOLD = parseInt(process.env.SKIP_THRESHOLD) || 1;
  const segments = video.skipSegments.filter((s) => s.count >= SKIP_THRESHOLD);

  return res.status(200).json(new ApiResponse(200, { segments, duration: video.duration }));
});

// ── Feature 3: Engagement Graph ───────────────────────────────────────────────

const BUCKET_SIZE = 5; // seconds per bucket

/**
 * POST /api/v1/features/engagement
 * Track a player event (play, pause, seek, skip).
 * Body: { videoId, eventType, timestamp }
 */
const trackEngagement = asyncHandler(async (req, res) => {
  const { videoId, eventType, timestamp } = req.body;

  if (!videoId) throw new ApiError(400, 'videoId is required');
  if (!['play', 'pause', 'seek', 'skip', 'rewind'].includes(eventType)) {
    throw new ApiError(400, 'Invalid eventType');
  }
  if (typeof timestamp !== 'number' || timestamp < 0) {
    throw new ApiError(400, 'timestamp must be a non-negative number');
  }

  const video = await Video.findOne({ _id: videoId, isDeleted: false }).select('duration engagementBuckets');
  if (!video) throw new ApiError(404, 'Video not found');

  const bucketIndex = Math.floor(timestamp / BUCKET_SIZE);
  const maxBuckets = video.duration > 0 ? Math.ceil(video.duration / BUCKET_SIZE) : 1000;

  if (bucketIndex >= 0 && bucketIndex < maxBuckets) {
    // Ensure array is long enough
    while (video.engagementBuckets.length <= bucketIndex) {
      video.engagementBuckets.push(0);
    }
    video.engagementBuckets[bucketIndex] += 1;
    video.markModified('engagementBuckets');
    await video.save();
  }

  return res.status(200).json(new ApiResponse(200, null, 'Engagement tracked'));
});

/**
 * GET /api/v1/features/engagement/:videoId
 * Get engagement heatmap data for a video.
 */
const getEngagement = asyncHandler(async (req, res) => {
  const video = await Video.findOne({ _id: req.params.videoId, isDeleted: false })
    .select('engagementBuckets duration')
    .lean();

  if (!video) throw new ApiError(404, 'Video not found');

  const buckets = video.engagementBuckets || [];
  const max = Math.max(...buckets, 1);

  // Normalize to 0–100 for frontend rendering
  const normalized = buckets.map((v) => Math.round((v / max) * 100));

  return res.status(200).json(
    new ApiResponse(200, {
      buckets: normalized,
      raw: buckets,
      bucketSize: BUCKET_SIZE,
      duration: video.duration,
    })
  );
});

// ── Feature 4: XP + Streak ────────────────────────────────────────────────────

const XP_REWARDS = {
  watch:   10,
  comment: 15,
  upload:  50,
  like:    5,
  streak:  25, // bonus for maintaining streak
};

/**
 * POST /api/v1/features/xp
 * Award XP for an action. Requires: verifyJWT
 * Body: { action: 'watch'|'comment'|'upload'|'like' }
 */
const awardXP = asyncHandler(async (req, res) => {
  const { action } = req.body;
  const xp = XP_REWARDS[action];
  if (!xp) throw new ApiError(400, `Unknown action: ${action}`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const user = await User.findById(req.user._id).select('+xp +streak +lastActiveDate');
  if (!user) throw new ApiError(404, 'User not found');

  // Update streak
  const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
  let streakBonus = 0;

  if (lastActive) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastActiveDay = new Date(lastActive);
    lastActiveDay.setHours(0, 0, 0, 0);

    if (lastActiveDay.getTime() === yesterday.getTime()) {
      // Consecutive day — extend streak
      user.streak = (user.streak || 0) + 1;
      if (user.streak % 7 === 0) streakBonus = XP_REWARDS.streak; // weekly bonus
    } else if (lastActiveDay.getTime() < yesterday.getTime()) {
      // Streak broken
      user.streak = 1;
    }
    // Same day — no change to streak
  } else {
    user.streak = 1;
  }

  user.lastActiveDate = today;
  user.xp = (user.xp || 0) + xp + streakBonus;
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, {
      xp: user.xp,
      streak: user.streak,
      earned: xp + streakBonus,
      streakBonus,
    }, `+${xp + streakBonus} XP`)
  );
});

/**
 * GET /api/v1/features/xp
 * Get current user's XP and streak. Requires: verifyJWT
 */
const getXP = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('xp streak lastActiveDate displayName username avatar');
  if (!user) throw new ApiError(404, 'User not found');

  // Check if streak is still active (last active was today or yesterday)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
  let streakActive = false;
  if (lastActive) {
    const lastDay = new Date(lastActive);
    lastDay.setHours(0, 0, 0, 0);
    streakActive = lastDay >= yesterday;
  }

  const level = Math.floor((user.xp || 0) / 100) + 1;
  const xpInLevel = (user.xp || 0) % 100;

  return res.status(200).json(
    new ApiResponse(200, {
      xp: user.xp || 0,
      streak: user.streak || 0,
      streakActive,
      level,
      xpInLevel,
      xpToNextLevel: 100 - xpInLevel,
      lastActiveDate: user.lastActiveDate,
    })
  );
});

// ── Feature 5: Random Video ───────────────────────────────────────────────────

/**
 * GET /api/v1/features/random-video
 * Return a random published public video.
 */
const getRandomVideo = asyncHandler(async (req, res) => {
  const videos = await Video.aggregate([
    {
      $match: {
        status: 'published',
        visibility: 'public',
        isDeleted: false,
      },
    },
    { $sample: { size: 1 } },
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'owner',
        pipeline: [{ $project: { username: 1, displayName: 1, avatar: 1 } }],
      },
    },
    // Use $addFields to safely unwrap the owner array without crashing on empty
    {
      $addFields: {
        owner: { $arrayElemAt: ['$owner', 0] },
      },
    },
  ]);

  if (!videos.length) {
    throw new ApiError(404, 'No videos available');
  }

  return res.status(200).json(new ApiResponse(200, { video: videos[0] }));
});

module.exports = {
  markSkipSegment,
  getSkipSegments,
  trackEngagement,
  getEngagement,
  awardXP,
  getXP,
  getRandomVideo,
};
