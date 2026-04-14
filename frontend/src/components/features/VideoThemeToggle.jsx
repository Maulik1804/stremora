import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Sun, Clapperboard } from 'lucide-react';
import { cycleVideoTheme, selectVideoTheme, THEMES } from '../../store/slices/themeSlice';

const THEME_META = {
  [THEMES.DEFAULT]: { icon: Sun,          label: 'Default', next: 'Cinema' },
  [THEMES.CINEMA]:  { icon: Clapperboard, label: 'Cinema',  next: 'Default' },
};

const VideoThemeToggle = () => {
  const dispatch = useDispatch();
  const theme = useSelector(selectVideoTheme);
  const { icon: Icon, label } = THEME_META[theme] ?? THEME_META[THEMES.DEFAULT];
  const isCinema = theme === THEMES.CINEMA;

  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={() => dispatch(cycleVideoTheme())}
      title={`Switch to ${THEME_META[theme]?.next} mode`}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
        ${isCinema
          ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
          : 'bg-white/5 text-[#999] hover:text-[#e0e0e0] border border-white/8 hover:bg-white/8'}`}
    >
      <Icon size={13} />
      {label}
    </motion.button>
  );
};

export default VideoThemeToggle;
