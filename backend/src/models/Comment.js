'use strict';

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
    depth: {
      type: Number,
      default: 0, // 0 = top-level, 1 = reply
      min: 0,
      max: 1,
    },
    text: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    // Feature 1: timestamp comment (seconds into video, null = regular comment)
    timestamp: {
      type: Number,
      default: null,
      min: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

commentSchema.index({ video: 1, parent: 1, createdAt: -1 });
commentSchema.index({ video: 1, likeCount: -1 }); // sort by likes
commentSchema.index({ video: 1, timestamp: 1 });   // Feature 1: timestamp comments

module.exports = mongoose.model('Comment', commentSchema);
