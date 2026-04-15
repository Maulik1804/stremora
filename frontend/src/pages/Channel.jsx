import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellOff, Edit2, Users, PlaySquare, Info,
  Calendar, CheckCircle2, Upload, Film,
} from 'lucide-react';
import { userService } from '../services/user.service';
import { videoService } from '../services/video.service';
import { engagementService } from '../services/engagement.service';
import api from '../services/api';
import Avatar from '../components/ui/Avatar';
import VideoGrid from '../components/video/VideoGrid';
import SeriesCard from '../components/series/SeriesCard';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { formatCount } from '../utils/format';
import { useAuth } from '../hooks/useAuth';
import { toast } from '../components/ui/Toast';

const TABS = [
  { id: 'videos',    label: 'Videos',    icon: PlaySquare },
  { id: 'playlists', label: 'Playlists', icon: Film },
  { id: 'about',     label: 'About',     icon: Info },
];

// ── Utility: deterministic color from string ──────────────────────────────────
function stringToColor(str = '', alpha = 1) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsla(${h}, 60%, 40%, ${alpha})`;
}

function stringToColorSolid(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 50%)`;
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
const StatPill = ({ icon: Icon, value, label }) => (
  <div className="flex items-center gap-1.5 text-sm">
    <Icon size={13} className="text-[#555]" />
    <span className="font-semibold text-[#aaa]">{value}</span>
    {label && <span className="text-[#555]">{label}</span>}
  </div>
);

// ── Loading skeleton ──────────────────────────────────────────────────────────
const ChannelSkeleton = () => (
  <div className="min-h-screen animate-pulse">
    {/* Banner */}
    <div className="w-full h-44 sm:h-56 md:h-72 skeleton" />
    
    {/* Profile area */}
    <div className="max-w-screen-xl mx-auto px-4 md:px-8">
      <div className="flex items-end justify-between -mt-14 mb-6">
        <div className="skeleton w-28 h-28 rounded-full ring-4 ring-[#080808]" />
        <div className="flex gap-2 pb-2">
          <div className="skeleton h-9 w-24 rounded-full" />
          <div className="skeleton h-9 w-28 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-2 mb-6">
        <div className="skeleton h-7 w-52 rounded-lg" />
        <div className="skeleton h-4 w-80 rounded-lg" />
        <div className="skeleton h-4 w-64 rounded-lg mt-1" />
      </div>
      <div className="skeleton h-px w-full mb-1" />
    </div>
  </div>
);

