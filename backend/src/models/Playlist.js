'use strict';

const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema(
  {
    owner: {
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
    description: {
      type: String,
      default: '',
      maxlength: 500,
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    videos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
      },
    ],
    isWatchLater: {
      type: Boolean,
      default: false,
    },
    // ── Collaborative Playlists ───────────────────────────────────────────────
    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

playlistSchema.index({ owner: 1, visibility: 1 });
playlistSchema.index({ collaborators: 1 });

module.exports = mongoose.model('Playlist', playlistSchema);
