import api from './api';

export const featuresService = {
  // Feature 1: Timestamp comments
  getTimestampComments: (videoId) =>
    api.get('/comments/timestamps', { params: { videoId } }),

  // Feature 2: Skip segments
  markSkipSegment: (videoId, start, end) =>
    api.post('/features/skip-segment', { videoId, start, end }),
  getSkipSegments: (videoId) =>
    api.get(`/features/skip-segments/${videoId}`),

  // Feature 3: Engagement
  trackEngagement: (videoId, eventType, timestamp) =>
    api.post('/features/engagement', { videoId, eventType, timestamp }),
  getEngagement: (videoId) =>
    api.get(`/features/engagement/${videoId}`),

  // Feature 4: XP
  awardXP: (action) => api.post('/features/xp', { action }),
  getXP: () => api.get('/features/xp'),

  // Feature 5: Random video
  getRandomVideo: () => api.get('/features/random-video'),

  // Feature 7: Smart playlists
  getSmartPlaylists: () => api.get('/features/smart-playlists'),

  // Feature 8: Watch Later reminders
  getWatchLaterReminders: () => api.get('/features/watch-later-reminders'),
  dismissReminder: (videoId) => api.patch(`/features/watch-later-reminders/${videoId}/dismiss`),
  addToWatchLater: (videoId) => api.post(`/features/watch-later/${videoId}`),

  // Feature 10: Continue watching
  saveProgress: (videoId, progressSeconds) =>
    api.post('/features/progress', { videoId, progressSeconds }),
  getContinueWatching: () => api.get('/features/continue-watching'),

  // Feature 11: Real-time trending
  getTrendingRealtime: (hours = 2, limit = 20) =>
    api.get('/features/trending-realtime', { params: { hours, limit } }),

  // Feature 12: Pinned comment
  getPinnedComment: (videoId) =>
    api.get(`/features/pinned-comment/${videoId}`),

  // Feature 14: Search inside video
  setKeywords: (videoId, keywords) =>
    api.put(`/features/keywords/${videoId}`, { keywords }),
  searchKeywords: (videoId, q) =>
    api.get(`/features/keywords/${videoId}`, { params: { q } }),
};
