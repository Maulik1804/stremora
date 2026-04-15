import api from './api';

// Upload-specific timeout: 10 minutes (finalization can take a while for large files)
const UPLOAD_TIMEOUT = 10 * 60 * 1000;
// Chunk timeout: 2 minutes per chunk
const CHUNK_TIMEOUT = 2 * 60 * 1000;

export const videoService = {
  getFeed: (cursor) => api.get('/videos', { params: { cursor } }),
  getTrending: () => api.get('/videos/trending'),
  getById: (id) => api.get(`/videos/${id}`),
  search: (params) => api.get('/videos/search', { params }),
  getSubscriptionFeed: (cursor) =>
    api.get('/videos/subscriptions/feed', { params: { cursor } }),

  // Creator's own videos — all statuses & visibilities (Studio / Dashboard)
  getMyVideos: () => api.get('/videos/mine'),

  // All public published videos for a specific channel page
  getChannelVideos: (userId, cursor) =>
    api.get(`/videos/channel/${userId}`, { params: { cursor } }),
  create: (formData, onUploadProgress) =>
    api.post('/videos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
      timeout: UPLOAD_TIMEOUT,
    }),

  // ── Chunked upload ──────────────────────────────────────────────────────────
  initChunkedUpload: (metadata) =>
    api.post('/videos/upload/init', metadata, { timeout: 15000 }),

  uploadChunk: (uploadSessionId, formData) =>
    api.post(`/videos/upload/${uploadSessionId}/chunk`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: CHUNK_TIMEOUT,
    }),

  // Finalize can take up to 10 minutes (Cloudinary upload of large file)
  finalizeChunkedUpload: (uploadSessionId) =>
    api.post(`/videos/upload/${uploadSessionId}/finalize`, {}, {
      timeout: UPLOAD_TIMEOUT,
    }),

  update: (id, data) => api.patch(`/videos/${id}`, data),
  delete: (id) => api.delete(`/videos/${id}`),
  recordView: (id) => api.post(`/videos/${id}/view`),
  uploadThumbnail: (id, formData) =>
    api.post(`/videos/${id}/thumbnail`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // 1 minute for thumbnail
    }),
};
