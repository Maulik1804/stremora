'use strict';

const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resourceType: {
      type: String,
      enum: ['video', 'comment'],
      required: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reaction: {
      type: String,
      enum: ['like', 'dislike'],
      required: true,
    },
  },
  { timestamps: true }
);

// One reaction per user per resource
likeSchema.index({ user: 1, resourceType: 1, resourceId: 1 }, { unique: true });
likeSchema.index({ resourceType: 1, resourceId: 1 });
likeSchema.index({ user: 1, resourceType: 1, reaction: 1 }); // liked videos list

module.exports = mongoose.model('Like', likeSchema);
