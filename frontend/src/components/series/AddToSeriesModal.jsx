import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Film, Check, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { engagementService } from '../../services/engagement.service';
import { toast } from '../ui/Toast';
import Button from '../ui/Button';

const AddToSeriesModal = ({ videoId, onClose }) => {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['my-series'],
    queryFn: () => engagementService.getMySeries().then((r) => r.data.data.series),
  });

  const playlists = data ?? [];

  const toggleMutation = useMutation({
    mutationFn: ({ playlistId, isIn }) =>
      isIn
        ? engagementService.removeFromSeries(playlistId, videoId)
        : engagementService.addToSeries(playlistId, videoId),
    onSuccess: (_, { playlistId, isIn }) => {
      setSaved((prev) => {
        const next = new Set(prev);
        if (isIn) next.delete(playlistId);
        else next.add(playlistId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['my-series'] });
      toast.success(isIn ? 'Removed from playlist' : 'Added to playlist');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update playlist');
    },
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 12 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#141414] border border-[#2a2a2a] rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f1f1f]">
            <div className="flex items-center gap-2">
              <Film size={15} className="text-[#ff0000]" />
              <h3 className="text-sm font-semibold text-[#f1f1f1]">Add to Channel Playlist</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-[#1f1f1f] text-[#555]">
              <X size={15} />
            </button>
          </div>

          {/* Playlist list */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="text-[#555] animate-spin" />
              </div>
            ) : playlists.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center px-4">
                <Film size={28} className="text-[#333]" />
                <p className="text-sm text-[#555]">No channel playlists yet</p>
                <p className="text-xs text-[#444]">Create one from the Channel Playlists page</p>
              </div>
            ) : (
              playlists.map((p) => {
                const isIn = saved.has(p._id) ||
                  (p.videos ?? []).some((v) => (v._id ?? v) === videoId);
                const thumbnail = p.seriesThumbnail || p.videos?.[0]?.thumbnailUrl;
                return (
                  <button
                    key={p._id}
                    onClick={() => toggleMutation.mutate({ playlistId: p._id, isIn })}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-8 rounded-lg overflow-hidden bg-[#1f1f1f] flex-shrink-0">
                      {thumbnail
                        ? <img src={thumbnail} alt={p.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Film size={12} className="text-[#444]" /></div>
                      }
                    </div>
                    {/* Title */}
                    <span className="text-sm text-[#f1f1f1] flex-1 text-left truncate">{p.title}</span>
                    {/* Check */}
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors
                      ${isIn ? 'bg-[#ff0000] border-[#ff0000]' : 'border-[#444]'}`}
                    >
                      {isIn && <Check size={10} className="text-white" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#1f1f1f] px-5 py-3">
            <Button variant="secondary" size="sm" onClick={onClose} className="w-full rounded-xl">
              Done
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddToSeriesModal;
