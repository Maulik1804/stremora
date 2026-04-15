import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';
import { featuresService } from '../../services/features.service';
import { useAuth } from '../../hooks/useAuth';
import { formatDuration } from '../../utils/format';

const ContinueCard = ({ entry }) => {
  const { video, progressSeconds, progressPercent } = entry;

  return (
    <Link
      to={`/watch/${video._id}`}
      className="group flex-shrink-0 w-52 flex flex-col gap-2"
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

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <PlayCircle size={36} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div
            className="h-full bg-[#ff0000] rounded-r-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Resume badge */}
        <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
          {formatDuration(progressSeconds)} watched
        </div>
      </div>

      <p className="text-xs font-medium text-[#f8f8f8] line-clamp-2 leading-snug group-hover:text-white">
        {video.title}
      </p>
      <p className="text-[11px] text-[#606060]">
        {video.owner?.displayName || video.owner?.username} · {progressPercent}% watched
      </p>
    </Link>
  );
};

const ContinueWatching = () => {
  const { isAuthenticated } = useAuth();
  const scrollRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ['continue-watching'],
    queryFn: () => featuresService.getContinueWatching().then((r) => r.data.data),
    enabled: isAuthenticated,
  });

  const videos = data?.videos ?? [];
  if (!isLoading && videos.length === 0) return null;

  const scroll = (dir) => scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });

  return (
    <section className="px-4 py-4 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-[#f8f8f8] flex items-center gap-2">
          <PlayCircle size={18} className="text-[#ff0000]" />
          Continue Watching
        </h2>
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
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-52">
              <div className="skeleton aspect-video rounded-xl mb-2" />
              <div className="skeleton h-3 w-full rounded mb-1" />
              <div className="skeleton h-3 w-2/3 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {videos.map((entry, i) => (
            <motion.div
              key={entry._id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
            >
              <ContinueCard entry={entry} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ContinueWatching;
