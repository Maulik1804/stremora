import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, Trash2, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Avatar from '../ui/Avatar';
import { formatDistanceToNow } from '../../utils/date';
import { formatCount } from '../../utils/format';
import { engagementService } from '../../services/engagement.service';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../ui/Toast';

const CommentItem = ({ comment, videoId, depth = 0 }) => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likeCount ?? 0);

  const isOwn = user?._id === comment.author?._id;
  const isDeleted = comment.isDeleted;

  // ── Fetch user's comment reaction ─────────────────────────────────────────
  const { data: userCommentReaction } = useQuery({
    queryKey: ['comment-reaction', comment._id, isAuthenticated],
    queryFn: async () => {
      if (!isAuthenticated) return null;
      try {
        const res = await engagementService.getCommentReaction(comment._id);
        return res.data.data.reactionState || null;
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated && !!comment._id,
  });

  // Sync liked state when user reaction data loads
  useEffect(() => {
    if (isAuthenticated && userCommentReaction !== undefined) {
      setLiked(userCommentReaction === 'like');
    } else if (!isAuthenticated) {
      setLiked(false);
    }
  }, [userCommentReaction, isAuthenticated]);

  // ── Fetch replies ─────────────────────────────────────────────────────────
  const { data: repliesData, isLoading: repliesLoading } = useQuery({
    queryKey: ['replies', comment._id],
    queryFn: () => engagementService.getReplies(comment._id).then((r) => r.data.data),
    enabled: showReplies && depth === 0,
  });

  // ── Post reply ────────────────────────────────────────────────────────────
  const replyMutation = useMutation({
    mutationFn: () => engagementService.postComment(videoId, replyText.trim(), comment._id),
    onSuccess: () => {
      setReplyText('');
      setShowReplyBox(false);
      setShowReplies(true);
      queryClient.invalidateQueries({ queryKey: ['replies', comment._id] });
      queryClient.invalidateQueries({ queryKey: ['comments', videoId] });
    },
  });

  // ── Delete comment ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => engagementService.deleteComment(comment._id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', videoId] }),
  });

  // ── Like comment ──────────────────────────────────────────────────────────
  const likeMutation = useMutation({
    mutationFn: () => engagementService.likeComment(comment._id, 'like'),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['comment-reaction', comment._id, isAuthenticated] });

      // Snapshot the previous values
      const previousLiked = liked;
      const previousLikeCount = likeCount;

      // Optimistically update
      const newLiked = !liked;
      const newLikeCount = newLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
      
      setLiked(newLiked);
      setLikeCount(newLikeCount);
      queryClient.setQueryData(['comment-reaction', comment._id, isAuthenticated], newLiked ? 'like' : null);

      return { previousLiked, previousLikeCount };
    },
    onSuccess: () => {
      // Keep the optimistic update
    },
    onError: (err, variables, context) => {
      // Revert on error
      setLiked(context?.previousLiked ?? false);
      setLikeCount(context?.previousLikeCount ?? 0);
      queryClient.setQueryData(['comment-reaction', comment._id, isAuthenticated], context?.previousLiked ? 'like' : null);
      toast.error('Failed to like comment');
    },
  });

  const replies = repliesData?.replies ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex gap-3 ${depth > 0 ? 'ml-10 mt-3' : ''}`}
    >
      <Avatar
        src={comment.author?.avatar}
        alt={comment.author?.displayName}
        size={depth > 0 ? 'xs' : 'sm'}
        className="flex-shrink-0 mt-0.5"
      />

      <div className="flex-1 min-w-0">
        {/* Author + time */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-[#f1f1f1]">
            {comment.author?.displayName || comment.author?.username}
          </span>
          <span className="text-xs text-[#606060]">
            {formatDistanceToNow(comment.createdAt)}
          </span>
        </div>

        {/* Text */}
        <p className={`text-sm leading-relaxed ${isDeleted ? 'text-[#606060] italic' : 'text-[#e0e0e0]'}`}>
          {isDeleted ? '[deleted]' : comment.text}
        </p>

        {/* Actions */}
        {!isDeleted && (
          <div className="flex items-center gap-3 mt-2">
            {/* Like */}
            <button
              onClick={() => {
                if (!isAuthenticated) { toast.warning('Sign in to like comments'); return; }
                likeMutation.mutate();
              }}
              className={`flex items-center gap-1 text-xs transition-colors
                ${liked ? 'text-[#3ea6ff]' : 'text-[#aaaaaa] hover:text-[#f1f1f1]'}`}
              aria-label="Like comment"
            >
              <ThumbsUp size={13} className={liked ? 'fill-current' : ''} />
              {formatCount(likeCount)}
            </button>

            {/* Reply (only on top-level) */}
            {depth === 0 && (
              <button
                onClick={() => {
                  if (!isAuthenticated) { toast.warning('Sign in to reply to comments'); return; }
                  setShowReplyBox((v) => !v);
                }}
                className="text-xs text-[#aaaaaa] hover:text-[#f1f1f1] transition-colors"
              >
                Reply
              </button>
            )}

            {/* Delete */}
            {isOwn && (
              <button
                onClick={() => deleteMutation.mutate()}
                className="text-xs text-[#aaaaaa] hover:text-red-400 transition-colors"
                aria-label="Delete comment"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}

        {/* Reply input */}
        <AnimatePresence>
          {showReplyBox && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="mt-3 overflow-hidden"
            >
              <div className="flex gap-2">
                <Avatar src={user?.avatar} alt={user?.displayName} size="xs" className="flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <textarea
                    autoFocus
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Add a reply…"
                    className="w-full bg-transparent border-b border-[#3f3f3f] focus:border-[#f1f1f1] text-sm text-[#f1f1f1] placeholder:text-[#606060] outline-none resize-none transition-colors pb-1"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => { setShowReplyBox(false); setReplyText(''); }}
                      className="text-xs text-[#aaaaaa] hover:text-[#f1f1f1] px-3 py-1.5 rounded-full hover:bg-[#272727] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => replyMutation.mutate()}
                      disabled={!replyText.trim() || replyMutation.isPending}
                      className="text-xs font-medium bg-[#3ea6ff] hover:bg-[#3ea6ff]/80 disabled:opacity-40 text-[#0f0f0f] px-3 py-1.5 rounded-full transition-colors"
                    >
                      {replyMutation.isPending ? '…' : 'Reply'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Show/hide replies */}
        {depth === 0 && (comment.replyCount > 0 || replies.length > 0) && (
          <button
            onClick={() => setShowReplies((v) => !v)}
            className="flex items-center gap-1 mt-2 text-xs font-medium text-[#3ea6ff] hover:text-[#3ea6ff]/80 transition-colors"
          >
            {showReplies ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showReplies ? 'Hide replies' : `${replies.length || ''} replies`}
          </button>
        )}

        {/* Replies */}
        <AnimatePresence>
          {showReplies && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-1"
            >
              {repliesLoading ? (
                <div className="ml-10 mt-3 h-4 w-32 bg-[#272727] rounded animate-pulse" />
              ) : (
                replies.map((reply) => (
                  <CommentItem
                    key={reply._id}
                    comment={reply}
                    videoId={videoId}
                    depth={1}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default CommentItem;
