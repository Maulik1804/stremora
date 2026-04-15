import { createSlice } from '@reduxjs/toolkit';

const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState: {
    isExpanded: true,    // desktop: full vs icon-only
    mobileOpen: false,   // mobile: drawer open/closed
  },
  reducers: {
    toggleSidebar(state) {
      state.isExpanded = !state.isExpanded;
    },
    setSidebarExpanded(state, action) {
      state.isExpanded = action.payload;
    },
    toggleMobileSidebar(state) {
      state.mobileOpen = !state.mobileOpen;
    },
    setMobileSidebarOpen(state, action) {
      state.mobileOpen = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarExpanded,
  toggleMobileSidebar,
  setMobileSidebarOpen,
} = sidebarSlice.actions;

export const selectSidebarExpanded = (state) => state.sidebar.isExpanded;
export const selectMobileSidebarOpen = (state) => state.sidebar.mobileOpen;

export default sidebarSlice.reducer;
