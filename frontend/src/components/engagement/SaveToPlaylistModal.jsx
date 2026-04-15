import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check, Lock, Globe, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { engagementService } from '../../services/engagement.service';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../ui/Toast';

const SaveToPlaylistModal = ({ videoId, onClose }) => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [saved, setSaved] = useState(new Set());

  // Guard — should not be reachable without auth, but just in case
  if (!isAuthenticated) {
    toast.warning('Sign in to save videos to playlists');
    onClose();
    return null;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['my-playlists'],
    queryFn: () => engagementService.getMyPlaylists().then((r) => r.data.data),
  });

  const playlists = data?.playlists ?? [];

  const toggleMutation = useMutation({
    mutationFn: ({ playlistId, isIn }) =>
      isIn
        ? engagementService.removeFromPlaylist(playlistId, videoId)
        : engagementService.addToPlaylist(playlistId, videoId),
    onSuccess: (_, { playlistId, isIn }) => {
      setSaved((prev) => {
        const next = new Set(prev);
        if (isIn) next.delete(playlistId);
        else next.add(playlistId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['my-playlists'] });
      toast.success(isIn ? 'Removed from playlist' : 'Saved to playlist');
    },
    onError: () => toast.error('Failed to update playlist'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      engagementService.createPlaylist({ title: newTitle.trim(), visibility: 'private' }),
    onSuccess: (res) => {
      const pl = res.data.data.playlist;
      queryClient.invalidateQueries({ queryKey: ['my-playlists'] });
      toggleMutation.mutate({ playlistId: pl._id, isIn: false });
      setNewTitle('');
      setCreating(false);
    },
    onError: () => toast.error('Failed to create playlist'),
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 12 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#1a1a1a] border border-[#3f3f3f] rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
            <h3 className="text-sm font-semibold text-[#f1f1f1]">Save to playlist</h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-[#272727] text-[#aaaaaa]">
              <X size={15} />
            </button>
          </div>

          {/* Playlist list */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="text-[#aaaaaa] animate-spin" />
              </div>
            ) : playlists.length === 0 ? (
              <p className="text-sm text-[#606060] text-center py-6">No playlists yet</p>
            ) : (
              playlists.map((pl) => {
                const isIn = saved.has(pl._id) ||
                  (pl.videos ?? []).some((v) => (v._id ?? v) === videoId);
                return (
                  <button
                    key={pl._id}
                    onClick={() => toggleMutation.mutate({ playlistId: pl._id, isIn })}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#272727] transition-colors"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors
                      ${isIn ? 'bg-[#3ea6ff] border-[#3ea6ff]' : 'border-[#606060]'}`}
                    >
                      {isIn && <Check size={10} className="text-white" />}
                    </div>
                    <span className="text-sm text-[#f1f1f1] flex-1 text-left truncate">{pl.title}</span>
                    {pl.visibility === 'private'
                      ? <Lock size={12} className="text-[#606060] flex-shrink-0" />
                      : <Globe size={12} className="text-[#606060] flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Create new playlist */}
          <div className="border-t border-[#2a2a2a] px-5 py-3">
            {creating ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && newTitle.trim() && createMutation.mutate()}
                  placeholder="Playlist name"
                  maxLength={150}
                  className="flex-1 bg-[#0f0f0f] border border-[#3f3f3f] rounded-lg px-3 py-1.5 text-sm text-[#f1f1f1] outline-none focus:border-[#606060]"
                />
                <button
                  onClick={() => newTitle.trim() && createMutation.mutate()}
                  disabled={!newTitle.trim() || createMutation.isPending}
                  className="px-3 py-1.5 bg-[#3ea6ff] hover:bg-[#3ea6ff]/80 disabled:opacity-40 text-[#0f0f0f] text-xs font-medium rounded-lg transition-colors"
                >
                  {createMutation.isPending ? '…' : 'Create'}
                </button>
                <button
                  onClick={() => { setCreating(false); setNewTitle(''); }}
                  className="p-1.5 text-[#aaaaaa] hover:text-[#f1f1f1]"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-2 text-sm text-[#3ea6ff] hover:text-[#3ea6ff]/80 transition-colors"
              >
                <Plus size={15} />
                New playlist
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SaveToPlaylistModal;
