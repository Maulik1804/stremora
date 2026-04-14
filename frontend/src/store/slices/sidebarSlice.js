import { createSlice } from '@reduxjs/toolkit';

const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState: {
    isExpanded: true, // full sidebar vs icon-only
  },
  reducers: {
    toggleSidebar(state) {
      state.isExpanded = !state.isExpanded;
    },
    setSidebarExpanded(state, action) {
      state.isExpanded = action.payload;
    },
  },
});

export const { toggleSidebar, setSidebarExpanded } = sidebarSlice.actions;
export const selectSidebarExpanded = (state) => state.sidebar.isExpanded;
export default sidebarSlice.reducer;
