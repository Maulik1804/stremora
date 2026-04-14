'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
  ACCESS_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRY,
} = require('../config/env');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    displayName: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    avatarPublicId: {
      type: String,
      default: '',
      select: false,
    },
    banner: {
      type: String,
      default: '',
    },
    bannerPublicId: {
      type: String,
      default: '',
      select: false,
    },
    bio: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    refreshTokenHash: {
      type: String,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    isHistoryPaused: {
      type: Boolean,
      default: false,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['user', 'creator', 'admin'],
      default: 'user',
    },
    // ── Feature 4: XP + Streak ────────────────────────────────────────────────
    xp: {
      type: Number,
      default: 0,
      min: 0,
    },
    streak: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastActiveDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.methods.isPasswordCorrect = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      role: this.role,
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ _id: this._id }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
};

module.exports = mongoose.model('User', userSchema);
