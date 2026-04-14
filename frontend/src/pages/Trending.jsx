import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Flame, Music, Gamepad2, Newspaper, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import VideoCard from '../components/video/VideoCard';
import VideoCardSkeleton from '../components/video/VideoCardSkeleton';
import { videoService } from '../services/video.service';
import { formatCount, formatDuration } from '../utils/format';
import { formatDistanceToNow } from '../utils/date';

const TABS = [
  { id: 'now',    label: 'Trending',  icon: Flame },
  { id: 'music',  label: 'Music',     icon: Music },
  { id: 'gaming', label: 'Gaming',    icon: Gamepad2 },
  { id: 'news',   label: 'News',      icon: Newspaper },
  { id: 'sports', label: 'Sports',    icon: Trophy },
];

// ── Featured hero card ────────────────────────────────────────────────────────
const HeroCard = ({ video, rank }) => {
  const [hovered, setHovered] = useState(false);
  if (!video) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative rounded-2xl overflow-hidden aspect-video md:aspect-[21/9] bg-[#111] group cursor-pointer mb-10"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link to={`/watch/${video._id}`}>
        {video.thumbnailUrl && (
          <motion.img
            src={video.thumbnailUrl} alt={video.title}
            animate={{ scale: hovered ? 1.04 : 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full h-full object-cover"
          />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 p-6 md:p-10 flex items-end gap-6">
          <span className="rank-badge hidden md:block" style={{ fontSize: '6rem' }}>#{rank}</span>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-[#e50914] bg-[#e50914]/15 border border-[#e50914]/30 px-2.5 py-1 rounded-full">
                <Flame size={11} /> Trending
              </span>
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight max-w-xl line-clamp-2">
              {video.title}
            </h2>
            <p className="text-sm text-white/60">
              {formatCount(video.viewCount)} views · {formatDistanceToNow(video.createdAt)}
              {video.owner && <span className="ml-2">· {video.owner.displayName || video.owner.username}</span>}
            </p>
          </div>
        </div>

        {/* Duration */}
        {video.duration > 0 && (
          <span className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-lg font-medium">
            {formatDuration(video.duration)}
          </span>
        )}
      </Link>
    </motion.div>
  );
};

const Trending = () => {
  const [activeTab, setActiveTab] = useState('now');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['trending', activeTab],
    queryFn: () => videoService.getTrending().then((r) => r.data.data),
    staleTime: 60_000,
  });

  const videos = data?.videos ?? [];

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="px-4 md:px-8 pt-8 pb-6 max-w-screen-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#e50914]/10 border border-[#e50914]/20 flex items-center justify-center">
            <TrendingUp size={22} className="text-[#e50914]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8e8]">Trending</h1>
            <p className="text-sm text-[#555]">What the world is watching right now</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map(({ id, label, icon: Icon }, i) => (
            <motion.button
              key={id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${activeTab === id ? 'chip-active' : 'bg-[#181818] text-[#888] hover:bg-[#222] hover:text-[#e0e0e0] border border-white/5'}`}
            >
              <Icon size={13} className={activeTab === id ? 'text-[#0a0a0a]' : ''} />
              {label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-8 pb-12 max-w-screen-2xl mx-auto">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="skeleton aspect-[21/9] rounded-2xl mb-10" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                {Array.from({ length: 8 }).map((_, i) => <VideoCardSkeleton key={i} />)}
              </div>
            </motion.div>
          ) : isError ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-950/30 border border-red-900/30 flex items-center justify-center">
                <TrendingUp size={28} className="text-red-400" />
              </div>
              <p className="text-[#e0e0e0] font-semibold">Failed to load trending</p>
              <button onClick={refetch} className="text-sm text-[#3ea6ff] hover:underline">Try again</button>
            </motion.div>
          ) : videos.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 py-24 text-center">
              <Flame size={48} className="text-[#333]" />
              <p className="text-[#e0e0e0] font-semibold">Nothing trending yet</p>
              <p className="text-sm text-[#555]">Check back soon</p>
            </motion.div>
          ) : (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Hero — #1 trending */}
              <HeroCard video={videos[0]} rank={1} />

              {/* Rest of grid with rank numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10">
                {videos.slice(1).map((video, i) => (
                  <motion.div
                    key={video._id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.25 }}
                    className="relative"
                  >
                    <span className="rank-badge absolute -top-3 -left-2 z-10">#{i + 2}</span>
                    <div className="pt-4">
                      <VideoCard video={video} index={i} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Trending;
