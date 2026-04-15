import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlaySquare, Lock, Globe, Film } from 'lucide-react';
import { formatCount } from '../../utils/format';

const SeriesCard = ({ series, showOwner = false }) => {
  const episodeCount = series.episodeCount ?? series.videos?.length ?? 0;
  const thumbnail = series.seriesThumbnail || series.videos?.[0]?.thumbnailUrl || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      className="group bg-[#141414] border border-[#1f1f1f] rounded-2xl overflow-hidden
                 hover:border-[#2f2f2f] hover:shadow-xl hover:shadow-black/40 transition-all duration-200"
    >
      <Link to={`/channel-playlist/${series._id}`} className="block">
        {/* Thumbnail with stacked episode effect */}
        <div className="relative aspect-video bg-[#1a1a1a]">
          {/* Stack layers behind */}
          <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a]" />
          <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded-xl bg-[#1a1a1a] border border-[#252525]" />

          {/* Main thumbnail */}
          <div className="relative rounded-xl overflow-hidden w-full h-full">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={series.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
                <Film size={36} className="text-[#333]" />
              </div>
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          </div>

          {/* Episode count badge */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/80 backdrop-blur-sm
                          text-white text-xs font-semibold px-2 py-1 rounded-lg">
            <PlaySquare size={11} />
            {episodeCount} ep{episodeCount !== 1 ? 's' : ''}
          </div>

          {/* Playlist badge */}
          <div className="absolute top-2 left-2 bg-[#ff0000]/90 text-white text-[10px] font-bold
                          px-2 py-0.5 rounded-md tracking-wide uppercase">
            Playlist
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="p-3.5">
        <Link to={`/channel-playlist/${series._id}`}>
          <h3 className="text-sm font-semibold text-[#f1f1f1] line-clamp-2 leading-snug
                         group-hover:text-white transition-colors">
            {series.title}
          </h3>
        </Link>

        {showOwner && series.owner && (
          <Link
            to={`/channel/${series.owner.username}`}
            className="text-xs text-[#3ea6ff] mt-1 block truncate hover:underline"
          >
            {series.owner.displayName || series.owner.username}
          </Link>
        )}

        <div className="flex items-center gap-2 mt-1.5">
          {series.visibility === 'private'
            ? <Lock size={10} className="text-[#555]" />
            : <Globe size={10} className="text-[#555]" />}
          <span className="text-[11px] text-[#555] capitalize">{series.visibility}</span>
          {episodeCount > 0 && (
            <>
              <span className="text-[#333]">·</span>
              <span className="text-[11px] text-[#555]">{episodeCount} episode{episodeCount !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>

        {series.description && (
          <p className="text-xs text-[#555] mt-1.5 line-clamp-2 leading-relaxed">
            {series.description}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default SeriesCard;
