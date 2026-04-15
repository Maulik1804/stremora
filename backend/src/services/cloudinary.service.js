'use strict';

const fs = require('fs');
const cloudinary = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');
const { convertToMp4IfNeeded } = require('./video.convert.service');

// ── Upload presets / folder map ───────────────────────────────────────────────

const FOLDERS = {
  VIDEO: 'streamora/videos',
  THUMBNAIL: 'streamora/thumbnails',
  AVATAR: 'streamora/avatars',
  BANNER: 'streamora/banners',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Safely remove a temp file after upload (success or failure).
 * @param {string} filePath
 */
const cleanTemp = (filePath) => {
  if (!filePath) return;
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Non-fatal — OS will clean up temp dir eventually
  }
};

/**
 * Build a Cloudinary upload stream with progress tracking.
 * Returns a Promise that resolves with the upload result.
 *
 * @param {string} filePath - Local temp file path
 * @param {object} options  - Cloudinary uploader options
 * @param {Function} [onProgress] - Optional callback(percent: number)
 * @returns {Promise<object>} Cloudinary upload result
 */
const uploadWithProgress = (filePath, options, onProgress) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    if (onProgress) {
      uploadStream.on('progress', ({ percent }) => {
        onProgress(Math.round(percent || 0));
      });
    }

    fs.createReadStream(filePath).pipe(uploadStream);
  });
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Upload a video file to Cloudinary.
 * Automatically converts AVI/MKV/etc. to MP4 first (Cloudinary Free only accepts MP4/MOV/WebM).
 * NOTE: Cloudinary Free plan limit = 100 MB per video.
 *
 * @param {string} filePath - Local temp file path from multer
 * @param {object} [opts]
 * @param {string} [opts.folder]
 * @param {Function} [opts.onProgress] - Called with percent (0–100)
 * @returns {Promise<{ url: string, publicId: string, duration: number, thumbnailUrl: string }>}
 */
const uploadVideo = async (filePath, { folder = FOLDERS.VIDEO, onProgress } = {}) => {
  let pathToUpload = filePath;
  let wasConverted = false;

  try {
    // Convert to MP4 if the format isn't natively supported by Cloudinary
    const { outputPath, converted } = await convertToMp4IfNeeded(filePath);
    pathToUpload = outputPath;
    wasConverted = converted;

    console.log(`[Cloudinary] Uploading video: ${pathToUpload}`);

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder,
          eager: [
            {
              format: 'jpg',
              transformation: [{ start_offset: '0', quality: 'auto' }],
            },
          ],
          eager_async: false,
          timeout: 600000, // 10 minutes timeout
        },
        (error, result) => {
          if (error) {
            console.error('[Cloudinary] Upload stream error:', error.message);
            return reject(error);
          }
          console.log('[Cloudinary] Upload completed successfully');
          resolve(result);
        }
      );

      uploadStream.on('error', (err) => {
        console.error('[Cloudinary] Stream error:', err.message);
        reject(err);
      });

      uploadStream.on('abort', () => {
        console.error('[Cloudinary] Upload aborted');
        reject(new Error('Upload aborted'));
      });

      if (onProgress) {
        uploadStream.on('progress', ({ percent }) => {
          onProgress(Math.round(percent || 0));
        });
      }

      const fileStream = fs.createReadStream(pathToUpload, { highWaterMark: 1024 * 1024 });
      
      fileStream.on('error', (err) => {
        console.error('[Cloudinary] File read error:', err.message);
        uploadStream.destroy();
        reject(err);
      });

      fileStream.pipe(uploadStream);
    });

    const thumbnailUrl =
      result.eager?.[0]?.secure_url ||
      cloudinary.url(result.public_id, {
        resource_type: 'video',
        format: 'jpg',
        transformation: [{ start_offset: '0', quality: 'auto' }],
        secure: true,
      });

    console.log(`[Cloudinary] Video uploaded: ${result.public_id} (${(result.bytes / 1024 / 1024).toFixed(2)} MB)`);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      duration: Math.round(result.duration || 0),
      thumbnailUrl,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    };
  } catch (err) {
    console.error('[Cloudinary] Video upload error:', err.message);
    throw new ApiError(502, `Upload failed: ${err.message || 'video upload failed'}`);
  } finally {
    // Always clean up the original temp file
    cleanTemp(filePath);
    // Clean up the converted file if it's different from the original
    if (wasConverted && pathToUpload !== filePath) {
      cleanTemp(pathToUpload);
    }
  }
};

