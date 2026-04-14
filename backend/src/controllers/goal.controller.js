'use strict';

const Goal = require('../models/Goal');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/**
 * POST /api/v1/goals
 * Create a new goal. Requires: verifyJWT
 */
const createGoal = asyncHandler(async (req, res) => {
  const { title, targetVideos, endDate } = req.body;

  if (!title) throw new ApiError(400, 'Title is required');
  if (!targetVideos || targetVideos < 1) throw new ApiError(400, 'targetVideos must be at least 1');
  if (!endDate) throw new ApiError(400, 'endDate is required');

  const end = new Date(endDate);
  if (isNaN(end.getTime()) || end <= new Date()) {
    throw new ApiError(400, 'endDate must be a valid future date');
  }

  const goal = await Goal.create({
    user: req.user._id,
    title,
    targetVideos,
    endDate: end,
  });

  return res.status(201).json(new ApiResponse(201, { goal }, 'Goal created'));
});

/**
 * GET /api/v1/goals
 * Get all goals for the authenticated user. Requires: verifyJWT
 */
const getUserGoals = asyncHandler(async (req, res) => {
  // Auto-expire goals past their end date
  await Goal.updateMany(
    { user: req.user._id, status: 'active', endDate: { $lt: new Date() } },
    { status: 'expired' }
  );

  const goals = await Goal.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json(new ApiResponse(200, { goals }));
});

/**
 * GET /api/v1/goals/active
 * Get the current active goal. Requires: verifyJWT
 */
const getActiveGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({
    user: req.user._id,
    status: 'active',
    endDate: { $gte: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json(new ApiResponse(200, { goal }));
});

/**
 * PATCH /api/v1/goals/:id
 * Update goal metadata. Requires: verifyJWT
 */
const updateGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
  if (!goal) throw new ApiError(404, 'Goal not found');

  const { title, targetVideos, endDate } = req.body;
  if (title !== undefined) goal.title = title;
  if (targetVideos !== undefined) goal.targetVideos = targetVideos;
  if (endDate !== undefined) goal.endDate = new Date(endDate);

  await goal.save();

  return res.status(200).json(new ApiResponse(200, { goal }, 'Goal updated'));
});

/**
 * PATCH /api/v1/goals/:id/complete
 * Mark a goal as completed. Requires: verifyJWT
 */
const completeGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
  if (!goal) throw new ApiError(404, 'Goal not found');

  goal.status = 'completed';
  await goal.save();

  return res.status(200).json(new ApiResponse(200, { goal }, 'Goal marked as completed'));
});

/**
 * DELETE /api/v1/goals/:id
 * Delete a goal. Requires: verifyJWT
 */
const deleteGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!goal) throw new ApiError(404, 'Goal not found');

  return res.status(200).json(new ApiResponse(200, null, 'Goal deleted'));
});

/**
 * Internal helper — increment completedVideos on active goal.
 * Called from history controller when a video is watched.
 */
const incrementGoalProgress = async (userId) => {
  const goal = await Goal.findOne({
    user: userId,
    status: 'active',
    endDate: { $gte: new Date() },
  }).sort({ createdAt: -1 });

  if (!goal) return;

  goal.completedVideos = Math.min(goal.completedVideos + 1, goal.targetVideos);
  if (goal.completedVideos >= goal.targetVideos) {
    goal.status = 'completed';
  }
  await goal.save();
};

module.exports = {
  createGoal,
  getUserGoals,
  getActiveGoal,
  updateGoal,
  completeGoal,
  deleteGoal,
  incrementGoalProgress,
};
