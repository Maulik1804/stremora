"use strict";

const mongoose = require("mongoose");

const playlistSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
      default: "",
      maxlength: 500,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    videos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
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
        ref: "User",
      },
    ],

    // Pending collaborator invites (awaiting approval)
    pendingCollaborators: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        invitedAt: { type: Date, default: Date.now },
      },
    ],

    // Collab video upload requests (videos proposed by collaborators, need owner approval)
    collabVideoRequests: [
      {
        video: { type: mongoose.Schema.Types.ObjectId, ref: "Video" },
        proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        requestedAt: { type: Date, default: Date.now },
      },
    ],

    // ── Series ────────────────────────────────────────────────────────────────
    // When isSeries=true this playlist is a creator-managed series (like a TV show).
    // seriesThumbnail is auto-set to the first episode's thumbnail but can be overridden.
    isSeries: {
      type: Boolean,
      default: false,
      index: true,
    },
    seriesThumbnail: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

playlistSchema.index({ owner: 1, visibility: 1 });
playlistSchema.index({ collaborators: 1 });
playlistSchema.index({ owner: 1, isSeries: 1, visibility: 1, createdAt: -1 });

module.exports = mongoose.model("Playlist", playlistSchema);
