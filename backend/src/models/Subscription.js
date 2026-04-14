'use strict';

const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    subscriber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notificationPreference: {
      type: String,
      enum: ['all', 'personalized', 'none'],
      default: 'all',
    },
  },
  { timestamps: true }
);

subscriptionSchema.index({ subscriber: 1, channel: 1 }, { unique: true });
subscriptionSchema.index({ subscriber: 1 });
subscriptionSchema.index({ channel: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
