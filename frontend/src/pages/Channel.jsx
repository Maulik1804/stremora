import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellOff, Edit2, Users, PlaySquare, Info,
  Calendar, CheckCircle2, Upload,
} from 'lucide-react';
import { userService } from '../services/user.service';
import { videoService } from '../services/video.service';
import api from '../services/api';
import Avatar from '../components/ui/Avatar';
import VideoGrid from '../components/video/VideoGrid';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { formatCount } from '../utils/format';
import { useAuth } from '../hooks/useAuth';
import { toast } from '../components/ui/Toast';

const TABS = [
  { id: 'videos', label: 'Videos', icon: PlaySquare },
  { id: 'about',  label: 'About',  icon: Info },
];

// ── Stat pill ─────────────────────────────────────────────────────────────────
const StatPill = ({ icon: Icon, value, label }) => (
  <div className="flex items-center gap-1.5 text-sm text-[#666]">
    <Icon size={13} className="text-[#444]" />
    <span className="font-medium text-[#999]">{value}</span>
    <span>{label}</span>
  </div>
);

// ── Banner skeleton ───────────────────────────────────────────────────────────
const BannerSkeleton = () => (
  <div className="w-full h-40 sm:h-52 md:h-64 skeleton" />
);

const Channel = () => {
  const { username } = useParams();
  const { user: me, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('videos');
  const [subscribed, setSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [bannerLoaded, setBannerLoaded] = useState(false);

  const isOwner = me?.username === username;

  // ── Fetch channel ─────────────────────────────────────────────────────────
  const { data: channel, isLoading: channelLoading } = useQuery({
    queryKey: ['channel', username],
    queryFn: () => userService.getChannel(username).then((r) => {
      const ch = r.data.data.channel;
      setSubscribed(ch.isSubscribed ?? false);
      setSubscriberCount(ch.subscriberCount ?? 0);
      return ch;
    }),
    staleTime: 60_000,
  });

  // ── Fetch channel videos ──────────────────────────────────────────────────
  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ['channel-videos', channel?._id],
    queryFn: () => videoService.getFeed().then((r) => r.data.data),
    enabled: !!channel?._id && activeTab === 'videos',
    staleTime: 60_000,
  });

  // ── Subscribe ─────────────────────────────────────────────────────────────
  const subscribeMutation = useMutation({
    mutationFn: () => api.post(`/subscriptions/${channel._id}`),
    onSuccess: (res) => {
      const isNowSubscribed = res.data.data.subscribed;
      const newCount = res.data.data.subscriberCount;
      setSubscribed(isNowSubscribed);
      if (typeof newCount === 'number') {
        setSubscriberCount(newCount);
      } else {
        setSubscriberCount((c) => isNowSubscribed ? c + 1 : Math.max(0, c - 1));
      }
      queryClient.invalidateQueries({ queryKey: ['channel', username] });
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || 'Failed to update subscription';
      toast.error(msg);
    },
  });

  // ── Loading ───────────────────────────────────────────────────────────────
  if (channelLoading) {
    return (
      <div className="max-w-screen-xl mx-auto animate-pulse">
        <BannerSkeleton />
        <div className="px-6 py-5 flex items-end gap-5 border-b border-white/5">
          <div className="skeleton w-24 h-24 rounded-full -mt-12 ring-4 ring-[#080808] flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-2 pb-1">
            <div className="skeleton h-6 w-48 rounded-full" />
            <div className="skeleton h-4 w-72 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#111] border border-white/6 flex items-center justify-center">
          <Users size={28} className="text-[#444]" />
        </div>
        <p className="text-[#e0e0e0] font-semibold">Channel not found</p>
        <Link to="/" className="text-sm text-[#3ea6ff] hover:underline">Go home</Link>
      </div>
    );
  }

  const videos = videosData?.videos ?? [];
  const joinDate = channel.createdAt
    ? new Date(channel.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : null;

  return (
    <div className="min-h-screen">
      {/* ── Banner ── */}
      <div className="relative w-full h-40 sm:h-52 md:h-64 overflow-hidden bg-[#0f0f0f]">
        {channel.banner ? (
          <>
            {!bannerLoaded && <div className="absolute inset-0 skeleton" />}
            <motion.img
              src={channel.banner}
              alt="Channel banner"
              onLoad={() => setBannerLoaded(true)}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: bannerLoaded ? 1 : 0, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full object-cover"
            />
            {/* Gradient fade at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent" />
          </>
        ) : (
          /* Generative gradient banner based on username */
          <div className="w-full h-full relative overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse at 30% 50%, ${stringToColor(username, 0.3)} 0%, transparent 60%),
                             radial-gradient(ellipse at 70% 30%, ${stringToColor(username + '1', 0.2)} 0%, transparent 50%),
                             #0a0a0a`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent" />
          </div>
        )}

        {/* Edit banner button */}
        {isOwner && (
          <Link
            to="/settings"
            className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white/80 hover:text-white text-xs px-3 py-1.5 rounded-full border border-white/10 transition-all duration-200"
          >
            <Edit2 size={11} />
            Edit banner
          </Link>
        )}
      </div>

      {/* ── Profile section ── */}
      <div className="max-w-screen-xl mx-auto px-4 md:px-6">
        {/* Avatar row — sits below banner, not overlapping */}
        <div className="pt-4 pb-5 border-b border-white/5">

          {/* Top row: avatar + subscribe */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, type: 'spring', stiffness: 200, damping: 20 }}
              className="relative flex-shrink-0"
            >
              <Avatar
                src={channel.avatar}
                alt={channel.displayName}
                size="2xl"
                className="ring-4 ring-[#080808] shadow-2xl"
              />
              {(subscriberCount ?? 0) >= 1000 && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#080808] rounded-full flex items-center justify-center">
                  <CheckCircle2 size={16} style={{ color: '#3ea6ff' }} />
                </div>
              )}
            </motion.div>

            {/* Action buttons — top right */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="flex items-center gap-2 pt-1"
            >
              {isOwner ? (
                <>
                  <Link to="/upload">
                    <Button variant="secondary" size="sm"><Upload size={14} />Upload</Button>
                  </Link>
                  <Link to="/settings">
                    <Button variant="secondary" size="sm"><Edit2 size={14} />Edit profile</Button>
                  </Link>
                </>
              ) : isAuthenticated ? (
                <Button
                  variant={subscribed ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => subscribeMutation.mutate()}
                  loading={subscribeMutation.isPending}
                >
                  {subscribed ? <><BellOff size={14} />Subscribed</> : <><Bell size={14} />Subscribe</>}
                </Button>
              ) : (
                <Link to="/login">
                  <Button variant="primary" size="sm"><Bell size={14} />Subscribe</Button>
                </Link>
              )}
            </motion.div>
          </div>

          {/* Channel name + meta below avatar */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <h1 className="text-xl sm:text-2xl font-bold text-[#f0f0f0] leading-tight">
              {channel.displayName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              <span className="text-sm text-[#555]">@{channel.username}</span>
              <span className="text-[#333]">·</span>
              <StatPill icon={Users} value={formatCount(subscriberCount)} label="subscribers" />
              <span className="text-[#333]">·</span>
              <StatPill icon={PlaySquare} value={formatCount(videos.length)} label="videos" />
              {joinDate && (
                <>
                  <span className="text-[#333]">·</span>
                  <StatPill icon={Calendar} value={joinDate} label="" />
                </>
              )}
            </div>
            {channel.bio && (
              <p className="text-sm text-[#666] mt-2 line-clamp-2 max-w-2xl leading-relaxed">
                {channel.bio}
              </p>
            )}
          </motion.div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-0 border-b border-white/5 mt-1">
          {TABS.map(({ id, label, icon: Icon }, i) => (
            <motion.button
              key={id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              onClick={() => setActiveTab(id)}
              className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all duration-200
                ${activeTab === id ? 'text-[#f0f0f0]' : 'text-[#555] hover:text-[#999]'}`}
            >
              <Icon size={14} />
              {label}
              {activeTab === id && (
                <motion.div
                  layoutId="channel-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f0f0f0] rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="py-6">
          <AnimatePresence mode="wait">
            {activeTab === 'videos' && (
              <motion.div
                key="videos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <VideoGrid videos={videos} isLoading={videosLoading} />

                {!videosLoading && videos.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-5 py-24 text-center"
                  >
                    <div className="w-20 h-20 rounded-3xl bg-[#111] border border-white/6 flex items-center justify-center">
                      <PlaySquare size={32} className="text-[#333]" />
                    </div>
                    <div>
                      <p className="text-[#e0e0e0] font-semibold text-lg">No videos yet</p>
                      <p className="text-sm text-[#555] mt-1">
                        {isOwner ? 'Upload your first video to get started.' : 'This channel hasn\'t uploaded any videos yet.'}
                      </p>
                    </div>
                    {isOwner && (
                      <Link to="/upload">
                        <Button variant="primary" size="md">
                          <Upload size={15} />
                          Upload video
                        </Button>
                      </Link>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === 'about' && (
              <motion.div
                key="about"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="max-w-2xl"
              >
                <div className="flex flex-col gap-4">
                  {/* Bio */}
                  <div className="bg-[#0f0f0f] border border-white/6 rounded-2xl p-6">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-[#444] mb-3">Description</h3>
                    <p className="text-sm text-[#ccc] whitespace-pre-wrap leading-relaxed">
                      {channel.bio || <span className="text-[#444] italic">No description provided.</span>}
                    </p>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Subscribers', value: formatCount(subscriberCount), icon: Users },
                      { label: 'Videos', value: formatCount(videos.length), icon: PlaySquare },
                      { label: 'Joined', value: joinDate || '—', icon: Calendar },
                    ].map(({ label, value, icon: Icon }) => (
                      <motion.div
                        key={label}
                        whileHover={{ y: -2 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className="bg-[#0f0f0f] border border-white/6 rounded-2xl p-4 flex flex-col gap-2"
                      >
                        <div className="w-8 h-8 rounded-xl bg-white/4 flex items-center justify-center">
                          <Icon size={15} className="text-[#666]" />
                        </div>
                        <p className="text-xl font-bold text-[#f0f0f0]">{value}</p>
                        <p className="text-xs text-[#555]">{label}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// ── Utility: deterministic color from string ──────────────────────────────────
function stringToColor(str = '', alpha = 1) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsla(${h}, 60%, 40%, ${alpha})`;
}

export default Channel;
