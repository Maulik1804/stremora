import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Eye, ThumbsUp, Users, PlaySquare,
  TrendingUp, Upload, BarChart2, Clock,
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/ui/StatCard';
import Spinner from '../components/ui/Spinner';
import XPStreakCard from '../components/features/XPStreakCard';
import { formatCount, formatDuration } from '../utils/format';
import { formatDistanceToNow } from '../utils/date';
import { useAuth } from '../hooks/useAuth';

const PERIODS = [
  { value: '7',   label: 'Last 7 days' },
  { value: '28',  label: 'Last 28 days' },
  { value: '90',  label: 'Last 90 days' },
  { value: '365', label: 'Last year' },
];

// ── Mini bar chart (pure CSS) ─────────────────────────────────────────────────
const MiniBarChart = ({ data = [], color = '#ff0000' }) => {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-0.5 h-16">
      {data.map((d, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${(d.value / max) * 100}%` }}
          transition={{ duration: 0.4, delay: i * 0.02 }}
          className="flex-1 rounded-sm min-h-[2px]"
          style={{ backgroundColor: color }}
          title={`${d.label}: ${d.value}`}
        />
      ))}
    </div>
  );
};

// ── Video row in recent table ─────────────────────────────────────────────────
const VideoRow = ({ video }) => (
  <tr className="border-b border-[#1f1f1f] hover:bg-[#1a1a1a] transition-colors">
    <td className="py-3 pr-4">
      <div className="flex items-center gap-3">
        <div className="w-20 aspect-video rounded-lg overflow-hidden bg-[#272727] flex-shrink-0">
          {video.thumbnailUrl && (
            <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <Link
            to={`/watch/${video._id}`}
            className="text-sm font-medium text-[#f1f1f1] hover:text-white line-clamp-1"
          >
            {video.title}
          </Link>
          <p className="text-xs text-[#606060] mt-0.5">{formatDistanceToNow(video.createdAt)}</p>
        </div>
      </div>
    </td>
    <td className="py-3 pr-4 text-sm text-[#aaaaaa] tabular-nums">{formatCount(video.viewCount)}</td>
    <td className="py-3 pr-4 text-sm text-[#aaaaaa] tabular-nums">{formatCount(video.likeCount)}</td>
    <td className="py-3 pr-4 text-sm text-[#aaaaaa] tabular-nums">{formatCount(video.commentCount)}</td>
    <td className="py-3">
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium
        ${video.status === 'published' ? 'bg-green-900/40 text-green-400'
          : video.status === 'processing' ? 'bg-yellow-900/40 text-yellow-400'
          : 'bg-red-900/40 text-red-400'}`}
      >
        {video.status}
      </span>
    </td>
    <td className="py-3">
      <Link
        to={`/studio/edit/${video._id}`}
        className="text-xs text-[#3ea6ff] hover:underline"
      >
        Edit
      </Link>
    </td>
  </tr>
);

// ── Page ──────────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('28');

  // Channel-level stats (aggregate from videos)
  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ['dashboard-videos'],
    queryFn: () => api.get('/videos').then((r) => r.data.data),
  });

  // Subscriber count
  const { data: subData } = useQuery({
    queryKey: ['subscriber-count', user?._id],
    queryFn: () => api.get(`/subscriptions/channel/${user._id}`).then((r) => r.data.data),
    enabled: !!user?._id,
  });

  const videos = videosData?.videos ?? [];

  // Compute aggregate stats from video list
  const totalViews    = videos.reduce((s, v) => s + (v.viewCount ?? 0), 0);
  const totalLikes    = videos.reduce((s, v) => s + (v.likeCount ?? 0), 0);
  const totalComments = videos.reduce((s, v) => s + (v.commentCount ?? 0), 0);
  const subscriberCount = subData?.subscriberCount ?? 0;

  // Build a simple time-series from video upload dates (last N days)
  const buildTimeSeries = (days) => {
    const now = Date.now();
    const buckets = Array.from({ length: Math.min(days, 28) }, (_, i) => {
      const d = new Date(now - (Math.min(days, 28) - 1 - i) * 86400000);
      return {
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: 0,
      };
    });
    videos.forEach((v) => {
      const age = Math.floor((now - new Date(v.createdAt).getTime()) / 86400000);
      if (age < Math.min(days, 28)) {
        const idx = Math.min(days, 28) - 1 - age;
        if (buckets[idx]) buckets[idx].value += v.viewCount ?? 0;
      }
    });
    return buckets;
  };

  const viewSeries = buildTimeSeries(Number(period));

  const recentVideos = [...videos]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  const topVideos = [...videos]
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, 5);

  return (
    <div className="px-4 py-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f1f1f1]">Dashboard</h1>
          <p className="text-sm text-[#aaaaaa] mt-0.5">
            Welcome back, {user?.displayName || user?.username}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
            {PERIODS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors
                  ${period === value ? 'bg-[#ff0000] text-white' : 'text-[#aaaaaa] hover:text-[#f1f1f1]'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <Link to="/upload">
            <button className="flex items-center gap-2 px-4 py-2 bg-[#ff0000] hover:bg-[#cc0000] text-white text-sm font-medium rounded-xl transition-colors">
              <Upload size={15} />
              Upload
            </button>
          </Link>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total views"       value={formatCount(totalViews)}       icon={Eye}       color="text-blue-400"   loading={videosLoading} />
        <StatCard label="Subscribers"       value={formatCount(subscriberCount)}  icon={Users}     color="text-purple-400" loading={videosLoading} />
        <StatCard label="Total likes"       value={formatCount(totalLikes)}       icon={ThumbsUp}  color="text-green-400"  loading={videosLoading} />
        <StatCard label="Videos uploaded"   value={formatCount(videos.length)}    icon={PlaySquare} color="text-orange-400" loading={videosLoading} />
      </div>

      {/* ── XP + Streak (Feature 4) ── */}
      <div className="mb-8">
        <XPStreakCard />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Views over time */}
        <div className="lg:col-span-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-[#aaaaaa]" />
              <span className="text-sm font-semibold text-[#f1f1f1]">Views over time</span>
            </div>
            <span className="text-xs text-[#606060]">{PERIODS.find((p) => p.value === period)?.label}</span>
          </div>
          {videosLoading ? (
            <div className="h-16 bg-[#272727] rounded-lg animate-pulse" />
          ) : (
            <MiniBarChart data={viewSeries} color="#ff0000" />
          )}
          <div className="flex justify-between mt-2">
            <span className="text-xs text-[#606060]">{viewSeries[0]?.label}</span>
            <span className="text-xs text-[#606060]">{viewSeries[viewSeries.length - 1]?.label}</span>
          </div>
        </div>

        {/* Top videos */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-[#aaaaaa]" />
            <span className="text-sm font-semibold text-[#f1f1f1]">Top videos</span>
          </div>
          {videosLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-[#272727] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : topVideos.length === 0 ? (
            <p className="text-sm text-[#606060]">No videos yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topVideos.map((v, i) => (
                <div key={v._id} className="flex items-center gap-3">
                  <span className="text-sm font-black text-[#3f3f3f] w-4 flex-shrink-0">#{i + 1}</span>
                  <div className="w-10 aspect-video rounded bg-[#272727] overflow-hidden flex-shrink-0">
                    {v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#f1f1f1] line-clamp-1">{v.title}</p>
                    <p className="text-xs text-[#606060]">{formatCount(v.viewCount)} views</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent videos table ── */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#aaaaaa]" />
            <span className="text-sm font-semibold text-[#f1f1f1]">Recent videos</span>
          </div>
          <Link to="/studio" className="text-xs text-[#3ea6ff] hover:underline">
            View all in Studio →
          </Link>
        </div>

        {videosLoading ? (
          <div className="p-5 flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-[#272727] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentVideos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <PlaySquare size={36} className="text-[#606060]" />
            <p className="text-sm text-[#aaaaaa]">No videos uploaded yet</p>
            <Link to="/upload">
              <button className="text-sm text-[#3ea6ff] hover:underline">Upload your first video</button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f1f1f] text-[#606060] text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-medium">Video</th>
                  <th className="text-left px-4 py-3 font-medium">Views</th>
                  <th className="text-left px-4 py-3 font-medium">Likes</th>
                  <th className="text-left px-4 py-3 font-medium">Comments</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {recentVideos.map((v) => <VideoRow key={v._id} video={v} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
