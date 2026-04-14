'use strict';

const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    targetVideos: {
      type: Number,
      required: true,
      min: 1,
      max: 10000,
    },
    completedVideos: {
      type: Number,
      default: 0,
      min: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'expired'],
      default: 'active',
    },
  },
  { timestamps: true }
);

goalSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Goal', goalSchema);
