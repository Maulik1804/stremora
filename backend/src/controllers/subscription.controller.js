'use strict';

const Subscription = require('../models/Subscription');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/**
 * POST /api/v1/subscriptions/:channelId
 * Toggle subscribe/unsubscribe. Requires: verifyJWT
 */
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (channelId === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot subscribe to your own channel');
  }

  const channel = await User.findById(channelId).select('username displayName avatar');
  if (!channel) throw new ApiError(404, 'Channel not found');

  const existing = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId,
  });

  let subscribed;
  if (existing) {
    await existing.deleteOne();
    subscribed = false;
  } else {
    await Subscription.create({ subscriber: req.user._id, channel: channelId });
    subscribed = true;
  }

  const subscriberCount = await Subscription.countDocuments({ channel: channelId });

  return res.status(200).json(
    new ApiResponse(200, { subscribed, subscriberCount, channel }, subscribed ? 'Subscribed' : 'Unsubscribed')
  );
});

/**
 * GET /api/v1/subscriptions/me
 * List channels the authenticated user is subscribed to. Requires: verifyJWT
 */
const getMySubscriptions = asyncHandler(async (req, res) => {
  const subs = await Subscription.find({ subscriber: req.user._id })
    .sort({ createdAt: -1 })
    .populate('channel', 'username displayName avatar bio')
    .lean();

  return res.status(200).json(new ApiResponse(200, { subscriptions: subs }));
});

/**
 * PATCH /api/v1/subscriptions/:channelId/notifications
 * Update notification preference for a subscription. Requires: verifyJWT
 * Body: { preference: 'all'|'personalized'|'none' }
 */
const updateNotificationPreference = asyncHandler(async (req, res) => {
  const { preference } = req.body;
  if (!['all', 'personalized', 'none'].includes(preference)) {
    throw new ApiError(400, 'preference must be "all", "personalized", or "none"');
  }

  const sub = await Subscription.findOneAndUpdate(
    { subscriber: req.user._id, channel: req.params.channelId },
    { notificationPreference: preference },
    { new: true }
  );

  if (!sub) throw new ApiError(404, 'Subscription not found');

  return res.status(200).json(new ApiResponse(200, { subscription: sub }, 'Notification preference updated'));
});

/**
 * GET /api/v1/subscriptions/channel/:channelId
 * Get subscriber count for a channel (public).
 */
const getSubscriberCount = asyncHandler(async (req, res) => {
  const count = await Subscription.countDocuments({ channel: req.params.channelId });
  return res.status(200).json(new ApiResponse(200, { subscriberCount: count }));
});

module.exports = {
  toggleSubscription,
  getMySubscriptions,
  updateNotificationPreference,
  getSubscriberCount,
};
