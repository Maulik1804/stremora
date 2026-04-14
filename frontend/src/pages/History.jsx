import { useRef, useEffect, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { History as HistoryIcon, Trash2, PauseCircle, PlayCircle, X } from 'lucide-react';
import VideoCard from '../components/video/VideoCard';
import VideoCardSkeleton from '../components/video/VideoCardSkeleton';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import { engagementService } from '../services/engagement.service';
import { formatDistanceToNow } from '../utils/date';

const History = () => {
  const queryClient = useQueryClient();
  const loaderRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading,
  } = useInfiniteQuery({
    queryKey: ['history'],
    queryFn: ({ pageParam }) =>
      engagementService.getHistory(pageParam).then((r) => r.data.data),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage) fetchNextPage(); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, fetchNextPage]);

  const deleteMutation = useMutation({
    mutationFn: (videoId) => engagementService.deleteHistoryEntry(videoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['history'] }),
  });

  const clearMutation = useMutation({
    mutationFn: () => engagementService.clearHistory(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      setShowClearConfirm(false);
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => engagementService.toggleHistoryPause(),
    onSuccess: () => setPaused((v) => !v),
  });

  const entries = data?.pages.flatMap((p) => p.history) ?? [];

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#272727] flex items-center justify-center">
            <HistoryIcon size={18} className="text-[#f1f1f1]" />
          </div>
          <h1 className="text-xl font-bold text-[#f1f1f1]">Watch history</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => pauseMutation.mutate()}
            loading={pauseMutation.isPending}
          >
            {paused ? <><PlayCircle size={14} /> Resume history</> : <><PauseCircle size={14} /> Pause history</>}
          </Button>
          {entries.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
            >
              <Trash2 size={14} />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Pause notice */}
      <AnimatePresence>
        {paused && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 p-3 bg-yellow-900/20 border border-yellow-800/40 rounded-xl text-sm text-yellow-400 flex items-center gap-2"
          >
            <PauseCircle size={15} />
            History is paused — new watches won't be recorded
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear confirm */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="mb-5 p-4 bg-[#1a1a1a] border border-[#3f3f3f] rounded-xl flex items-center justify-between gap-4"
          >
            <p className="text-sm text-[#f1f1f1]">Clear all watch history?</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowClearConfirm(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => clearMutation.mutate()} loading={clearMutation.isPending}>
                Clear all
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8">
          {Array.from({ length: 9 }).map((_, i) => <VideoCardSkeleton key={i} />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <HistoryIcon size={40} className="text-[#606060]" />
          <p className="text-[#f1f1f1] font-medium">No watch history</p>
          <p className="text-sm text-[#aaaaaa]">Videos you watch will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8">
          {entries.map((entry) => entry.video && (
            <div key={entry._id} className="relative group">
              <VideoCard video={entry.video} />
              {/* Watched time + remove button */}
              <div className="flex items-center justify-between mt-1 px-0.5">
                <span className="text-xs text-[#606060]">
                  Watched {formatDistanceToNow(entry.watchedAt)}
                </span>
                <button
                  onClick={() => deleteMutation.mutate(entry.video._id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[#606060] hover:text-red-400 p-1"
                  aria-label="Remove from history"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div ref={loaderRef} className="flex justify-center py-8">
        {isFetchingNextPage && <Spinner />}
      </div>
    </div>
  );
};

export default History;
