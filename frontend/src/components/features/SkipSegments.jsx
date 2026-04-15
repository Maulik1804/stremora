import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { FastForward } from 'lucide-react';
import { featuresService } from '../../services/features.service';
import { useAuth } from '../../hooks/useAuth';

const SKIP_THRESHOLD = 1; // show "Skip" button if segment count >= this

/**
 * Feature 2: Skip segments overlay.
 * - Renders colored markers on the timeline
 * - Shows "Skip Intro" button when currentTime is inside a skip segment
 */
const SkipSegments = ({ videoId, duration, currentTime, onSeek }) => {
  const { isAuthenticated } = useAuth();

  const { data } = useQuery({
    queryKey: ['skip-segments', videoId],
    queryFn: () => featuresService.getSkipSegments(videoId).then((r) => r.data.data),
    enabled: !!videoId,
  });

  const segments = data?.segments ?? [];

  // Find if currentTime is inside any skip segment
  const activeSegment = segments.find(
    (s) => currentTime >= s.start && currentTime < s.end && s.count >= SKIP_THRESHOLD
  );

  return (
    <>
      {/* Timeline markers */}
      {duration > 0 && segments.map((seg, i) => {
        const leftPct = (seg.start / duration) * 100;
        const widthPct = ((seg.end - seg.start) / duration) * 100;
        return (
          <div
            key={i}
            className="absolute top-0 bottom-0 bg-yellow-400/40 rounded-sm pointer-events-none"
            style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 0.5)}%` }}
            title={`Skip segment (${seg.count} users)`}
          />
        );
      })}

      {/* Skip Intro button */}
      <AnimatePresence>
        {activeSegment && (
          <motion.button
            key="skip-btn"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            onClick={() => onSeek?.(activeSegment.end)}
            className="absolute bottom-16 right-4 flex items-center gap-2 bg-[#1a1a1a]/90 backdrop-blur-sm border border-white/20 text-[#f8f8f8] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#272727] transition-colors shadow-xl"
          >
            <FastForward size={15} />
            Skip Intro
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};

export default SkipSegments;
