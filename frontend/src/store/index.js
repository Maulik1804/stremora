import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import sidebarReducer from './slices/sidebarSlice';
import themeReducer from './slices/themeSlice';
import focusReducer from './slices/focusSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    sidebar: sidebarReducer,
    theme: themeReducer,
    focus: focusReducer,
  },
});
