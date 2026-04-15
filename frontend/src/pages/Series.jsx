import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film, Plus, Trash2, Eye, Globe, Lock,
  PlaySquare, AlertTriangle,
} from 'lucide-react';
import { engagementService } from '../services/engagement.service';
import api from '../services/api';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import CreateSeriesModal from '../components/series/CreateSeriesModal';
import { toast } from '../components/ui/Toast';
import { formatDistanceToNow } from '../utils/date';

// ── Delete confirm ────────────────────────────────────────────────────────────
const DeleteModal = ({ playlist, onConfirm, onCancel, isDeleting }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={onCancel}
  >
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.92, opacity: 0 }} transition={{ duration: 0.15 }}
      onClick={(e) => e.stopPropagation()}
      className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 max-w-sm w-full"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-red-900/20 flex items-center justify-center">
          <AlertTriangle size={20} className="text-red-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[#f1f1f1]">Delete playlist?</h3>
          <p className="text-xs text-[#555]">Videos won't be deleted, only the playlist</p>
        </div>
      </div>
      <p className="text-sm text-[#aaa] mb-5 line-clamp-2">"{playlist?.title}"</p>
      <div className="flex gap-3">
        <Button variant="secondary" size="md" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button variant="danger" size="md" onClick={onConfirm} loading={isDeleting} className="flex-1">Delete</Button>
      </div>
    </motion.div>
  </motion.div>
);

// ── Playlist row ──────────────────────────────────────────────────────────────
const PlaylistRow = ({ playlist, onDelete }) => {
  const episodeCount = playlist.episodeCount ?? playlist.videos?.length ?? 0;
  const thumbnail = playlist.seriesThumbnail || playlist.videos?.[0]?.thumbnailUrl;

  return (
    <motion.tr
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="border-b border-[#1a1a1a] hover:bg-[#161616] transition-colors group"
    >
      {/* Thumbnail + title */}
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-24 aspect-video rounded-lg overflow-hidden bg-[#1a1a1a] flex-shrink-0 relative">
            {thumbnail
              ? <img src={thumbnail} alt={playlist.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Film size={16} className="text-[#333]" /></div>
            }
            <div className="absolute top-1 left-1 bg-[#ff0000]/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
              Playlist
            </div>
          </div>
          <div className="min-w-0">
            <Link
              to={`/channel-playlist/${playlist._id}`}
              className="text-sm font-medium text-[#f1f1f1] hover:text-white line-clamp-2 leading-snug"
            >
              {playlist.title}
            </Link>
            {playlist.description && (
              <p className="text-xs text-[#444] mt-0.5 line-clamp-1">{playlist.description}</p>
            )}
          </div>
        </div>
      </td>

      {/* Visibility */}
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
          ${playlist.visibility === 'public' ? 'bg-green-900/20 text-green-400' : 'bg-[#1f1f1f] text-[#555]'}`}
        >
          {playlist.visibility === 'public' ? <Globe size={10} /> : <Lock size={10} />}
          {playlist.visibility}
        </span>
      </td>

      {/* Videos */}
      <td className="px-4 py-3">
        <span className="flex items-center gap-1.5 text-sm text-[#aaa]">
          <PlaySquare size={13} className="text-[#555]" />
          {episodeCount}
        </span>
      </td>

      {/* Date */}
      <td className="px-4 py-3 text-xs text-[#444] whitespace-nowrap">
        {formatDistanceToNow(playlist.createdAt)}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link to={`/channel-playlist/${playlist._id}`}>
            <button className="p-1.5 rounded-lg hover:bg-[#1f1f1f] text-[#555] hover:text-[#f1f1f1] transition-colors" title="View">
              <Eye size={15} />
            </button>
          </Link>
          <button
            onClick={() => onDelete(playlist)}
            className="p-1.5 rounded-lg hover:bg-red-900/20 text-[#555] hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </motion.tr>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const ChannelPlaylists = () => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-series'],
    queryFn: () => engagementService.getMySeries().then((r) => r.data.data.series),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/playlists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-series'] });
      setDeleteTarget(null);
      toast.success('Playlist deleted');
    },
    onError: () => toast.error('Failed to delete playlist'),
  });

  const playlists = data ?? [];

  return (
    <>
      <AnimatePresence>
        {showCreate && (
          <CreateSeriesModal
            onClose={() => setShowCreate(false)}
            onCreated={() => queryClient.invalidateQueries({ queryKey: ['my-series'] })}
          />
        )}
        {deleteTarget && (
          <DeleteModal
            playlist={deleteTarget}
            onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
            onCancel={() => setDeleteTarget(null)}
            isDeleting={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>

      <div className="px-4 py-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#f1f1f1]">Channel Playlists</h1>
            <p className="text-sm text-[#555] mt-0.5">
              Organize your videos into playlists — visible on your channel page
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} />
            New Playlist
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center items-center h-48"><Spinner size="lg" /></div>
        ) : playlists.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-5 py-24 text-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-[#0f0f0f] border border-[#1f1f1f] flex items-center justify-center">
              <Film size={32} className="text-[#2a2a2a]" />
            </div>
            <div>
              <p className="text-[#e0e0e0] font-semibold text-lg">No channel playlists yet</p>
              <p className="text-sm text-[#444] mt-1.5 max-w-xs">
                Create a playlist to group your videos — perfect for series, courses, or multi-part content.
              </p>
            </div>
            <Button variant="primary" size="md" onClick={() => setShowCreate(true)}>
              <Plus size={15} />
              Create your first playlist
            </Button>
          </motion.div>
        ) : (
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1a1a1a] text-[#444] text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-medium">Playlist</th>
                    <th className="text-left px-4 py-3 font-medium">Visibility</th>
                    <th className="text-left px-4 py-3 font-medium">
                      <span className="flex items-center gap-1"><PlaySquare size={12} /> Videos</span>
                    </th>
                    <th className="text-left px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {playlists.map((p) => (
                    <PlaylistRow key={p._id} playlist={p} onDelete={setDeleteTarget} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ChannelPlaylists;
