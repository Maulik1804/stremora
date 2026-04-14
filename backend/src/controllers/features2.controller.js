'use strict';

const Video = require('../models/Video');
const User = require('../models/User');
const WatchHistory = require('../models/WatchHistory');
const { Quiz, QuizSubmission } = require('../models/Quiz');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// ── Feature 6: Mini Quiz ──────────────────────────────────────────────────────

/**
 * POST /api/v1/features/quiz
 * Creator creates/replaces a quiz for their video.
 * Body: { videoId, questions: [{ question, options, correct, explanation? }] }
 */
const createQuiz = asyncHandler(async (req, res) => {
  const { videoId, questions } = req.body;

  const video = await Video.findOne({ _id: videoId, isDeleted: false });
  if (!video) throw new ApiError(404, 'Video not found');
  if (!video.owner.equals(req.user._id)) throw new ApiError(403, 'Only the video owner can create a quiz');

  if (!Array.isArray(questions) || questions.length < 1 || questions.length > 10) {
    throw new ApiError(400, 'Provide 1–10 questions');
  }

  // Upsert — one quiz per video
  const quiz = await Quiz.findOneAndUpdate(
    { video: videoId },
    { video: videoId, creator: req.user._id, questions, isActive: true },
    { upsert: true, new: true, runValidators: true }
  );

  return res.status(200).json(new ApiResponse(200, { quiz }, 'Quiz saved'));
});

/**
 * GET /api/v1/features/quiz/:videoId
 * Get quiz for a video (questions without correct answers for viewers).
 */
const getQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOne({ video: req.params.videoId, isActive: true }).lean();
  if (!quiz) throw new ApiError(404, 'No quiz for this video');

  // Strip correct answer index for non-owners
  const isOwner = req.user && quiz.creator.toString() === req.user._id.toString();
  const questions = quiz.questions.map((q) => ({
    _id: q._id,
    question: q.question,
    options: q.options,
    ...(isOwner ? { correct: q.correct, explanation: q.explanation } : {}),
  }));

  return res.status(200).json(new ApiResponse(200, { quiz: { ...quiz, questions } }));
});

/**
 * POST /api/v1/features/quiz/:videoId/submit
 * Submit quiz answers. Requires: verifyJWT
 * Body: { answers: [number] }
 */
const submitQuiz = asyncHandler(async (req, res) => {
  const { answers } = req.body;
  const quiz = await Quiz.findOne({ video: req.params.videoId, isActive: true });
  if (!quiz) throw new ApiError(404, 'No quiz for this video');

  if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
    throw new ApiError(400, `Provide exactly ${quiz.questions.length} answers`);
  }

  // Grade
  let correct = 0;
  const results = quiz.questions.map((q, i) => {
    const isCorrect = answers[i] === q.correct;
    if (isCorrect) correct++;
    return { isCorrect, correct: q.correct, explanation: q.explanation };
  });

  const score = Math.round((correct / quiz.questions.length) * 100);

  // Upsert submission (allow retake — update existing)
  await QuizSubmission.findOneAndUpdate(
    { quiz: quiz._id, user: req.user._id },
    { quiz: quiz._id, video: req.params.videoId, user: req.user._id, answers, score, correct, total: quiz.questions.length },
    { upsert: true, new: true }
  );

  return res.status(200).json(
    new ApiResponse(200, { score, correct, total: quiz.questions.length, results }, `You scored ${score}%`)
  );
});

// ── Feature 7: Smart Playlists ────────────────────────────────────────────────

/**
 * GET /api/v1/features/smart-playlists
 * Auto-generate playlist suggestions based on tags, duration, category.
 */
