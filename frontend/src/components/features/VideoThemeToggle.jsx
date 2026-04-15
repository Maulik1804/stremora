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
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.03 }}
      onClick={() => dispatch(cycleVideoTheme())}
      title={`Switch to ${THEME_META[theme]?.next} mode`}
      className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold
        transition-all duration-200 select-none outline-none focus-visible:ring-2 focus-visible:ring-white/20
        ${isCinema
          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/35 shadow-[0_0_12px_rgba(99,102,241,0.18)]'
          : 'bg-white/6 text-[#999] hover:text-[#ddd] border border-white/10 hover:bg-white/10 hover:border-white/16'
        }`}
    >
      <motion.span
        key={theme}
        initial={{ opacity: 0, rotate: -15, scale: 0.7 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex items-center"
      >
        <Icon size={13} />
      </motion.span>

      <motion.span
        key={`label-${theme}`}
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        {label}
      </motion.span>

      {isCinema && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]"
        />
      )}
    </motion.button>
  );
};

export default VideoThemeToggle;
