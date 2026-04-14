import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, UserPlus, Trash2, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { engagementService } from '../../services/engagement.service';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { toast } from '../ui/Toast';

const CollaboratorModal = ({ playlistId, playlistTitle, onClose }) => {
  const [input, setInput] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['playlist-collaborators', playlistId],
    queryFn: () => engagementService.getCollaborators(playlistId).then((r) => r.data.data.collaborators),
  });

  const addMutation = useMutation({
    mutationFn: () => engagementService.addCollaborator(playlistId, input.trim()),
    onSuccess: () => {
      setInput('');
      queryClient.invalidateQueries({ queryKey: ['playlist-collaborators', playlistId] });
      toast.success('Collaborator added');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add collaborator'),
  });

  const removeMutation = useMutation({
    mutationFn: (userId) => engagementService.removeCollaborator(playlistId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist-collaborators', playlistId] });
      toast.success('Collaborator removed');
    },
    onError: () => toast.error('Failed to remove collaborator'),
  });

  const collaborators = data ?? [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 12 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1a1a] border border-[#3f3f3f] rounded-2xl p-6 w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#3ea6ff]" />
            <h3 className="text-base font-semibold text-[#f1f1f1]">Collaborators</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[#272727] text-[#aaaaaa]">
            <X size={15} />
          </button>
        </div>

        <p className="text-xs text-[#606060] mb-4">
          Collaborators can add and remove videos from <span className="text-[#aaaaaa]">"{playlistTitle}"</span>
        </p>

        {/* Add collaborator input */}
        <div className="flex gap-2 mb-5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && input.trim() && addMutation.mutate()}
            placeholder="Username or email"
            className="flex-1 bg-[#0f0f0f] border border-[#3f3f3f] rounded-xl px-4 py-2.5 text-sm text-[#f1f1f1] outline-none focus:border-[#606060] placeholder:text-[#606060]"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => input.trim() && addMutation.mutate()}
            disabled={!input.trim()}
            loading={addMutation.isPending}
            className="rounded-xl px-4"
          >
            <UserPlus size={14} />
            Add
          </Button>
        </div>

        {/* Collaborators list */}
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-6"><Spinner size="sm" /></div>
          ) : collaborators.length === 0 ? (
            <p className="text-sm text-[#606060] text-center py-6">No collaborators yet</p>
          ) : (
            collaborators.map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={user.avatar} alt={user.displayName} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#f1f1f1] truncate">{user.displayName || user.username}</p>
                    <p className="text-xs text-[#606060]">@{user.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeMutation.mutate(user._id)}
                  disabled={removeMutation.isPending}
                  className="p-1.5 rounded-lg hover:bg-red-900/30 text-[#606060] hover:text-red-400 transition-colors flex-shrink-0"
                  aria-label="Remove collaborator"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CollaboratorModal;
