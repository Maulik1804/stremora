'use strict';

const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
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
      maxlength: 100,
    },
    description: {
      type: String,
      default: '',
      maxlength: 5000,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
    thumbnailPublicId: {
      type: String,
      default: '',
    },
    duration: {
      type: Number,
      default: 0, // seconds
    },
    visibility: {
      type: String,
      enum: ['public', 'unlisted', 'private'],
      default: 'public',
      index: true,
    },
    status: {
      type: String,
      enum: ['processing', 'published', 'failed'],
      default: 'processing',
      index: true,
    },
    tags: {
      type: [{ type: String, maxlength: 30 }],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 15,
        message: 'A video can have at most 15 tags',
      },
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dislikeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ── Feature 2: Skip segments ──────────────────────────────────────────────
    // Each segment: { start, end, count } — count = how many users marked it
    skipSegments: {
      type: [{
        start:  { type: Number, required: true },
        end:    { type: Number, required: true },
        count:  { type: Number, default: 1 },
      }],
      default: [],
    },

    // ── Feature 3: Engagement heatmap ─────────────────────────────────────────
    // Bucketed view counts per 5-second interval: index = Math.floor(second/5)
    engagementBuckets: {
      type: [Number],
      default: [],
    },

    // ── Feature 5: Random video support ───────────────────────────────────────
    // Pre-computed random sort key, refreshed periodically
    randomSortKey: {
      type: Number,
      default: () => Math.random(),
      index: true,
    },

    // ── Feature 14: Search inside video (creator-defined keywords) ────────────
    keywords: {
      type: [{ word: String, timestamp: Number }],
      default: [],
    },
  },
  { timestamps: true }
);

// Compound indexes for feed and search queries
videoSchema.index({ status: 1, visibility: 1, isDeleted: 1, createdAt: -1 });
videoSchema.index({ owner: 1, isDeleted: 1, createdAt: -1 });
videoSchema.index({ viewCount: -1, createdAt: -1 }); // trending
videoSchema.index({ title: 'text', description: 'text', tags: 'text' }); // full-text search

module.exports = mongoose.model('Video', videoSchema);
