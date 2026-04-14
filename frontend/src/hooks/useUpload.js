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

  // ── Upload ────────────────────────────────────────────────────────────────

  const upload = useCallback(async (formValues) => {
    if (!videoFile) return;
    setStep(UPLOAD_STEPS.UPLOADING);
    setUploadProgress(0);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const fd = new FormData();
      fd.append('video', videoFile);
      fd.append('title', formValues.title);
      fd.append('description', formValues.description || '');
      fd.append('visibility', formValues.visibility);
      if (formValues.tags) fd.append('tags', formValues.tags);

      const { data } = await videoService.create(fd, (evt) => {
        if (evt.total) {
          setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      });

      const createdVideo = data.data.video;
      setUploadedVideo(createdVideo);

      // Upload custom thumbnail if provided
      if (thumbnailFile && createdVideo._id) {
        const tfd = new FormData();
        tfd.append('thumbnail', thumbnailFile);
        await videoService.uploadThumbnail(createdVideo._id, tfd);
      }

      setStep(UPLOAD_STEPS.SUCCESS);
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      const msg = err.response?.data?.message || err.message || 'Upload failed. Please try again.';
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
