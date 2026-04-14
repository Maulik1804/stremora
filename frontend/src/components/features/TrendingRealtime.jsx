import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import { featuresService } from '../../services/features.service';
import { formatCount, formatDuration } from '../../utils/format';

const TrendingCard = ({ video, rank }) => (
  <Link
    to={`/watch/${video._id}`}
    className="group flex-shrink-0 w-48 flex flex-col gap-2"
  >
    <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1e1e1e]">
      {video.thumbnailUrl && (
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      )}
      {/* Rank badge */}
      <div className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black
        ${rank <= 3 ? 'bg-[#ff0000] text-white' : 'bg-black/70 text-white'}`}
      >
        {rank}
      </div>
      {video.duration > 0 && (
        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
          {formatDuration(video.duration)}
        </span>
      )}
    </div>
    <p className="text-xs font-medium text-[#f8f8f8] line-clamp-2 leading-snug group-hover:text-white">
      {video.title}
    </p>
    <p className="text-[11px] text-[#606060]">
      {formatCount(video.viewCount)} views
    </p>
  </Link>
);

const TrendingRealtime = ({ hours = 2 }) => {
  const scrollRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ['trending-realtime', hours],
    queryFn: () => featuresService.getTrendingRealtime(hours).then((r) => r.data.data),
    staleTime: 60_000,          // 60s — matches backend cache TTL
    refetchInterval: 120_000,   // auto-refresh every 2 min
  });

  const videos = data?.videos ?? [];
  const scroll = (dir) => scrollRef.current?.scrollBy({ left: dir * 210, behavior: 'smooth' });

  if (!isLoading && videos.length === 0) return null;

  return (
    <section className="px-4 py-4 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame size={18} className="text-[#ff0000]" />
          <h2 className="text-base font-bold text-[#f8f8f8]">Trending Now</h2>
          {data?.generatedAt && (
            <span className="text-xs text-[#606060] hidden sm:block">
              · last {hours}h
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={() => scroll(-1)} className="p-1 rounded-full hover:bg-white/8 text-[#a0a0a0]">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => scroll(1)} className="p-1 rounded-full hover:bg-white/8 text-[#a0a0a0]">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-48">
              <div className="skeleton aspect-video rounded-xl mb-2" />
              <div className="skeleton h-3 w-full rounded mb-1" />
              <div className="skeleton h-3 w-2/3 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {videos.map((v, i) => (
            <motion.div
              key={v._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: i * 0.04 }}
            >
              <TrendingCard video={v} rank={i + 1} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
};

export default TrendingRealtime;
