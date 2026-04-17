import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, CheckCircle2, XCircle, ListVideo, Film } from 'lucide-react';
import { Link } from 'react-router-dom';
import { engagementService } from '../services/engagement.service';
import { videoService } from '../services/video.service';
import Avatar from '../components/ui/Avatar';
import Spinner from '../components/ui/Spinner';
import { toast } from '../components/ui/Toast';

// ── Playlist invite card ──────────────────────────────────────────────────────
const PlaylistInviteCard = ({ playlist, onAccept, onDecline, isPending }) => (
  <motion.div
    key={playlist._id}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4"
  >
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-[#272727] flex items-center justify-center flex-shrink-0">
        <ListVideo size={20} className="text-[#3ea6ff]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#3ea6ff] bg-[#3ea6ff]/10 px-2 py-0.5 rounded-full">Playlist</span>
        </div>
        <p className="text-sm font-semibold text-[#f1f1f1] truncate">{playlist.title}</p>
        {playlist.description && (
          <p className="text-xs text-[#606060] mt-0.5 line-clamp-1">{playlist.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <Avatar src={playlist.owner?.avatar} alt={playlist.owner?.displayName} size="xs" />
          <p className="text-xs text-[#aaaaaa]">
            Invited by{' '}
            <Link to={`/channel/${playlist.owner?.username}`} className="text-[#3ea6ff] hover:underline">
              {playlist.owner?.displayName || playlist.owner?.username}
            </Link>
          </p>
        </div>
      </div>
    </div>
    <div className="flex gap-2 mt-4">
      <button
        onClick={() => onAccept(playlist._id)}
        disabled={isPending}
        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-900/20 hover:bg-green-900/40 text-green-400 text-sm font-medium transition-colors border border-green-900/30 disabled:opacity-50"
      >
        <CheckCircle2 size={15} /> Accept
      </button>
      <button
        onClick={() => onDecline(playlist._id)}
        disabled={isPending}
        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[#1f1f1f] hover:bg-[#272727] text-[#aaaaaa] text-sm font-medium transition-colors border border-[#2a2a2a] disabled:opacity-50"
      >
        <XCircle size={15} /> Decline
      </button>
    </div>
  </motion.div>
);

// ── Video invite card ─────────────────────────────────────────────────────────
const VideoInviteCard = ({ video, onAccept, onDecline, isPending }) => (
  <motion.div
    key={video._id}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4"
  >
    <div className="flex items-start gap-4">
      {/* Thumbnail */}
      <div className="w-20 h-12 rounded-xl overflow-hidden bg-[#272727] flex-shrink-0">
        {video.thumbnailUrl
          ? <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Film size={16} className="text-[#444]" /></div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#e50914] bg-[#e50914]/10 px-2 py-0.5 rounded-full">Video Collab</span>
        </div>
        <p className="text-sm font-semibold text-[#f1f1f1] truncate">{video.title}</p>
        <div className="flex items-center gap-2 mt-2">
          <Avatar src={video.owner?.avatar} alt={video.owner?.displayName} size="xs" />
          <p className="text-xs text-[#aaaaaa]">
            Invited by{' '}
            <Link to={`/channel/${video.owner?.username}`} className="text-[#3ea6ff] hover:underline">
              {video.owner?.displayName || video.owner?.username}
            </Link>
          </p>
        </div>
      </div>
    </div>
    <div className="flex gap-2 mt-4">
      <button
        onClick={() => onAccept(video._id)}
        disabled={isPending}
        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-900/20 hover:bg-green-900/40 text-green-400 text-sm font-medium transition-colors border border-green-900/30 disabled:opacity-50"
      >
        <CheckCircle2 size={15} /> Accept
      </button>
      <button
        onClick={() => onDecline(video._id)}
        disabled={isPending}
        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[#1f1f1f] hover:bg-[#272727] text-[#aaaaaa] text-sm font-medium transition-colors border border-[#2a2a2a] disabled:opacity-50"
      >
        <XCircle size={15} /> Decline
      </button>
    </div>
  </motion.div>
);

// ── Page ──────────────────────────────────────────────────────────────────────
const CollabInvites = () => {
  const qc = useQueryClient();

  // Playlist invites
  const { data: playlistData, isLoading: playlistLoading } = useQuery({
    queryKey: ['collab-invites'],
    queryFn: () => engagementService.getPendingInvites().then((r) => r.data.data.invites),
  });

  // Video collab invites
  const { data: videoData, isLoading: videoLoading } = useQuery({
    queryKey: ['video-collab-invites'],
    queryFn: () => videoService.getMyVideoCollabInvites().then((r) => r.data.data.videos),
  });

  // Playlist mutations
  const acceptPlaylistMut = useMutation({
    mutationFn: (id) => engagementService.acceptCollabInvite(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collab-invites'] });
      qc.invalidateQueries({ queryKey: ['collaborative-playlists'] });
      toast.success('Playlist invite accepted!');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const declinePlaylistMut = useMutation({
    mutationFn: (id) => engagementService.declineCollabInvite(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['collab-invites'] }); toast.success('Invite declined'); },
    onError: () => toast.error('Failed to decline'),
  });

  // Video collab mutations
  const acceptVideoMut = useMutation({
    mutationFn: (id) => videoService.acceptCollabInvite(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['video-collab-invites'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      // Invalidate all video queries so Watch page updates instantly
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'video' });
      qc.invalidateQueries({ queryKey: ['dashboard-videos'] });
      qc.invalidateQueries({ queryKey: ['studio-videos'] });
      toast.success('Video collab accepted! The video now appears on your channel.');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const declineVideoMut = useMutation({
    mutationFn: (id) => videoService.declineCollabInvite(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['video-collab-invites'] }); toast.success('Invite declined'); },
    onError: () => toast.error('Failed to decline'),
  });

  const playlistInvites = playlistData ?? [];
  const videoInvites = videoData ?? [];
  const totalInvites = playlistInvites.length + videoInvites.length;
  const isLoading = playlistLoading || videoLoading;

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-[#272727] flex items-center justify-center">
          <Users size={18} className="text-[#3ea6ff]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#f1f1f1]">Collaboration Invites</h1>
          {totalInvites > 0 && (
            <p className="text-xs text-[#aaaaaa]">{totalInvites} pending invite{totalInvites !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : totalInvites === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
            <Users size={28} className="text-[#333]" />
          </div>
          <p className="text-[#f1f1f1] font-medium">No pending invites</p>
          <p className="text-sm text-[#555]">Video and playlist collab invites will appear here.</p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {/* Video collab invites first */}
            {videoInvites.map((video) => (
              <VideoInviteCard
                key={video._id}
                video={video}
                onAccept={(id) => acceptVideoMut.mutate(id)}
                onDecline={(id) => declineVideoMut.mutate(id)}
                isPending={acceptVideoMut.isPending || declineVideoMut.isPending}
              />
            ))}
            {/* Playlist collab invites */}
            {playlistInvites.map((playlist) => (
              <PlaylistInviteCard
                key={playlist._id}
                playlist={playlist}
                onAccept={(id) => acceptPlaylistMut.mutate(id)}
                onDecline={(id) => declinePlaylistMut.mutate(id)}
                isPending={acceptPlaylistMut.isPending || declinePlaylistMut.isPending}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default CollabInvites;
