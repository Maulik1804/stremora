import { useState, useRef, useCallback } from 'react';
import { videoService } from '../services/video.service';

// ── All known MIME types browsers/OS may report for each format ───────────────
const ACCEPTED_VIDEO_MIMES = new Set([
  'video/mp4',
  'video/mpeg',
  // MOV
  'video/quicktime',
  // AVI — Windows reports any of these
  'video/avi',
  'video/msvideo',
  'video/x-msvideo',
  'video/x-avi',
  // MKV
  'video/x-matroska',
  'video/mkv',
  // Generic fallback
  'video/x-ms-wmv',
  'application/octet-stream', // some browsers report this for unknown types
]);

// Accepted by file extension (fallback when MIME is unreliable)
const ACCEPTED_VIDEO_EXTS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.mpeg', '.mpg']);

const ACCEPTED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Cloudinary Free plan: 100 MB max video, 5 MB max image
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;   // 5 MB

export const UPLOAD_STEPS = {
  SELECT: 'select',
  DETAILS: 'details',
  UPLOADING: 'uploading',
  SUCCESS: 'success',
  ERROR: 'error',
};

export const useUpload = () => {
  const [step, setStep] = useState(UPLOAD_STEPS.SELECT);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [error, setError] = useState(null);
  const [fileError, setFileError] = useState(null);
  const abortRef = useRef(null);

  // ── File validation ───────────────────────────────────────────────────────

  const validateVideo = useCallback((file) => {
    // Get extension from filename
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const mimeOk = ACCEPTED_VIDEO_MIMES.has(file.type);
    const extOk = ACCEPTED_VIDEO_EXTS.has(ext);

    // Accept if EITHER mime OR extension matches (browsers are inconsistent)
    if (!mimeOk && !extOk) {
      return `Unsupported file type "${file.type || ext}". Accepted: MP4, MOV, AVI, MKV`;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      return `File is too large (${(file.size / 1024 / 1024).toFixed(0)} MB). Maximum is 100 MB.`;
    }
    return null;
  }, []);

  const validateImage = useCallback((file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const mimeOk = ACCEPTED_IMAGE_MIMES.has(file.type);
    const extOk = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
    if (!mimeOk && !extOk) {
      return 'Invalid image type. Accepted: JPEG, PNG, WebP, GIF';
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return 'Image exceeds 5 MB limit';
    }
    return null;
  }, []);

  // ── File selection ────────────────────────────────────────────────────────

  const selectVideo = useCallback((file) => {
    const err = validateVideo(file);
    if (err) { setFileError(err); return false; }
    setFileError(null);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setStep(UPLOAD_STEPS.DETAILS);
    return true;
  }, [validateVideo]);

  const selectThumbnail = useCallback((file) => {
    const err = validateImage(file);
    if (err) { setFileError(err); return false; }
    setFileError(null);
    setThumbnailFile(file);
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailPreview(URL.createObjectURL(file));
    return true;
  }, [validateImage, thumbnailPreview]);

  const removeThumbnail = useCallback(() => {
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailFile(null);
    setThumbnailPreview(null);
  }, [thumbnailPreview]);

  // ── Upload with chunking ─────────────────────────────────────────────────

  const upload = useCallback(async (formValues) => {
    if (!videoFile) return;
    setStep(UPLOAD_STEPS.UPLOADING);
    setUploadProgress(0);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Chunk size: 5MB for faster uploads
      const CHUNK_SIZE = 5 * 1024 * 1024;
      const totalChunks = Math.ceil(videoFile.size / CHUNK_SIZE);
      let uploadedBytes = 0;

      console.log(`[Upload] Starting chunked upload: ${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(2)} MB, ${totalChunks} chunks)`);

      // Step 1: Initialize upload session
      console.log('[Upload] Initializing upload session...');
      const initRes = await videoService.initChunkedUpload({
        fileName: videoFile.name,
        fileSize: videoFile.size,
        title: formValues.title,
        description: formValues.description || '',
        visibility: formValues.visibility,
        tags: formValues.tags || '',
      });

      const uploadSessionId = initRes.data.data.uploadSessionId;
      console.log(`[Upload] Session initialized: ${uploadSessionId}`);

      // Step 2: Upload chunks
      console.log(`[Upload] Uploading ${totalChunks} chunks...`);
      for (let i = 0; i < totalChunks; i++) {
        if (controller.signal.aborted) throw new Error('Upload cancelled');

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, videoFile.size);
        const chunk = videoFile.slice(start, end);

        const chunkFd = new FormData();
        chunkFd.append('chunk', chunk);
        chunkFd.append('chunkIndex', i);
        chunkFd.append('totalChunks', totalChunks);

        try {
          await videoService.uploadChunk(uploadSessionId, chunkFd);
        } catch (chunkErr) {
          console.error(`[Upload] Chunk ${i} failed:`, chunkErr.message);
          
          // Check if it's an auth error (token expired)
          if (chunkErr.response?.status === 401) {
            throw new Error('Your session has expired. Please log in again and retry the upload.');
          }
          
          throw new Error(`Failed to upload chunk ${i + 1} of ${totalChunks}: ${chunkErr.response?.data?.message || chunkErr.message}`);
        }

        uploadedBytes += chunk.size;
        // Show 0-90% progress during chunk upload
        const progress = Math.round((uploadedBytes / videoFile.size) * 90);
        setUploadProgress(progress);
        console.log(`[Upload] Progress: ${progress}% (${i + 1}/${totalChunks} chunks)`);
      }

      // Step 3: Trigger finalize (fire-and-forget — don't wait for response)
      // The tunnel/proxy may timeout but the backend will still process it
      console.log('[Upload] Triggering finalize (fire-and-forget)...');
      setUploadProgress(92);

      let createdVideoId = null;

      try {
        // Try with a short timeout — if it succeeds great, if it 504s we still poll
        const finalRes = await Promise.race([
          videoService.finalizeChunkedUpload(uploadSessionId),
          new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 15000)),
        ]);
        createdVideoId = finalRes.data.data.video?._id;
        console.log(`[Upload] Finalize responded: video ${createdVideoId}`);
      } catch (finalizeErr) {
        // 504 or timeout — backend is still processing, we poll by session
        console.log('[Upload] Finalize timed out (expected) — polling for video...');
      }

      setUploadProgress(95);

      // Upload custom thumbnail if we already have the video ID
      if (thumbnailFile && createdVideoId) {
        try {
          const tfd = new FormData();
          tfd.append('thumbnail', thumbnailFile);
          await videoService.uploadThumbnail(createdVideoId, tfd);
          console.log('[Upload] Thumbnail uploaded');
        } catch (thumbErr) {
          console.warn('[Upload] Thumbnail upload failed (non-fatal):', thumbErr.message);
        }
      }

      // Poll for the video to appear and become published
      // Works whether finalize responded or timed out
      console.log('[Upload] Polling for published video...');
      let publishedVideo = null;
      const maxAttempts = 72; // poll every 5s for up to 6 minutes

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((r) => setTimeout(r, 5000));
        if (controller.signal.aborted) throw new Error('Upload cancelled');

        try {
          let v = null;

          if (createdVideoId) {
            // We know the video ID — poll it directly
            const res = await videoService.getById(createdVideoId);
            v = res.data.data.video;
          } else {
            // We don't have the ID yet — poll the session status endpoint
            const res = await videoService.getUploadStatus(uploadSessionId);
            v = res.data.data.video;
            if (v?._id) createdVideoId = v._id;
          }

          console.log(`[Upload] Poll ${attempt + 1}: status = ${v?.status}`);

          if (v?.status === 'published') {
            publishedVideo = v;
            // Upload thumbnail now if we didn't before
            if (thumbnailFile && !publishedVideo.thumbnailPublicId) {
              try {
                const tfd = new FormData();
                tfd.append('thumbnail', thumbnailFile);
                await videoService.uploadThumbnail(publishedVideo._id, tfd);
              } catch { /* non-fatal */ }
            }
            break;
          }
          if (v?.status === 'failed') {
            throw new Error('Video processing failed. Please try uploading again.');
          }
        } catch (pollErr) {
          if (pollErr.message.includes('processing failed')) throw pollErr;
          console.warn(`[Upload] Poll ${attempt + 1} error (retrying):`, pollErr.message);
        }

        // Progress 95 → 99 during processing
        setUploadProgress(Math.min(99, 95 + Math.floor((attempt / maxAttempts) * 4)));
      }

      if (!publishedVideo) {
        throw new Error('Video is taking longer than expected. Check your Studio — it may have uploaded successfully.');
      }

      setUploadProgress(100);
      setUploadedVideo(publishedVideo);
      setStep(UPLOAD_STEPS.SUCCESS);
      console.log('[Upload] Upload completed successfully');
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        console.log('[Upload] Upload cancelled by user');
        return;
      }
      const msg = err.message || 'Upload failed. Please try again.';
      console.error('[Upload] Error:', msg);
      setError(msg);
      setStep(UPLOAD_STEPS.ERROR);
    }
  }, [videoFile, thumbnailFile]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    reset();
  }, []);

  const reset = useCallback(() => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setStep(UPLOAD_STEPS.SELECT);
    setVideoFile(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setVideoPreview(null);
    setUploadProgress(0);
    setUploadedVideo(null);
    setError(null);
    setFileError(null);
  }, [videoPreview, thumbnailPreview]);

  return {
    step, videoFile, thumbnailFile, thumbnailPreview, videoPreview,
    uploadProgress, uploadedVideo, error, fileError,
    selectVideo, selectThumbnail, removeThumbnail,
    upload, cancel, reset,
  };
};