/**
 * Upload a thumbnail image to Cloudinary.
 * Applies auto quality + format optimisation and resizes to 1280×720.
 *
 * @param {string} filePath
 * @param {object} [opts]
 * @param {string} [opts.folder]
 * @param {Function} [opts.onProgress]
 * @returns {Promise<{ url: string, publicId: string }>}
 */
const uploadThumbnail = async (filePath, { folder = FOLDERS.THUMBNAIL, onProgress } = {}) => {
  try {
    const result = await uploadWithProgress(
      filePath,
      {
        resource_type: 'image',
        folder,
        transformation: [
          { width: 1280, height: 720, crop: 'fill', gravity: 'auto' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      onProgress
    );

    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    throw new ApiError(502, 'Media service unavailable: thumbnail upload failed');
  } finally {
    cleanTemp(filePath);
  }
};

/**
 * Upload a user avatar to Cloudinary.
 * Resizes to 400×400 square, face-aware crop.
 *
 * @param {string} filePath
 * @param {object} [opts]
 * @param {string} [opts.folder]
 * @param {Function} [opts.onProgress]
 * @returns {Promise<{ url: string, publicId: string }>}
 */
const uploadAvatar = async (filePath, { folder = FOLDERS.AVATAR, onProgress } = {}) => {
  try {
    const result = await uploadWithProgress(
      filePath,
      {
        resource_type: 'image',
        folder,
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      onProgress
    );

    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    throw new ApiError(502, 'Media service unavailable: avatar upload failed');
  } finally {
    cleanTemp(filePath);
  }
};

/**
 * Upload a channel banner / cover image to Cloudinary.
 * Resizes to 2560×1440 (YouTube banner standard), auto quality.
 *
 * @param {string} filePath
 * @param {object} [opts]
 * @param {string} [opts.folder]
 * @param {Function} [opts.onProgress]
 * @returns {Promise<{ url: string, publicId: string }>}
 */
const uploadBanner = async (filePath, { folder = FOLDERS.BANNER, onProgress } = {}) => {
  try {
    const result = await uploadWithProgress(
      filePath,
      {
        resource_type: 'image',
        folder,
        transformation: [
          { width: 2560, height: 1440, crop: 'fill', gravity: 'auto' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      onProgress
    );

    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    throw new ApiError(502, 'Media service unavailable: banner upload failed');
  } finally {
    cleanTemp(filePath);
  }
};

/**
 * Delete a Cloudinary asset by public ID.
 * Non-fatal — logs on failure but does not throw.
 *
 * @param {string} publicId
 * @param {'image'|'video'} [resourceType='image']
 * @returns {Promise<void>}
 */
const deleteAsset = async (publicId, resourceType = 'image') => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error(`[Cloudinary] Failed to delete asset ${publicId}:`, err.message);
  }
};

/**
 * Generate a signed Cloudinary URL for private/secure assets.
 *
 * @param {string} publicId
 * @param {'image'|'video'} [resourceType='image']
 * @param {number} [expiresInSeconds=3600]
 * @returns {string}
 */
const getSignedUrl = (publicId, resourceType = 'image', expiresInSeconds = 3600) => {
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    secure: true,
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
};

module.exports = {
  uploadVideo,
  uploadThumbnail,
  uploadAvatar,
  uploadBanner,
  deleteAsset,
  getSignedUrl,
  FOLDERS,
};
