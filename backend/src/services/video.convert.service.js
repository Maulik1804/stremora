'use strict';

const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const path = require('path');
const os = require('os');
const fs = require('fs');

// Point fluent-ffmpeg at the bundled binary
ffmpeg.setFfmpegPath(ffmpegPath);

// Formats Cloudinary Free plan accepts directly
const CLOUDINARY_NATIVE_EXTS = new Set(['.mp4', '.mov', '.webm', '.m4v']);

/**
 * Convert a video file to MP4 (H.264 + AAC) if Cloudinary won't accept it natively.
 * Returns the path to use for upload (original if no conversion needed, temp MP4 otherwise).
 *
 * @param {string} inputPath - Path to the uploaded temp file
 * @returns {Promise<{ outputPath: string, converted: boolean }>}
 */
const convertToMp4IfNeeded = (inputPath) => {
  const ext = path.extname(inputPath).toLowerCase();

  // Already a format Cloudinary accepts — skip conversion
  if (CLOUDINARY_NATIVE_EXTS.has(ext)) {
    return Promise.resolve({ outputPath: inputPath, converted: false });
  }

  const outputPath = path.join(
    os.tmpdir(),
    `${Date.now()}-${Math.round(Math.random() * 1e9)}-converted.mp4`
  );

  console.log(`[ffmpeg] Converting ${ext} → .mp4: ${path.basename(inputPath)}`);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',   // H.264 video codec
        '-preset fast',   // fast encoding, reasonable quality
        '-crf 23',        // quality (18=best, 28=worst; 23 is default)
        '-c:a aac',       // AAC audio codec
        '-b:a 128k',      // audio bitrate
        '-movflags +faststart', // web-optimised MP4
        '-y',             // overwrite output if exists
      ])
      .output(outputPath)
      .on('start', (cmd) => console.log('[ffmpeg] Command:', cmd))
      .on('progress', (p) => {
        if (p.percent) process.stdout.write(`\r[ffmpeg] Progress: ${Math.round(p.percent)}%`);
      })
      .on('end', () => {
        process.stdout.write('\n');
        console.log('[ffmpeg] Conversion complete:', outputPath);
        resolve({ outputPath, converted: true });
      })
      .on('error', (err) => {
        console.error('[ffmpeg] Conversion error:', err.message);
        // Clean up failed output
        try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
        reject(err);
      })
      .run();
  });
};

module.exports = { convertToMp4IfNeeded };
