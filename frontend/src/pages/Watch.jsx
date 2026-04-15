import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ThumbsUp, ThumbsDown, Share2, BookmarkPlus,
  ChevronDown, ChevronUp, Bell, BellOff, Headphones, Minimize2,
} from 'lucide-react';

import VideoPlayer from '../components/video/VideoPlayer';
import SuggestedVideos from '../components/video/SuggestedVideos';
import CommentsSection from '../components/engagement/CommentsSection';
import ShareModal from '../components/engagement/ShareModal';
import SaveToPlaylistModal from '../components/engagement/SaveToPlaylistModal';
import TimestampComments from '../components/features/TimestampComments';
import PinnedComment from '../components/features/PinnedComment';
import SearchInsideVideo from '../components/features/SearchInsideVideo';
import VideoThemeToggle from '../components/features/VideoThemeToggle';
import FocusModeToggle from '../components/features/FocusModeToggle';
import Avatar from '../components/ui/Avatar';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import { toast } from '../components/ui/Toast';
import { videoService } from '../services/video.service';
import { engagementService } from '../services/engagement.service';
import { featuresService } from '../services/features.service';
import { formatCount } from '../utils/format';
import { formatDistanceToNow } from '../utils/date';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useXP } from '../hooks/useXP';
import { useSelector, useDispatch } from 'react-redux';
import { selectVideoTheme, THEMES } from '../store/slices/themeSlice';
import { selectFocusMode, setFocusMode } from '../store/slices/focusSlice';

const WATCH_THRESHOLD_SECONDS = 30;

