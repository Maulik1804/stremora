import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/auth.service';

// ── Session storage helpers ───────────────────────────────────────────────────
// We persist the access token in sessionStorage so it survives hard refreshes
// within the same browser tab. The refresh token lives in an HTTP-only cookie
// managed by the backend — we never touch it from JS.

const TOKEN_KEY = 'streamora_at';

const saveToken = (token) => {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* storage unavailable */ }
};

const loadToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
};

// ── Async thunks ──────────────────────────────────────────────────────────────

/**
 * Called on every app mount.
 * 1. Reads any cached access token from sessionStorage.
 * 2. Calls GET /users/me — if the token is still valid, returns the user.
 * 3. If /users/me returns 401, the Axios interceptor in api.js automatically
 *    calls POST /auth/refresh (using the HTTP-only cookie) and retries.
 *    If refresh also fails, the interceptor dispatches `logout` and this
 *    thunk rejects — which sets initialized = true with no user.
 */
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    // If there's no cached token, skip the network call entirely —
    // the user is not logged in and there's nothing to restore.
    const cachedToken = loadToken();
    if (!cachedToken) {
      return rejectWithValue(null);
    }

    try {
      const { data } = await authService.getMe();
      // Token may have been refreshed by the interceptor — read the latest from storage
      const currentToken = loadToken();
      return { user: data.data.user, accessToken: currentToken };
    } catch {
      saveToken(null);
      return rejectWithValue(null);
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await authService.login(credentials);
      return data.data; // { user, accessToken }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Invalid email or password'
      );
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const { data } = await authService.register(userData);
      return data.data; // { user, accessToken }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Registration failed. Please try again.'
      );
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
    } catch {
      // Even if the server call fails, clear local state
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: loadToken(), // hydrate from sessionStorage on first load
    status: 'idle',           // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    initialized: false,       // true once the first auth check completes
  },
  reducers: {
    /** Called by the Axios interceptor after a silent token refresh */
    setCredentials(state, action) {
      const { user, accessToken } = action.payload;
      if (user !== undefined) state.user = user;
      if (accessToken !== undefined) {
        state.accessToken = accessToken;
        saveToken(accessToken);
      }
    },
    /** Called by the Axios interceptor when refresh fails */
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.status = 'idle';
      state.error = null;
      saveToken(null);
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ── initializeAuth ────────────────────────────────────────────────────────
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.user = action.payload.user;
        // Keep the token that was already in state (set by interceptor if refreshed)
        if (action.payload.accessToken) {
          state.accessToken = action.payload.accessToken;
        }
        state.status = 'succeeded';
        state.initialized = true;
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
        state.status = 'idle';
        state.initialized = true;
        saveToken(null);
      });

    // ── loginUser ─────────────────────────────────────────────────────────────
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.initialized = true;
        saveToken(action.payload.accessToken);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // ── registerUser ──────────────────────────────────────────────────────────
    builder
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.initialized = true;
        saveToken(action.payload.accessToken);
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // ── logoutUser ────────────────────────────────────────────────────────────
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.accessToken = null;
      state.status = 'idle';
      state.initialized = true;
      saveToken(null);
    });
  },
});

export const { setCredentials, logout, clearError } = authSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectCurrentUser      = (state) => state.auth.user;
export const selectAccessToken      = (state) => state.auth.accessToken;
export const selectIsAuthenticated  = (state) => !!state.auth.user;
export const selectAuthStatus       = (state) => state.auth.status;
export const selectAuthError        = (state) => state.auth.error;
export const selectAuthInitialized  = (state) => state.auth.initialized;

export default authSlice.reducer;
