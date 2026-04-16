import api from './api';

export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getVideos: (params) => api.get('/admin/videos', { params }),
  getVideosByUser: (params) => api.get('/admin/videos/by-user', { params }),
  getDeletedVideos: (params) => api.get('/admin/videos/deleted', { params }),
  deleteVideo: (id) => api.delete(`/admin/videos/${id}`),
  getUsers: (params) => api.get('/admin/users', { params }),
  suspendUser: (id) => api.patch(`/admin/users/${id}/suspend`),
  changeRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};