const Watch = () => {
  const { id } = useParams();
  const { isAuthenticated, user: me } = useAuth();
  const { award } = useXP();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const videoTheme = useSelector(selectVideoTheme);
  const focusMode = useSelector(selectFocusMode);

  const [descExpanded, setDescExpanded] = useState(false);
  const [reaction, setReaction] = useState(null);
  const [subscribed, setSubscribed] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);
  const viewRecorded = useRef(false);
  const progressSaveTimer = useRef(null);            // Feature 10

  // ── Fetch video ───────────────────────────────────────────────────────────
  const { data: video, isLoading, isError } = useQuery({
    queryKey: ['video', id],
    queryFn: () => videoService.getById(id).then((r) => r.data.data.video),
  });

  // Derive subscriberCount directly from video data (never stale)
  const subscriberCount = video?.owner?.subscriberCount ?? 0;

  // Sync subscribed state when video data loads/changes
  useEffect(() => {
    if (video?.owner) setSubscribed(video.owner.isSubscribed ?? false);
  }, [video?.owner?._id, video?.owner?.isSubscribed]);

  // ── Record view + history ─────────────────────────────────────────────────
  const handleTimeUpdate = (currentTime) => {
    if (viewRecorded.current || !video) return;
    const threshold = Math.min(WATCH_THRESHOLD_SECONDS, video.duration * 0.5);
    if (currentTime >= threshold) {
      viewRecorded.current = true;
      videoService.recordView(id).catch(() => {});
      if (isAuthenticated) {
        api.post('/history', { videoId: id }).catch(() => {});
        award('watch');
        featuresService.trackEngagement(id, 'play', currentTime).catch(() => {});
      }
    }

    // Feature 10: save progress every 10 seconds
    if (isAuthenticated && currentTime > 10) {
      clearTimeout(progressSaveTimer.current);
      progressSaveTimer.current = setTimeout(() => {
        featuresService.saveProgress(id, Math.floor(currentTime)).catch(() => {});
      }, 10_000);
    }
  };

  useEffect(() => {
    viewRecorded.current = false;
    setReaction(null);
    setDescExpanded(false);
    setSubscribed(false);
    setAudioOnly(false);

    // Feature 15: double-tap center → like
    const handleDoubleTapLike = () => {
      if (isAuthenticated) likeMutation.mutate('like');
    };
    window.addEventListener('streamora:doubletap-like', handleDoubleTapLike);

    return () => {
      clearTimeout(progressSaveTimer.current);
      window.removeEventListener('streamora:doubletap-like', handleDoubleTapLike);
    };
  }, [id, isAuthenticated]);

  // ── Like / dislike ────────────────────────────────────────────────────────
  const likeMutation = useMutation({
    mutationFn: (r) => engagementService.toggleReaction('video', id, r),
    onSuccess: (res) => {
      setReaction(res.data.data.reactionState);
      queryClient.invalidateQueries({ queryKey: ['video', id] });
    },
    onError: () => toast.error('Sign in to like videos'),
  });

  // ── Subscribe ─────────────────────────────────────────────────────────────
  const subscribeMutation = useMutation({
    mutationFn: () => {
      const ownerId = video?.owner?._id;
      if (!ownerId) throw new Error('Channel not found');
      return engagementService.toggleSubscription(ownerId);
    },
    onSuccess: (res) => {
      const isNowSubscribed = res.data.data.subscribed;
      setSubscribed(isNowSubscribed);
      // Invalidate so subscriberCount re-fetches from server
      queryClient.invalidateQueries({ queryKey: ['video', id] });
      queryClient.invalidateQueries({ queryKey: ['channel', video?.owner?.username] });
      toast.success(isNowSubscribed
        ? `Subscribed to ${video?.owner?.displayName || video?.owner?.username}`
        : 'Unsubscribed');
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update subscription';
      toast.error(msg);
    },
  });

  if (isLoading) return <div className="flex justify-center items-center min-h-[60vh]"><Spinner size="lg" /></div>;
  if (isError || !video) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-[#f1f1f1] font-medium">Video not found</p>
      <Link to="/" className="text-[#3ea6ff] text-sm hover:underline">Go home</Link>
    </div>
  );

  const isLongDesc = (video.description?.split('\n').length ?? 0) > 3 || (video.description?.length ?? 0) > 200;

  // ── Focus mode: only the video, nothing else ──────────────────────────────
  if (focusMode) {
    return (
      <>
        {showShare && <ShareModal videoId={id} title={video.title} onClose={() => setShowShare(false)} />}
        {showSave && isAuthenticated && <SaveToPlaylistModal videoId={id} onClose={() => setShowSave(false)} />}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-40 bg-black flex items-center justify-center"
        >
          {/* Exit button — top right, fades in on hover */}
          <div className="absolute top-4 right-4 z-50 group">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => dispatch(setFocusMode(false))}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/8 hover:bg-white/16 backdrop-blur-md border border-white/10 text-white/70 hover:text-white text-xs font-medium transition-all duration-200"
            >
              <Minimize2 size={13} />
              Exit Focus
            </motion.button>
          </div>

          {/* Video — fills the screen, max width constrained to keep aspect ratio */}
          <div className="w-full h-full flex items-center justify-center p-0">
            <div className="w-full h-full">
              <VideoPlayer
                src={video.videoUrl}
                poster={video.thumbnailUrl}
                onTimeUpdate={handleTimeUpdate}
                videoId={id}
                audioOnly={audioOnly}
                videoTitle={video.title}
                focusMode
              />
            </div>
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      {/* Modals */}
      {showShare && (
        <ShareModal videoId={id} title={video.title} onClose={() => setShowShare(false)} />
      )}
      {showSave && isAuthenticated && (
        <SaveToPlaylistModal videoId={id} onClose={() => setShowSave(false)} />
      )}


      <div className={`px-4 py-6 transition-colors duration-300 max-w-screen-xl mx-auto
        ${videoTheme === THEMES.CINEMA ? 'bg-black' : ''}
        ${videoTheme === THEMES.FOCUS ? 'max-w-4xl' : ''}`}
      >
        <div className="flex flex-col xl:flex-row gap-6">
          {/* ── Left column ── */}
          <div className="flex-1 min-w-0">
            {/* Player */}
            <VideoPlayer
              src={video.videoUrl}
              poster={video.thumbnailUrl}
              onTimeUpdate={handleTimeUpdate}
              videoId={id}
              audioOnly={audioOnly}
              videoTitle={video.title}
            />

            {/* Title */}
            <h1 className="text-base md:text-lg font-bold text-[#f1f1f1] mt-4 mb-3 leading-snug">
              {video.title}
            </h1>

            {/* Channel row + actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              {/* Channel */}
              <div className="flex items-center gap-3">
                <Link to={`/channel/${video.owner?.username}`}>
                  <Avatar src={video.owner?.avatar} alt={video.owner?.displayName} size="md" />
                </Link>
                <div>
                  <Link
                    to={`/channel/${video.owner?.username}`}
                    className="text-sm font-semibold text-[#f1f1f1] hover:text-white"
                  >
                    {video.owner?.displayName || video.owner?.username}
                  </Link>
                  <p className="text-xs text-[#aaaaaa]">
                    {formatCount(subscriberCount)} subscribers
                  </p>
                </div>
              {/* Subscribe button — hide for own channel */}
              {video.owner?._id !== me?._id && (
                isAuthenticated ? (
                  <Button
                    variant={subscribed ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => subscribeMutation.mutate()}
                    loading={subscribeMutation.isPending}
                    className="ml-1"
                  >
                    {subscribed
                      ? <><BellOff size={14} /> Subscribed</>
                      : <><Bell size={14} /> Subscribe</>}
                  </Button>
                ) : (
                  <Link to="/login">
                    <Button variant="primary" size="sm" className="ml-1">
                      <Bell size={14} /> Subscribe
                    </Button>
                  </Link>
                )
              )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Like/dislike pill */}
                <div className="flex items-center bg-[#272727] rounded-full overflow-hidden">
                  <button
                    onClick={() => isAuthenticated && likeMutation.mutate('like')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors
                      ${reaction === 'like' ? 'text-[#3ea6ff]' : 'text-[#f1f1f1] hover:bg-[#3f3f3f]'}`}
                    aria-label="Like"
                  >
                    <ThumbsUp size={16} className={reaction === 'like' ? 'fill-current' : ''} />
                    {formatCount(video.likeCount)}
                  </button>
                  <div className="w-px h-5 bg-[#3f3f3f]" />
                  <button
                    onClick={() => isAuthenticated && likeMutation.mutate('dislike')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors
                      ${reaction === 'dislike' ? 'text-[#ff0000]' : 'text-[#f1f1f1] hover:bg-[#3f3f3f]'}`}
                    aria-label="Dislike"
                  >
                    <ThumbsDown size={16} className={reaction === 'dislike' ? 'fill-current' : ''} />
                  </button>
                </div>

                <Button variant="secondary" size="sm" onClick={() => setShowShare(true)}>
                  <Share2 size={15} /> Share
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => isAuthenticated ? setShowSave(true) : null}
                >
                  <BookmarkPlus size={15} /> Save
                </Button>

                {/* Feature 9: Audio Only */}
                <Button
                  variant={audioOnly ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setAudioOnly((v) => !v)}
                  title="Toggle audio-only mode"
                >
                  <Headphones size={15} />
                  {audioOnly ? 'Video' : 'Audio'}
                </Button>

                {/* Feature 13: Theme toggle */}
                <VideoThemeToggle />

                {/* Focus Mode toggle */}
                <FocusModeToggle />
              </div>
            </div>

            {/* Description box */}
            <div className="bg-[#1a1a1a] rounded-xl p-4 mb-2">
              <p className="text-sm font-medium text-[#f1f1f1] mb-2">
                {formatCount(video.viewCount)} views · {formatDistanceToNow(video.createdAt)}
                {video.tags?.length > 0 && (
                  <span className="text-[#3ea6ff] ml-2">
                    {video.tags.map((t) => `#${t}`).join(' ')}
                  </span>
                )}
              </p>
              {video.description && (
                <>
                  <p className={`text-sm text-[#aaaaaa] whitespace-pre-wrap ${!descExpanded ? 'line-clamp-3' : ''}`}>
                    {video.description}
                  </p>
                  {isLongDesc && (
                    <button
                      onClick={() => setDescExpanded((v) => !v)}
                      className="mt-2 text-sm font-medium text-[#f1f1f1] flex items-center gap-1 hover:text-white"
                    >
                      {descExpanded ? <><ChevronUp size={16} /> Show less</> : <><ChevronDown size={16} /> Show more</>}
                    </button>
                  )}
                </>
              )}
            </div>


            {/* Feature 14: Search inside video */}
            <div className="mb-4">
              <SearchInsideVideo
                videoId={id}
                onSeek={(ts) => window.dispatchEvent(new CustomEvent('streamora:seek', { detail: { time: ts } }))}
              />
            </div>

            {/* Feature 12: Pinned comment */}
            <PinnedComment
              videoId={id}
              onSeek={(ts) => window.dispatchEvent(new CustomEvent('streamora:seek', { detail: { time: ts } }))}
            />

            {/* Feature 1: Timestamp comments */}
            <TimestampComments
              videoId={id}
              onSeek={(ts) => window.dispatchEvent(new CustomEvent('streamora:seek', { detail: { time: ts } }))}
            />

            {/* Comments */}
            {!focusMode && (
              <CommentsSection videoId={id} commentCount={video.commentCount} />
            )}
          </div>

          {/* Right column — suggested */}
          {!focusMode && (
            <div className="xl:w-96 flex-shrink-0">
              <SuggestedVideos currentVideoId={id} />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Watch;
