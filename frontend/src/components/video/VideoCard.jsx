import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Clock } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { formatDistanceToNow } from '../../utils/date';
import { formatCount, formatDuration } from '../../utils/format';

// ── Horizontal card (suggested sidebar) ──────────────────────────────────────
const HorizontalCard = ({ video }) => {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { _id, title, thumbnailUrl, duration, viewCount, createdAt, owner } = video;

  return (
    <motion.article
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="group flex gap-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link to={`/watch/${_id}`}
        className="relative flex-shrink-0 w-40 aspect-video rounded-xl overflow-hidden bg-[#111]">
        {thumbnailUrl && !imgError ? (
          <motion.img
            src={thumbnailUrl} alt={title} loading="lazy"
            onError={() => setImgError(true)}
            animate={{ scale: hovered ? 1.06 : 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#111]">
            <Play size={18} className="text-[#444]" />
          </div>
        )}
        {duration > 0 && (
          <span className="absolute bottom-1.5 right-1.5 bg-black/85 text-white text-[10px] px-1.5 py-0.5 rounded-md font-medium backdrop-blur-sm">
            {formatDuration(duration)}
          </span>
        )}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 bg-black/30 flex items-center justify-center"
        >
          <div className="bg-black/60 backdrop-blur-sm rounded-full p-1.5">
            <Play size={13} className="text-white fill-white" />
          </div>
        </motion.div>
      </Link>

      <div className="flex flex-col gap-0.5 min-w-0 flex-1 py-0.5">
        <Link to={`/watch/${_id}`}
          className="text-xs font-medium text-[#e0e0e0] line-clamp-2 leading-snug hover:text-white transition-colors">
          {title}
        </Link>
        <Link to={`/channel/${owner?.username}`}
          className="text-[11px] text-[#666] hover:text-[#ccc] transition-colors mt-0.5">
          {owner?.displayName || owner?.username}
        </Link>
        <p className="text-[11px] text-[#444] mt-0.5">
          {formatCount(viewCount)} views · {formatDistanceToNow(createdAt)}
        </p>
      </div>
    </motion.article>
  );
};

// ── Vertical card (grid) ──────────────────────────────────────────────────────
const VerticalCard = ({ video, index = 0 }) => {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { _id, title, thumbnailUrl, duration, viewCount, createdAt, owner } = video;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.25) }}
      className="group flex flex-col gap-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <Link to={`/watch/${_id}`}
        className="relative block aspect-video rounded-2xl overflow-hidden bg-[#111] ring-1 ring-white/4 card-hover-ring transition-all duration-300">
        {thumbnailUrl && !imgError ? (
          <motion.img
            src={thumbnailUrl} alt={title} loading="lazy"
            onError={() => setImgError(true)}
            animate={{ scale: hovered ? 1.05 : 1 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#111] to-[#1a1a1a]">
            <Play size={28} className="text-[#333]" />
          </div>
        )}

        {/* Gradient overlay */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.22 }}
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
        />

        {/* Play button */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.75 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="bg-black/65 backdrop-blur-md rounded-full p-3.5 ring-1 ring-white/15 shadow-xl">
            <Play size={22} className="text-white fill-white ml-0.5" />
          </div>
        </motion.div>

        {/* Duration */}
        {duration > 0 && (
          <motion.span
            animate={{ opacity: hovered ? 0.7 : 1 }}
            className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-lg font-medium flex items-center gap-1"
          >
            <Clock size={10} />
            {formatDuration(duration)}
          </motion.span>
        )}
      </Link>

      {/* Meta */}
      <div className="flex gap-3">
        <Link to={`/channel/${owner?.username}`} className="flex-shrink-0 mt-0.5">
          <motion.div whileHover={{ scale: 1.08 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
            <Avatar
              src={owner?.avatar}
              alt={owner?.displayName || owner?.username || ''}
              size="sm"
              className="ring-1 ring-white/8 hover:ring-white/20 transition-all duration-200"
            />
          </motion.div>
        </Link>

        <div className="flex flex-col gap-0.5 min-w-0">
          <Link to={`/watch/${_id}`}
            className="text-sm font-medium text-[#e8e8e8] line-clamp-2 leading-snug hover:text-white transition-colors">
            {title}
          </Link>
          <Link to={`/channel/${owner?.username}`}
            className="text-xs text-[#666] hover:text-[#ccc] transition-colors mt-0.5">
            {owner?.displayName || owner?.username}
          </Link>
          <p className="text-xs text-[#444] mt-0.5">
            {formatCount(viewCount)} views · {formatDistanceToNow(createdAt)}
          </p>
        </div>
      </div>
    </motion.article>
  );
};

const VideoCard = ({ video, horizontal = false, index = 0 }) => {
  if (!video) return null;
  return horizontal ? <HorizontalCard video={video} /> : <VerticalCard video={video} index={index} />;
};

export default VideoCard;
