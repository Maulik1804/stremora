import { motion } from 'framer-motion';
import { Music2 } from 'lucide-react';

/**
 * Feature 9: Shown over the player when audio-only mode is active.
 * Displays an animated waveform and the video title with professional styling.
 */
const AudioModeOverlay = ({ title, thumbnailUrl }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
    className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] via-[#0a0a0a] to-[#000000] flex flex-col items-center justify-center gap-8 z-0 pointer-events-none"
  >
    {/* Blurred thumbnail as background */}
    {thumbnailUrl && (
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `url(${thumbnailUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(30px)',
        }}
      />
    )}

    {/* Animated gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

    <div className="relative flex flex-col items-center gap-6 z-10">
      {/* Music icon with glow effect */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-[#ff0000]/20 rounded-full blur-2xl scale-150" />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#ff0000]/20 to-[#ff0000]/5 border border-[#ff0000]/40 flex items-center justify-center shadow-2xl">
          <Music2 size={44} className="text-[#ff0000]" />
        </div>
      </motion.div>

      {/* Animated waveform bars — more bars, smoother animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex items-end gap-1.5 h-12"
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <motion.div
            key={i}
            className="w-1 bg-gradient-to-t from-[#ff0000] to-[#ff0000]/60 rounded-full shadow-lg"
            animate={{ height: ['20%', '100%', '40%', '90%', '30%', '100%', '20%'] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              delay: i * 0.08,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>

      {/* Title with better typography */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="text-center max-w-md px-6"
      >
        <p className="text-lg font-bold text-white text-center line-clamp-2 mb-2">
          {title}
        </p>
        <p className="text-xs font-medium text-[#ff0000]/80 tracking-wide uppercase">
          🎵 Audio Only Mode
        </p>
      </motion.div>

      {/* Subtle hint text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="text-xs text-white/40 mt-2"
      >
        Timeline and controls are always visible
      </motion.p>
    </div>
  </motion.div>
);

export default AudioModeOverlay;
