import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { featuresService } from '../../services/features.service';
import { formatCount, formatDuration } from '../../utils/format';

const VideoThumb = ({ video }) => (
  <Link
    to={`/watch/${video._id}`}
    className="group flex-shrink-0 w-44 flex flex-col gap-2"
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
      {video.duration > 0 && (
        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
          {formatDuration(video.duration)}
        </span>
      )}
    </div>
    <p className="text-xs font-medium text-[#f8f8f8] line-clamp-2 leading-snug group-hover:text-white">
      {video.title}
    </p>
    <p className="text-[11px] text-[#606060]">{formatCount(video.viewCount)} views</p>
  </Link>
);

const PlaylistRow = ({ playlist }) => {
  const scrollRef = useRef(null);
  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#f8f8f8]">{playlist.title}</h3>
        <div className="flex gap-1">
          <button onClick={() => scroll(-1)} className="p-1 rounded-full hover:bg-white/8 text-[#a0a0a0]">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => scroll(1)} className="p-1 rounded-full hover:bg-white/8 text-[#a0a0a0]">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-none pb-1"
      >
        {playlist.videos.map((v) => <VideoThumb key={v._id} video={v} />)}
      </div>
    </div>
  );
};

const SmartPlaylists = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['smart-playlists'],
    queryFn: () => featuresService.getSmartPlaylists().then((r) => r.data.data),
  });

  const playlists = data?.playlists ?? [];
  if (!isLoading && playlists.length === 0) return null;

  return (
    <section className="px-4 py-6 max-w-screen-2xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <Sparkles size={18} className="text-yellow-400" />
        <h2 className="text-base font-bold text-[#f8f8f8]">Smart Playlists</h2>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-44">
              <div className="skeleton aspect-video rounded-xl mb-2" />
              <div className="skeleton h-3 w-full rounded mb-1" />
              <div className="skeleton h-3 w-2/3 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {playlists.map((pl) => (
            <motion.div
              key={pl.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <PlaylistRow playlist={pl} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
};

export default SmartPlaylists;
