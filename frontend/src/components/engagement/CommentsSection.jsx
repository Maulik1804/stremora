import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageSquare, ChevronDown } from 'lucide-react';
import CommentItem from './CommentItem';
import Avatar from '../ui/Avatar';
import Spinner from '../ui/Spinner';
import { engagementService } from '../../services/engagement.service';
import { useAuth } from '../../hooks/useAuth';
import { formatCount } from '../../utils/format';

const SORT_OPTIONS = [
  { value: 'date',  label: 'Top comments' },
  { value: 'likes', label: 'Newest first' },
];

const CommentsSection = ({ videoId, commentCount = 0 }) => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const loaderRef = useRef(null);

  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [sort, setSort] = useState('date');

  // ── Fetch comments ────────────────────────────────────────────────────────
  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading,
  } = useInfiniteQuery({
    queryKey: ['comments', videoId, sort],
    queryFn: ({ pageParam }) =>
      engagementService.getComments(videoId, pageParam, sort).then((r) => r.data.data),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!videoId,
  });

  // Infinite scroll
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

  // ── Post comment ──────────────────────────────────────────────────────────
  const postMutation = useMutation({
    mutationFn: () => engagementService.postComment(videoId, text.trim()),
    onSuccess: () => {
      setText('');
      setFocused(false);
      queryClient.invalidateQueries({ queryKey: ['comments', videoId] });
    },
  });

  const comments = data?.pages.flatMap((p) => p.comments) ?? [];
  const total = data?.pages[0]?.total ?? commentCount;

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-[#f1f1f1]" />
          <h3 className="text-base font-semibold text-[#f1f1f1]">
            {formatCount(total)} Comments
          </h3>
        </div>

        {/* Sort */}
        <div className="relative group">
          <button className="flex items-center gap-1.5 text-sm text-[#aaaaaa] hover:text-[#f1f1f1] transition-colors">
            <ChevronDown size={14} />
            {SORT_OPTIONS.find((o) => o.value === sort)?.label}
          </button>
          <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-[#1a1a1a] border border-[#3f3f3f] rounded-xl overflow-hidden shadow-xl z-20 min-w-[140px]">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                  ${sort === opt.value ? 'text-[#f1f1f1] bg-[#272727]' : 'text-[#aaaaaa] hover:bg-[#272727] hover:text-[#f1f1f1]'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comment input */}
      {isAuthenticated ? (
        <div className="flex gap-3 mb-6">
          <Avatar src={user?.avatar} alt={user?.displayName} size="sm" className="flex-shrink-0 mt-1" />
          <div className="flex-1">
            <textarea
              rows={focused ? 3 : 1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="Add a comment…"
              maxLength={1000}
              className="w-full bg-transparent border-b border-[#3f3f3f] focus:border-[#f1f1f1] text-sm text-[#f1f1f1] placeholder:text-[#606060] outline-none resize-none transition-all pb-1"
            />
            {focused && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mt-2"
              >
                <span className="text-xs text-[#606060]">{text.length}/1000</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setText(''); setFocused(false); }}
                    className="text-xs text-[#aaaaaa] hover:text-[#f1f1f1] px-3 py-1.5 rounded-full hover:bg-[#272727] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => postMutation.mutate()}
                    disabled={!text.trim() || postMutation.isPending}
                    className="text-xs font-medium bg-[#3ea6ff] hover:bg-[#3ea6ff]/80 disabled:opacity-40 text-[#0f0f0f] px-4 py-1.5 rounded-full transition-colors"
                  >
                    {postMutation.isPending ? '…' : 'Comment'}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6 p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-sm text-[#aaaaaa] text-center">
          <a href="/login" className="text-[#3ea6ff] hover:underline">Sign in</a> to comment
        </div>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="flex flex-col gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#272727] animate-pulse flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-3 w-24 bg-[#272727] rounded animate-pulse" />
                <div className="h-3 w-full bg-[#272727] rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-[#272727] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <MessageSquare size={32} className="text-[#606060]" />
          <p className="text-sm text-[#aaaaaa]">No comments yet. Be the first!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {comments.map((c) => (
            <CommentItem key={c._id} comment={c} videoId={videoId} />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={loaderRef} className="flex justify-center py-4">
        {isFetchingNextPage && <Spinner size="sm" />}
      </div>
    </div>
  );
};

export default CommentsSection;
