import api from './api';

export const engagementService = {
  // Likes
  toggleReaction: (resourceType, resourceId, reaction) =>
    api.post('/likes', { resourceType, resourceId, reaction }),

  // Comments
  getComments:  (videoId, cursor, sort = 'date') =>
    api.get('/comments', { params: { videoId, cursor, sort } }),
  getReplies:   (commentId, cursor) =>
    api.get(`/comments/${commentId}/replies`, { params: { cursor } }),
  postComment:  (videoId, text, parentId) =>
    api.post('/comments', { videoId, text, ...(parentId ? { parentId } : {}) }),
  deleteComment:(id) => api.delete(`/comments/${id}`),
  likeComment:  (commentId, reaction) =>
    api.post('/likes', { resourceType: 'comment', resourceId: commentId, reaction }),

  // Subscriptions
  toggleSubscription: (channelId) => api.post(`/subscriptions/${channelId}`),
  getMySubscriptions: ()           => api.get('/subscriptions/me'),

  // Playlists
  getMyPlaylists:       ()              => api.get('/playlists/me'),
  createPlaylist:       (data)          => api.post('/playlists', data),
  addToPlaylist:        (id, videoId)   => api.post(`/playlists/${id}/videos`, { videoId }),
  removeFromPlaylist:   (id, videoId)   => api.delete(`/playlists/${id}/videos/${videoId}`),
  getPlaylist:          (id)            => api.get(`/playlists/${id}`),
  getCollaborativePlaylists: ()         => api.get('/playlists/collaborative'),
  addCollaborator:      (id, usernameOrEmail) => api.post(`/playlists/${id}/collaborators`, { usernameOrEmail }),
  removeCollaborator:   (id, userId)    => api.delete(`/playlists/${id}/collaborators/${userId}`),
  getCollaborators:     (id)            => api.get(`/playlists/${id}/collaborators`),

  // History
  getHistory:         (cursor) => api.get('/history', { params: { cursor } }),
  deleteHistoryEntry: (videoId) => api.delete(`/history/${videoId}`),
  clearHistory:       ()        => api.delete('/history'),
  toggleHistoryPause: ()        => api.patch('/history/pause'),

  // Notifications
  getNotifications:    (cursor) => api.get('/notifications', { params: { cursor } }),
  markRead:            (id)     => api.patch(`/notifications/${id}/read`),
  markAllRead:         ()       => api.patch('/notifications/read-all'),
};
