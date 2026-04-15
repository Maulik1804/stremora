import axios from 'axios';
import { store } from '../store';
import { setCredentials, logout } from '../store/slices/authSlice';

// ── Base URL ──────────────────────────────────────────────────────────────────
// In production (Netlify): do NOT set VITE_API_BASE_URL in the Netlify dashboard.
//   The app falls back to relative /api/v1 and Netlify's proxy (netlify.toml)
//   forwards /api/* to the Cloudflare tunnel — same-origin, no cookie issues.
//
// In local dev: set VITE_API_BASE_URL in frontend/.env to the tunnel URL.
//   NODE_ENV=production on the backend ensures sameSite:'none' + secure:true
//   so cross-site cookies still work.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // always send cookies (needed for refresh token)
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30 s default — upload calls set their own longer timeouts
});

// ── Request interceptor — attach access token ─────────────────────────────────
api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — silent token refresh on 401 ───────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh for 401s that haven't already been retried.
    // Skip ALL /auth/* endpoints — login failures, register failures, etc.
    // should never trigger a token refresh attempt.
    const isAuthCall = originalRequest.url?.includes('/auth/');
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthCall) {
      if (isRefreshing) {
        // Queue this request until the in-flight refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log('[Auth] Access token expired, refreshing...');
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true, timeout: 30000 }
        );
        const newToken = data.data.accessToken;
        console.log('[Auth] Token refreshed successfully');
        store.dispatch(setCredentials({ accessToken: newToken }));
        try { sessionStorage.setItem('streamora_at', newToken); } catch { /* ignore */ }
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('[Auth] Token refresh failed:', refreshError.message);
        processQueue(refreshError, null);
        // Only force logout if the user was previously authenticated
        if (store.getState().auth.user) {
          console.log('[Auth] Session expired — logging out');
          store.dispatch(logout());
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
