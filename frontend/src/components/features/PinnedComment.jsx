import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Pin, ThumbsUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { featuresService } from '../../services/features.service';
import Avatar from '../ui/Avatar';
import { formatCount } from '../../utils/format';
import { formatDistanceToNow } from '../../utils/date';

/**
 * Feature 12: Pinned Comment — shows the top-liked comment under the video.
 */
const PinnedComment = ({ videoId, onSeek }) => {
  const { data } = useQuery({
    queryKey: ['pinned-comment', videoId],
    queryFn: () => featuresService.getPinnedComment(videoId).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: !!videoId,
  });

  const comment = data?.comment;
  if (!comment) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-gradient-to-r from-[#ff0000]/8 to-transparent border border-[#ff0000]/20 rounded-2xl p-4 mb-4"
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-3">
        <Pin size={13} className="text-[#ff0000]" />
        <span className="text-xs font-semibold text-[#ff0000]">Top Comment</span>
      </div>

      {/* Comment body */}
      <div className="flex gap-3">
        <Link to={`/channel/${comment.author?.username}`} className="flex-shrink-0">
          <Avatar
            src={comment.author?.avatar}
            alt={comment.author?.displayName || ''}
            size="sm"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              to={`/channel/${comment.author?.username}`}
              className="text-xs font-semibold text-[#f8f8f8] hover:text-white"
            >
              {comment.author?.displayName || comment.author?.username}
            </Link>
            <span className="text-xs text-[#606060]">
              {formatDistanceToNow(comment.createdAt)}
            </span>
          </div>

          {/* If timestamp comment, make it clickable */}
          {comment.timestamp != null ? (
            <button
              onClick={() => onSeek?.(comment.timestamp)}
              className="text-sm text-[#f8f8f8] text-left hover:text-white transition-colors"
            >
              {comment.text}
            </button>
          ) : (
            <p className="text-sm text-[#f8f8f8]">{comment.text}</p>
          )}

          <div className="flex items-center gap-1 mt-2 text-xs text-[#a0a0a0]">
            <ThumbsUp size={12} />
            <span>{formatCount(comment.likeCount)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PinnedComment;
