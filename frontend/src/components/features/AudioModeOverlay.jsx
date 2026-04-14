import { motion } from 'framer-motion';
import { Music2 } from 'lucide-react';

/**
 * Feature 9: Shown over the player when audio-only mode is active.
 * Displays an animated waveform and the video title.
 */
const AudioModeOverlay = ({ title, thumbnailUrl }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="absolute inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center gap-6 z-10"
  >
    {/* Blurred thumbnail as background */}
    {thumbnailUrl && (
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url(${thumbnailUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(20px)',
        }}
      />
    )}

    <div className="relative flex flex-col items-center gap-4">
      <div className="w-20 h-20 rounded-full bg-[#ff0000]/15 border border-[#ff0000]/30 flex items-center justify-center">
        <Music2 size={36} className="text-[#ff0000]" />
      </div>

      {/* Animated waveform bars */}
      <div className="flex items-end gap-1 h-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="w-1.5 bg-[#ff0000]/70 rounded-full"
            animate={{ height: ['30%', '100%', '50%', '80%', '30%'] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.1,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <p className="text-sm font-medium text-[#f8f8f8] text-center max-w-xs px-4 line-clamp-2">
        {title}
      </p>
      <p className="text-xs text-[#606060]">Audio Only Mode</p>
    </div>
  </motion.div>
);

export default AudioModeOverlay;
