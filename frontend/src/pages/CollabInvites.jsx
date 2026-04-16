import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, CheckCircle2, XCircle, ListVideo } from 'lucide-react';
import { Link } from 'react-router-dom';
import { engagementService } from '../services/engagement.service';
import Avatar from '../components/ui/Avatar';
import Spinner from '../components/ui/Spinner';
import { toast } from '../components/ui/Toast';

const CollabInvites = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['collab-invites'],
    queryFn: () => engagementService.getPendingInvites().then((r) => r.data.data.invites),
  });

  const acceptMutation = useMutation({
    mutationFn: (playlistId) => engagementService.acceptCollabInvite(playlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-invites'] });
      queryClient.invalidateQueries({ queryKey: ['collaborative-playlists'] });
      toast.success('Invite accepted! You are now a collaborator.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to accept invite'),
  });

  const declineMutation = useMutation({
    mutationFn: (playlistId) => engagementService.declineCollabInvite(playlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-invites'] });
      toast.success('Invite declined');
    },
    onError: () => toast.error('Failed to decline invite'),
  });

  const invites = data ?? [];

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-[#272727] flex items-center justify-center">
          <Users size={18} className="text-[#3ea6ff]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#f1f1f1]">Collaboration Invites</h1>
          {invites.length > 0 && (
            <p className="text-xs text-[#aaaaaa]">{invites.length} pending invite{invites.length !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : invites.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
            <Users size={28} className="text-[#333]" />
          </div>
          <p className="text-[#f1f1f1] font-medium">No pending invites</p>
          <p className="text-sm text-[#555]">When someone invites you to collaborate on a playlist, it'll appear here.</p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {invites.map((playlist) => (
              <motion.div
                key={playlist._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Playlist icon */}
                  <div className="w-12 h-12 rounded-xl bg-[#272727] flex items-center justify-center flex-shrink-0">
                    <ListVideo size={20} className="text-[#3ea6ff]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#f1f1f1] truncate">{playlist.title}</p>
                    {playlist.description && (
                      <p className="text-xs text-[#606060] mt-0.5 line-clamp-1">{playlist.description}</p>
                    )}

                    {/* Owner info */}
                    <div className="flex items-center gap-2 mt-2">
                      <Avatar src={playlist.owner?.avatar} alt={playlist.owner?.displayName} size="xs" />
                      <p className="text-xs text-[#aaaaaa]">
                        Invited by{' '}
                        <Link
                          to={`/channel/${playlist.owner?.username}`}
                          className="text-[#3ea6ff] hover:underline"
                        >
                          {playlist.owner?.displayName || playlist.owner?.username}
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => acceptMutation.mutate(playlist._id)}
                    disabled={acceptMutation.isPending || declineMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-900/20 hover:bg-green-900/40 text-green-400 text-sm font-medium transition-colors border border-green-900/30"
                  >
                    <CheckCircle2 size={15} />
                    Accept
                  </button>
                  <button
                    onClick={() => declineMutation.mutate(playlist._id)}
                    disabled={acceptMutation.isPending || declineMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[#1f1f1f] hover:bg-[#272727] text-[#aaaaaa] text-sm font-medium transition-colors border border-[#2a2a2a]"
                  >
                    <XCircle size={15} />
                    Decline
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default CollabInvites;
