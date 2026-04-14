import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';
import { featuresService } from '../../services/features.service';
import Avatar from '../ui/Avatar';
import { formatDuration } from '../../utils/format';

/**
 * Feature 1: Timestamp comments panel.
 * Shows all comments that have a timestamp, sorted by time.
 * Clicking a comment seeks the video to that timestamp.
 */
const TimestampComments = ({ videoId, onSeek, currentTime = 0 }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['timestamp-comments', videoId],
    queryFn: () => featuresService.getTimestampComments(videoId).then((r) => r.data.data),
    staleTime: 30_000,
    enabled: !!videoId,
  });

  const comments = data?.comments ?? [];
  if (!isLoading && comments.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={15} className="text-[#a0a0a0]" />
        <h4 className="text-sm font-semibold text-[#f8f8f8]">
          Timestamp Comments ({comments.length})
        </h4>
      </div>

      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1 scrollbar-none">
        <AnimatePresence>
          {comments.map((c) => {
            const isNear = Math.abs((c.timestamp ?? 0) - currentTime) < 3;
            return (
              <motion.button
                key={c._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                onClick={() => onSeek?.(c.timestamp)}
                className={`flex items-start gap-3 text-left p-2.5 rounded-xl transition-all
                  ${isNear
                    ? 'bg-[#ff0000]/10 border border-[#ff0000]/30'
                    : 'bg-white/3 hover:bg-white/6 border border-transparent'}`}
              >
                {/* Timestamp badge */}
                <span className="flex-shrink-0 text-xs font-mono font-bold text-[#ff0000] bg-[#ff0000]/10 px-2 py-1 rounded-lg min-w-[52px] text-center">
                  {formatDuration(c.timestamp ?? 0)}
                </span>

                <div className="flex items-start gap-2 min-w-0">
                  <Avatar src={c.author?.avatar} alt={c.author?.displayName || ''} size="xs" className="flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-[#a0a0a0]">
                      {c.author?.displayName || c.author?.username}
                    </span>
                    <p className="text-xs text-[#f8f8f8] line-clamp-2 mt-0.5">{c.text}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TimestampComments;
