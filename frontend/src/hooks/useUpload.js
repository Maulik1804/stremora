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

  // ── Direct Cloudinary upload (new approach) ──────────────────────────────

  const upload = useCallback(async (formValues) => {
    if (!videoFile) return;
    setStep(UPLOAD_STEPS.UPLOADING);
    setUploadProgress(0);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Step 1: Get signed upload credentials from our backend
      console.log('[Upload] Getting upload signature...');
      const sigRes = await videoService.getUploadSignature();
      const { signature, timestamp, folder, apiKey, cloudName } = sigRes.data.data;

      // Step 2: Upload video directly to Cloudinary from browser
      // This bypasses our tunnel entirely — goes straight to Cloudinary's CDN
      console.log(`[Upload] Uploading directly to Cloudinary (${(videoFile.size / 1024 / 1024).toFixed(1)} MB)...`);

      const formData = new FormData();
      formData.append('file', videoFile);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', folder);
      formData.append('resource_type', 'video');

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', cloudinaryUrl);

      // Track real upload progress
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 90);
          setUploadProgress(pct);
        }
      };

      // Handle abort
      controller.signal.addEventListener('abort', () => xhr.abort());

      const cloudinaryResult = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error?.message || `Cloudinary error ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.onabort = () => reject(new Error('Upload cancelled'));
        xhr.send(formData);
      });

      console.log('[Upload] Cloudinary upload complete:', cloudinaryResult.public_id);
      setUploadProgress(92);

      // Step 3: Upload thumbnail to Cloudinary if provided
      let thumbnailUrl = cloudinaryResult.eager?.[0]?.secure_url || '';

      if (thumbnailFile) {
        console.log('[Upload] Uploading thumbnail...');
        try {
          const thumbSigRes = await videoService.getUploadSignature('image');
          const thumbSig = thumbSigRes.data.data;

          const thumbFd = new FormData();
          thumbFd.append('file', thumbnailFile);
          thumbFd.append('api_key', thumbSig.apiKey);
          thumbFd.append('timestamp', thumbSig.timestamp);
          thumbFd.append('signature', thumbSig.signature);
          thumbFd.append('folder', thumbSig.folder);
          
          // Include transformation if provided by backend
          if (thumbSig.transformation) {
            thumbFd.append('transformation', thumbSig.transformation);
          }

          const thumbRes = await fetch(
            `https://api.cloudinary.com/v1_1/${thumbSig.cloudName}/image/upload`,
            { method: 'POST', body: thumbFd }
          );
          const thumbData = await thumbRes.json();
          
          if (!thumbRes.ok) {
            throw new Error(thumbData.error?.message || 'Thumbnail upload failed');
          }
          
          if (thumbData.secure_url) {
            thumbnailUrl = thumbData.secure_url;
            console.log('[Upload] Thumbnail uploaded:', thumbnailUrl);
          }
        } catch (thumbErr) {
          console.warn('[Upload] Thumbnail upload failed (non-fatal):', thumbErr.message);
          // Use auto-generated thumbnail from video
        }
      }

      setUploadProgress(96);

      // Step 4: Save metadata to our backend (tiny request, no file transfer)
      console.log('[Upload] Saving video metadata to backend...');
      const saveRes = await videoService.saveVideo({
        title: formValues.title,
        description: formValues.description || '',
        visibility: formValues.visibility,
        tags: formValues.tags || '',
        cloudinaryPublicId: cloudinaryResult.public_id,
        videoUrl: cloudinaryResult.secure_url,
        thumbnailUrl,
        duration: cloudinaryResult.duration || 0,
      });

      const savedVideo = saveRes.data.data.video;
      console.log('[Upload] Video saved:', savedVideo._id);

      setUploadProgress(100);
      setUploadedVideo(savedVideo);
      setStep(UPLOAD_STEPS.SUCCESS);
      console.log('[Upload] Upload completed successfully!');

    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.message === 'Upload cancelled') {
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
