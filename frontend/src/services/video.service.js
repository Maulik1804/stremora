import api from './api';

export const videoService = {
  getFeed: (cursor) => api.get('/videos', { params: { cursor } }),
  getTrending: () => api.get('/videos/trending'),
  getById: (id) => api.get(`/videos/${id}`),
  search: (params) => api.get('/videos/search', { params }),
  getSubscriptionFeed: (cursor) =>
    api.get('/videos/subscriptions/feed', { params: { cursor } }),
  create: (formData, onUploadProgress) =>
    api.post('/videos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  update: (id, data) => api.patch(`/videos/${id}`, data),
  delete: (id) => api.delete(`/videos/${id}`),
  recordView: (id) => api.post(`/videos/${id}/view`),
  uploadThumbnail: (id, formData) =>
    api.post(`/videos/${id}/thumbnail`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
