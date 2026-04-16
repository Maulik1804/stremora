import { createSlice } from '@reduxjs/toolkit';

const focusSlice = createSlice({
  name: 'focus',
  initialState: {
    enabled: false,   // always start disabled; only active during a watch session
  },
  reducers: {
    toggleFocusMode(state) {
      state.enabled = !state.enabled;
    },
    setFocusMode(state, action) {
      state.enabled = action.payload;
    },
  },
});

export const { toggleFocusMode, setFocusMode } = focusSlice.actions;
export const selectFocusMode = (state) => state.focus.enabled;
export default focusSlice.reducer;