const Channel = () => {
  const { username } = useParams();
  const { user: me, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('videos');
  const [bannerLoaded, setBannerLoaded] = useState(false);

  const isOwner = me?.username === username;

  // ── Fetch channel ─────────────────────────────────────────────────────────
  const { data: channel, isLoading: channelLoading } = useQuery({
    queryKey: ['channel', username],
    queryFn: () => userService.getChannel(username).then((r) => r.data.data.channel),
  });

  const subscriberCount = channel?.subscriberCount ?? 0;
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (channel) setSubscribed(channel.isSubscribed ?? false);
  }, [channel?._id, channel?.isSubscribed]);

  // ── Fetch channel videos ──────────────────────────────────────────────────
  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ['channel-videos', channel?._id],
    queryFn: () => videoService.getChannelVideos(channel._id).then((r) => r.data.data),
    enabled: !!channel?._id && activeTab === 'videos',
  });

  // ── Fetch channel series ──────────────────────────────────────────────────
  const { data: seriesData, isLoading: seriesLoading } = useQuery({
    queryKey: ['channel-series', channel?._id],
    queryFn: () => engagementService.getChannelSeries(channel._id).then((r) => r.data.data.series),
    enabled: !!channel?._id && activeTab === 'playlists',
  });

  // ── Subscribe ─────────────────────────────────────────────────────────────
  const subscribeMutation = useMutation({
    mutationFn: () => api.post(`/subscriptions/${channel._id}`),
    onSuccess: (res) => {
      const isNowSubscribed = res.data.data.subscribed;
      setSubscribed(isNowSubscribed);
      queryClient.invalidateQueries({ queryKey: ['channel', username] });
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || 'Failed to update subscription';
      toast.error(msg);
    },
  });

  // ── Loading ───────────────────────────────────────────────────────────────
  if (channelLoading) return <ChannelSkeleton />;

  if (!channel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <div className="w-20 h-20 rounded-3xl bg-[#111] border border-white/6 flex items-center justify-center">
          <Users size={32} className="text-[#333]" />
        </div>
        <div className="text-center">
          <p className="text-[#e0e0e0] font-semibold text-lg">Channel not found</p>
          <p className="text-sm text-[#555] mt-1">This channel doesn't exist or may have been removed.</p>
        </div>
        <Link to="/" className="text-sm text-[#3ea6ff] hover:underline">← Back to home</Link>
      </div>
    );
  }

  const videos = videosData?.videos ?? [];
  const seriesList = seriesData ?? [];
  const joinDate = channel.createdAt
    ? new Date(channel.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : null;

  const accentColor = stringToColorSolid(username);

  return (
    <div className="min-h-screen bg-[#080808]">

      {/* ═══════════════════════════════════════
          BANNER SECTION
      ════════════════════════════════════════ */}
      <div className="relative w-full h-44 sm:h-56 md:h-72 overflow-hidden">
        {channel.banner ? (
          <>
            {!bannerLoaded && (
              <div className="absolute inset-0 skeleton" />
            )}
            <motion.img
              src={channel.banner}
              alt="Channel banner"
              onLoad={() => setBannerLoaded(true)}
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: bannerLoaded ? 1 : 0, scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-full h-full object-cover"
            />
            {/* Multi-layer gradient for smooth fade into page background */}
            <div
              className="absolute inset-0"
              style={{
                background: `
                  linear-gradient(to bottom,
                    rgba(8,8,8,0.15) 0%,
                    rgba(8,8,8,0.0) 30%,
                    rgba(8,8,8,0.0) 55%,
                    rgba(8,8,8,0.65) 80%,
                    rgba(8,8,8,1) 100%
                  )
                `,
              }}
            />
            {/* Subtle vignette on sides */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to right, rgba(8,8,8,0.4) 0%, transparent 15%, transparent 85%, rgba(8,8,8,0.4) 100%)',
              }}
            />
          </>
        ) : (
          /* Generative gradient banner */
          <div className="absolute inset-0">
            {/* Base dark layer */}
            <div className="absolute inset-0 bg-[#0a0a0a]" />
            {/* Noise texture overlay */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                backgroundSize: '200px 200px',
              }}
            />
            {/* Radial color blobs */}
            <div
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse at 20% 60%, ${stringToColor(username, 0.45)} 0%, transparent 55%),
                  radial-gradient(ellipse at 75% 25%, ${stringToColor(username + 'x', 0.3)} 0%, transparent 45%),
                  radial-gradient(ellipse at 55% 80%, ${stringToColor(username + 'z', 0.2)} 0%, transparent 40%)
                `,
              }}
            />
            {/* Scanline effect */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)',
                backgroundSize: '100% 3px',
              }}
            />
            {/* Bottom fade */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, transparent 40%, rgba(8,8,8,0.7) 75%, rgba(8,8,8,1) 100%)',
              }}
            />
          </div>
        )}

        {/* Edit banner button */}
        {isOwner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute top-4 right-4"
          >
            <Link
              to="/settings"
              className="flex items-center gap-1.5 bg-black/50 hover:bg-black/75 backdrop-blur-md text-white/70 hover:text-white text-xs px-3.5 py-2 rounded-full border border-white/10 hover:border-white/20 transition-all duration-200 shadow-lg"
            >
              <Edit2 size={11} />
              Edit banner
            </Link>
          </motion.div>
        )}
      </div>

      {/* ═══════════════════════════════════════
          PROFILE SECTION — overlaps banner bottom
      ════════════════════════════════════════ */}
      <div className="max-w-screen-xl mx-auto px-4 md:px-8">

        {/* Avatar + Actions row */}
        <div className="flex items-end justify-between -mt-14 sm:-mt-16 mb-5 relative z-10">

          {/* Avatar with verified badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 180, damping: 20 }}
            className="relative"
          >
            <div
              className="rounded-full p-[3px]"
              style={{
                background: subscriberCount >= 1000
                  ? `linear-gradient(135deg, ${accentColor}, transparent)`
                  : 'transparent',
              }}
            >
              <Avatar
                src={channel.avatar}
                alt={channel.displayName}
                size="2xl"
                className="ring-[3px] ring-[#080808] shadow-2xl"
              />
            </div>
            {subscriberCount >= 1000 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#080808] rounded-full flex items-center justify-center shadow-lg"
              >
                <CheckCircle2 size={16} style={{ color: '#3ea6ff' }} />
              </motion.div>
            )}
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            className="flex items-center gap-2 pb-1"
          >
            {isOwner ? (
              <>
                <Link to="/upload">
                  <Button variant="secondary" size="sm">
                    <Upload size={14} />Upload
                  </Button>
                </Link>
                <Link to="/settings">
                  <Button variant="secondary" size="sm">
                    <Edit2 size={14} />Edit profile
                  </Button>
                </Link>
              </>
            ) : isAuthenticated ? (
              <>
                <Button
                  variant={subscribed ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => subscribeMutation.mutate()}
                  loading={subscribeMutation.isPending}
                >
                  {subscribed
                    ? <><BellOff size={14} />Subscribed</>
                    : <><Bell size={14} />Subscribe</>}
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="sm">
                  <Bell size={14} />Subscribe
                </Button>
              </Link>
            )}
          </motion.div>
        </div>

        {/* Channel name, handle, stats, bio */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="mb-1"
        >
          {/* Name + handle */}
          <div className="flex items-baseline gap-2.5 flex-wrap mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#f0f0f0] leading-tight tracking-tight">
              {channel.displayName}
            </h1>
            <span className="text-sm text-[#444] font-medium">@{channel.username}</span>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3">
            <StatPill icon={Users} value={formatCount(subscriberCount)} label="subscribers" />
            <div className="w-px h-3 bg-[#2a2a2a]" />
            <StatPill icon={PlaySquare} value={formatCount(videos.length)} label="videos" />
            {joinDate && (
              <>
                <div className="w-px h-3 bg-[#2a2a2a]" />
                <StatPill icon={Calendar} value={`Joined ${joinDate}`} label="" />
              </>
            )}
          </div>

          {/* Bio */}
          {channel.bio && (
            <p className="text-sm text-[#666] leading-relaxed line-clamp-2 max-w-2xl">
              {channel.bio}
            </p>
          )}
        </motion.div>

        {/* ── Divider ── */}
        <div className="h-px bg-white/5 mt-5 mb-0" />

        {/* ── Tabs ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex gap-0"
        >
          {TABS.map(({ id, label, icon: Icon }, i) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative flex items-center gap-2 px-5 py-4 text-sm font-medium transition-all duration-200
                ${activeTab === id ? 'text-[#f0f0f0]' : 'text-[#4a4a4a] hover:text-[#888]'}`}
            >
              <Icon size={14} />
              {label}
              {activeTab === id && (
                <motion.div
                  layoutId="channel-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                  style={{ background: '#f0f0f0' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </motion.div>

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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-5 py-28 text-center"
                  >
                    <div className="relative">
                      <div className="w-24 h-24 rounded-3xl bg-[#0f0f0f] border border-white/6 flex items-center justify-center">
                        <PlaySquare size={36} className="text-[#2a2a2a]" />
                      </div>
                      {/* Glow */}
                      <div
                        className="absolute inset-0 rounded-3xl blur-xl opacity-20"
                        style={{ background: accentColor }}
                      />
                    </div>
                    <div>
                      <p className="text-[#e0e0e0] font-semibold text-lg">No videos yet</p>
                      <p className="text-sm text-[#444] mt-1.5">
                        {isOwner
                          ? 'Upload your first video to get started.'
                          : "This channel hasn't uploaded any videos yet."}
                      </p>
                    </div>
                    {isOwner && (
                      <Link to="/upload">
                        <Button variant="primary" size="md">
                          <Upload size={15} />Upload video
                        </Button>
                      </Link>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === 'playlists' && (
              <motion.div
                key="playlists"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {seriesLoading ? (
                  <div className="flex justify-center py-16"><Spinner size="lg" /></div>
                ) : seriesList.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-5 py-28 text-center"
                  >
                    <div className="w-20 h-20 rounded-3xl bg-[#0f0f0f] border border-white/6 flex items-center justify-center">
                      <Film size={32} className="text-[#2a2a2a]" />
                    </div>
                    <div>
                      <p className="text-[#e0e0e0] font-semibold text-lg">No playlists yet</p>
                      <p className="text-sm text-[#444] mt-1.5">
                        {isOwner
                          ? 'Create a playlist to group your videos and show them on your channel.'
                          : "This channel hasn't created any playlists yet."}
                      </p>
                    </div>
                    {/* Only the channel owner can create playlists */}
                    {isOwner && (
                      <Link to="/series">
                        <Button variant="primary" size="md">
                          <Film size={15} />Create a Playlist
                        </Button>
                      </Link>
                    )}
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {seriesList.map((s) => (
                      <SeriesCard key={s._id} series={s} />
                    ))}
                  </div>
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

                  {/* Bio card */}
                  <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-6">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#3a3a3a] mb-3.5">
                      About
                    </h3>
                    <p className="text-sm text-[#bbb] whitespace-pre-wrap leading-relaxed">
                      {channel.bio
                        ? channel.bio
                        : <span className="text-[#333] italic">No description provided.</span>}
                    </p>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Subscribers', value: formatCount(subscriberCount), icon: Users },
                      { label: 'Videos',      value: formatCount(videos.length),   icon: PlaySquare },
                      { label: 'Joined',      value: joinDate || '—',              icon: Calendar },
                    ].map(({ label, value, icon: Icon }) => (
                      <motion.div
                        key={label}
                        whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.1)' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-3 cursor-default"
                      >
                        <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                          <Icon size={15} className="text-[#555]" />
                        </div>
                        <div>
                          <p className="text-xl font-bold text-[#f0f0f0] leading-none">{value}</p>
                          <p className="text-[11px] text-[#444] mt-1.5 uppercase tracking-wider font-medium">{label}</p>
                        </div>
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

export default Channel;