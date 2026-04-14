import api from './api';

export const userService = {
  getChannel:   (username) => api.get(`/users/${username}`),
  getMe:        ()         => api.get('/users/me'),
  updateProfile:(data)     => api.patch('/users/me', data),
  changePassword:(data)    => api.patch('/users/me/password', data),
  uploadAvatar: (formData) =>
    api.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadBanner: (formData) =>
    api.post('/users/me/banner', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  removeAvatar: () => api.delete('/users/me/avatar'),
  removeBanner: () => api.delete('/users/me/banner'),
};
