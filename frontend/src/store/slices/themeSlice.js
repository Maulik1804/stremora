import { createSlice } from '@reduxjs/toolkit';

export const THEMES = {
  DEFAULT: 'default', // standard dark
  CINEMA:  'cinema',  // pitch black, dimmed surroundings
};

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    videoTheme: THEMES.DEFAULT,
  },
  reducers: {
    setVideoTheme(state, action) {
      state.videoTheme = action.payload;
    },
    cycleVideoTheme(state) {
      state.videoTheme =
        state.videoTheme === THEMES.DEFAULT ? THEMES.CINEMA : THEMES.DEFAULT;
    },
  },
});

export const { setVideoTheme, cycleVideoTheme } = themeSlice.actions;
export const selectVideoTheme = (state) => state.theme.videoTheme;
export default themeSlice.reducer;
