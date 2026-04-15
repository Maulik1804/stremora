import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Clock, X, Bell } from 'lucide-react';
import { featuresService } from '../../services/features.service';
import { useAuth } from '../../hooks/useAuth';
import { formatDuration } from '../../utils/format';

const WatchLaterReminder = () => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['watch-later-reminders'],
    queryFn: () => featuresService.getWatchLaterReminders().then((r) => r.data.data),
    enabled: isAuthenticated,
    refetchInterval: 10 * 60 * 1000, // re-check every 10 min
  });

  const dismissMutation = useMutation({
    mutationFn: (videoId) => featuresService.dismissReminder(videoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watch-later-reminders'] }),
  });

  const reminders = data?.reminders ?? [];
  if (!reminders.length) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="mx-4 mb-4 bg-[#1e1e1e] border border-yellow-500/20 rounded-2xl p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Bell size={15} className="text-yellow-400" />
          <span className="text-sm font-semibold text-[#f8f8f8]">Watch Later Reminders</span>
          <span className="text-xs text-[#606060] ml-auto">Saved but not watched</span>
        </div>

        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {reminders.map((r) => (
            <div key={r._id} className="group relative flex-shrink-0 w-40">
              <Link to={`/watch/${r.video._id}`} className="block">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-[#272727] mb-2">
                  {r.video.thumbnailUrl && (
                    <img src={r.video.thumbnailUrl} alt={r.video.title} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-yellow-500/90 text-black text-[10px] px-1.5 py-0.5 rounded font-bold">
                    <Clock size={9} />
                    Watch Later
                  </div>
                </div>
                <p className="text-xs text-[#f8f8f8] line-clamp-2 leading-snug">{r.video.title}</p>
                {r.video.duration > 0 && (
                  <p className="text-[11px] text-[#606060] mt-0.5">{formatDuration(r.video.duration)}</p>
                )}
              </Link>
              {/* Dismiss button */}
              <button
                onClick={() => dismissMutation.mutate(r.video._id)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 rounded-full p-0.5 text-white"
                aria-label="Dismiss reminder"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WatchLaterReminder;
