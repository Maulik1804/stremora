'use strict';

const mongoose = require('mongoose');

const watchHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
    watchedAt: {
      type: Date,
      default: Date.now,
    },
    // ── Feature 10: Continue Watching ─────────────────────────────────────────
    progressSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    // ── Feature 8: Watch Later Reminder ───────────────────────────────────────
    watchLaterAddedAt: {
      type: Date,
      default: null,
    },
    reminderDismissed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: false }
);

watchHistorySchema.index({ user: 1, video: 1 }, { unique: true });
watchHistorySchema.index({ user: 1, watchedAt: -1 });
// Feature 10: index for "continue watching" — unfinished videos
watchHistorySchema.index({ user: 1, progressSeconds: -1 });

module.exports = mongoose.model('WatchHistory', watchHistorySchema);
