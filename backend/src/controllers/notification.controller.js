'use strict';

const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { PAGE_SIZE, paginateResult } = require('../utils/pagination');

/**
 * GET /api/v1/notifications
 * List notifications for the authenticated user (paginated, newest first).
 * Requires: verifyJWT
 */
const getNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || PAGE_SIZE, 50);
  const cursor = req.query.cursor;

  const filter = { recipient: req.user._id };

  // Cursor-based pagination using createdAt timestamp
  if (cursor) {
    filter.createdAt = { $lt: new Date(parseInt(cursor)) };
  }

  const docs = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate('actor', 'username displayName avatar')
    .lean();

  const hasMore = docs.length > limit;
  const items = hasMore ? docs.slice(0, limit) : docs;
  const nextCursor = hasMore
    ? new Date(items[items.length - 1].createdAt).getTime().toString()
    : null;

  return res.status(200).json(
    new ApiResponse(200, { notifications: items, nextCursor, hasMore })
  );
});

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a single notification as read. Requires: verifyJWT
 */
const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id,
  });

  if (!notification) throw new ApiError(404, 'Notification not found');

  notification.isRead = true;
  await notification.save();

  return res.status(200).json(new ApiResponse(200, null, 'Marked as read'));
});

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all unread notifications as read. Requires: verifyJWT
 */
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true }
  );

  return res.status(200).json(new ApiResponse(200, null, 'All notifications marked as read'));
});

/**
 * DELETE /api/v1/notifications/:id
 * Delete a single notification. Requires: verifyJWT
 */
const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({
    _id: req.params.id,
    recipient: req.user._id,
  });

  return res.status(200).json(new ApiResponse(200, null, 'Notification deleted'));
});

/**
 * DELETE /api/v1/notifications
 * Clear all notifications for the user. Requires: verifyJWT
 */
const clearAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ recipient: req.user._id });
  return res.status(200).json(new ApiResponse(200, null, 'All notifications cleared'));
});

/**
 * Helper: create a notification (used internally by other controllers).
 * Not exposed as a route.
 */
const createNotification = async ({ recipient, type, actor, resourceId, resourceType, message }) => {
  try {
    // Don't notify yourself
    if (recipient?.toString() === actor?.toString()) return;

    await Notification.create({
      recipient,
      type,
      actor: actor || null,
      resourceId: resourceId || null,
      resourceType: resourceType || '',
      message,
    });
  } catch (err) {
    // Non-fatal — log but don't crash the calling request
    console.error('[Notification] Failed to create:', err.message);
  }
};

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  clearAllNotifications,
  createNotification,
};
