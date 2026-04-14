import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'streamora_focus_mode';

const loadFocus = () => {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
};

const focusSlice = createSlice({
  name: 'focus',
  initialState: {
    enabled: loadFocus(),
  },
  reducers: {
    toggleFocusMode(state) {
      state.enabled = !state.enabled;
      try { localStorage.setItem(STORAGE_KEY, String(state.enabled)); } catch { /* ignore */ }
    },
    setFocusMode(state, action) {
      state.enabled = action.payload;
      try { localStorage.setItem(STORAGE_KEY, String(state.enabled)); } catch { /* ignore */ }
    },
  },
});

export const { toggleFocusMode, setFocusMode } = focusSlice.actions;
export const selectFocusMode = (state) => state.focus.enabled;
export default focusSlice.reducer;
