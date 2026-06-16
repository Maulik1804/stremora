import axios from 'axios';
import api from './api';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Plain axios instance for auth endpoints — no token-refresh interceptor.
// Login/register/logout 401s must reach the UI as-is (wrong password, etc.)
// and must never trigger a refresh attempt.
const authApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export const authService = {
  register: (data)  => authApi.post('/auth/register', data),
  login:    (data)  => authApi.post('/auth/login', data),
  logout:   ()      => {
    // Attach access token header if present in sessionStorage to help
    // backends that expect Authorization on logout. The refresh cookie
    // will still be sent via withCredentials.
    try {
      const token = sessionStorage.getItem('streamora_at');
      if (token) return authApi.post('/auth/logout', null, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      /* ignore */
    }
    return authApi.post('/auth/logout');
  },
  refresh:  ()      => authApi.post('/auth/refresh'),
  // /users/me goes through the intercepted instance so it can auto-refresh
  getMe:    ()      => api.get('/users/me'),
};
