import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, TrendingUp, Music, Gamepad2, Newspaper, Trophy, BookOpen, Shirt, Radio, Mic2 } from 'lucide-react';
import VideoGrid from '../components/video/VideoGrid';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import ContinueWatching from '../components/features/ContinueWatching';
import WatchLaterReminder from '../components/features/WatchLaterReminder';
import SmartPlaylists from '../components/features/SmartPlaylists';
import TrendingRealtime from '../components/features/TrendingRealtime';
import GoalWidget from '../components/features/GoalWidget';
import { videoService } from '../services/video.service';

const CATEGORIES = [
  { label: 'All',       icon: null },
  { label: 'Trending',  icon: TrendingUp },
  { label: 'Music',     icon: Music },
  { label: 'Gaming',    icon: Gamepad2 },
  { label: 'News',      icon: Newspaper },
  { label: 'Sports',    icon: Trophy },
  { label: 'Learning',  icon: BookOpen },
  { label: 'Fashion',   icon: Shirt },
  { label: 'Podcasts',  icon: Mic2 },
  { label: 'Live',      icon: Radio },
];

const Home = () => {
  const loaderRef = useRef(null);
  const [activeCategory, setActiveCategory] = useState('All');

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage,
    isLoading, isError, refetch,
  } = useInfiniteQuery({
    queryKey: ['feed', activeCategory],
    queryFn: ({ pageParam }) => videoService.getFeed(pageParam).then((r) => r.data.data),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
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

  const videos = data?.pages.flatMap((p) => p.videos) ?? [];

  return (
    <div className="flex flex-col">
      {/* ── Category chips ── */}
      <div className="sticky top-14 z-30 navbar-blur">
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
          {CATEGORIES.map(({ label, icon: Icon }, i) => {
            const active = activeCategory === label;
            return (
              <motion.button
                key={label}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => setActiveCategory(label)}
                className={`
                  flex items-center gap-1.5 flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium
                  transition-all duration-200
                  ${active
                    ? 'chip-active'
                    : 'bg-[#1a1a1a] text-[#888] hover:bg-[#222] hover:text-[#e0e0e0] border border-white/5'}
                `}
              >
                {Icon && <Icon size={12} className={active ? 'text-[#080808]' : ''} />}
                {label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 py-6 max-w-screen-2xl mx-auto w-full">
        <WatchLaterReminder />
        <GoalWidget />
        <TrendingRealtime hours={2} />
        <ContinueWatching />

        <AnimatePresence mode="wait">
          {isError ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ErrorState title="Failed to load videos" description="Check your connection and try again." onRetry={refetch} />
            </motion.div>
          ) : (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <VideoGrid videos={videos} isLoading={isLoading} />

              {!isLoading && videos.length === 0 && (
                <EmptyState icon={Play} title="No videos yet" description="Be the first to upload content to Streamora." />
              )}

              <div ref={loaderRef} className="flex justify-center py-10">
                {isFetchingNextPage && <Spinner />}
              </div>

              {!isLoading && !hasNextPage && videos.length > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-[#444] text-sm pb-8 flex items-center justify-center gap-2"
                >
                  <span className="w-12 h-px bg-white/8" />
                  You're all caught up
                  <span className="w-12 h-px bg-white/8" />
                </motion.p>
              )}

              {!isLoading && videos.length > 0 && <SmartPlaylists />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Home;