const getSmartPlaylists = asyncHandler(async (req, res) => {
  const baseFilter = { status: 'published', visibility: 'public', isDeleted: false };

  const [shortVideos, topLiked, recentUploads] = await Promise.all([
    // "Quick Bites" — videos under 4 minutes
    Video.find({ ...baseFilter, duration: { $gt: 0, $lt: 240 } })
      .sort({ viewCount: -1 })
      .limit(10)
      .populate('owner', 'username displayName avatar')
      .lean(),

    // "Most Loved" — top liked videos
    Video.find(baseFilter)
      .sort({ likeCount: -1 })
      .limit(10)
      .populate('owner', 'username displayName avatar')
      .lean(),

    // "Fresh Uploads" — last 48 hours
    Video.find({ ...baseFilter, createdAt: { $gte: new Date(Date.now() - 48 * 3600 * 1000) } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('owner', 'username displayName avatar')
      .lean(),
  ]);

  const playlists = [
    { id: 'quick-bites',    title: '⚡ Quick Bites',    description: 'Videos under 4 minutes', videos: shortVideos },
    { id: 'most-loved',     title: '❤️ Most Loved',     description: 'Top liked videos',        videos: topLiked },
    { id: 'fresh-uploads',  title: '🆕 Fresh Uploads',  description: 'Uploaded in last 48h',    videos: recentUploads },
  ].filter((p) => p.videos.length > 0);

  return res.status(200).json(new ApiResponse(200, { playlists }));
});

// ── Feature 8: Watch Later Reminder ──────────────────────────────────────────

/**
 * GET /api/v1/features/watch-later-reminders
 * Return Watch Later videos not watched after 24h. Requires: verifyJWT
 */
const getWatchLaterReminders = asyncHandler(async (req, res) => {
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000); // 24 hours ago

  const reminders = await WatchHistory.find({
    user: req.user._id,
    watchLaterAddedAt: { $lte: cutoff, $ne: null },
    progressSeconds: 0,          // not started
    reminderDismissed: false,
  })
    .sort({ watchLaterAddedAt: 1 })
    .limit(5)
    .populate({
      path: 'video',
      match: { isDeleted: false, status: 'published' },
      select: 'title thumbnailUrl duration owner',
      populate: { path: 'owner', select: 'username displayName' },
    })
    .lean();

  const valid = reminders.filter((r) => r.video);

  return res.status(200).json(new ApiResponse(200, { reminders: valid }));
});

/**
 * PATCH /api/v1/features/watch-later-reminders/:videoId/dismiss
 * Dismiss a reminder. Requires: verifyJWT
 */
const dismissReminder = asyncHandler(async (req, res) => {
  await WatchHistory.findOneAndUpdate(
    { user: req.user._id, video: req.params.videoId },
    { reminderDismissed: true }
  );
  return res.status(200).json(new ApiResponse(200, null, 'Reminder dismissed'));
});

/**
 * POST /api/v1/features/watch-later/:videoId
 * Add a video to Watch Later (sets watchLaterAddedAt). Requires: verifyJWT
 */
const addToWatchLater = asyncHandler(async (req, res) => {
  await WatchHistory.findOneAndUpdate(
    { user: req.user._id, video: req.params.videoId },
    { watchLaterAddedAt: new Date(), reminderDismissed: false, watchedAt: new Date() },
    { upsert: true }
  );
  return res.status(200).json(new ApiResponse(200, null, 'Added to Watch Later'));
});

// ── Feature 10: Continue Watching ────────────────────────────────────────────

/**
 * POST /api/v1/features/progress
 * Save video watch progress. Requires: verifyJWT
 * Body: { videoId, progressSeconds }
 */
const saveProgress = asyncHandler(async (req, res) => {
  const { videoId, progressSeconds } = req.body;
  if (!videoId) throw new ApiError(400, 'videoId is required');
  if (typeof progressSeconds !== 'number' || progressSeconds < 0) {
    throw new ApiError(400, 'progressSeconds must be a non-negative number');
  }

  await WatchHistory.findOneAndUpdate(
    { user: req.user._id, video: videoId },
    { progressSeconds, watchedAt: new Date() },
    { upsert: true }
  );

  return res.status(200).json(new ApiResponse(200, null, 'Progress saved'));
});

/**
 * GET /api/v1/features/continue-watching
 * Get unfinished videos (progress > 10s, < 90% complete). Requires: verifyJWT
 */
const getContinueWatching = asyncHandler(async (req, res) => {
  const entries = await WatchHistory.find({
    user: req.user._id,
    progressSeconds: { $gt: 10 },
  })
    .sort({ watchedAt: -1 })
    .limit(12)
    .populate({
      path: 'video',
      match: { isDeleted: false, status: 'published' },
      select: 'title thumbnailUrl duration owner viewCount',
      populate: { path: 'owner', select: 'username displayName avatar' },
    })
    .lean();

  // Filter out deleted/null videos and videos that are >90% complete
  const results = entries
    .filter((e) => e.video)
    .filter((e) => {
      const dur = e.video.duration;
      if (!dur) return true;
      return e.progressSeconds / dur < 0.9; // not finished
    })
    .map((e) => ({
      ...e,
      progressPercent: e.video.duration
        ? Math.round((e.progressSeconds / e.video.duration) * 100)
        : 0,
    }));

  return res.status(200).json(new ApiResponse(200, { videos: results }));
});

module.exports = {
  // Feature 6
  createQuiz,
  getQuiz,
  submitQuiz,
  // Feature 7
  getSmartPlaylists,
  // Feature 8
  getWatchLaterReminders,
  dismissReminder,
  addToWatchLater,
  // Feature 10
  saveProgress,
  getContinueWatching,
};
