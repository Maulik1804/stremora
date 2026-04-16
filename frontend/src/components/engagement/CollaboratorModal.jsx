import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Trash2, Users, Clock, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { engagementService } from '../../services/engagement.service';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { toast } from '../ui/Toast';

const CollaboratorModal = ({ playlistId, playlistTitle, onClose, onCountChange }) => {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const queryClient = useQueryClient();

  // Existing collaborators + pending
  const { data, isLoading } = useQuery({
    queryKey: ['playlist-collaborators', playlistId],
    queryFn: () => engagementService.getCollaborators(playlistId).then((r) => r.data.data),
  });

  // User search autocomplete
  const { data: searchData, isFetching: isSearching } = useQuery({
    queryKey: ['user-search', input],
    queryFn: () => engagementService.searchUsers(input).then((r) => r.data.data.users),
    enabled: input.trim().length >= 1 && !selectedUser,
    staleTime: 300,
  });

  const suggestions = searchData ?? [];

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['playlist-collaborators', playlistId] });
    // Also invalidate the playlist itself so the count updates instantly
    queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
    queryClient.invalidateQueries({ queryKey: ['my-playlists'] });
  };

  const inviteMutation = useMutation({
    mutationFn: (usernameOrEmail) => engagementService.addCollaborator(playlistId, usernameOrEmail),
    onSuccess: (res) => {
      setInput('');
      setSelectedUser(null);
      setShowSuggestions(false);
      invalidate();
      toast.success('Invite sent — waiting for approval');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to send invite'),
  });

  const removeMutation = useMutation({
    mutationFn: (userId) => engagementService.removeCollaborator(playlistId, userId),
    onSuccess: () => {
      invalidate();
      toast.success('Collaborator removed');
    },
    onError: () => toast.error('Failed to remove collaborator'),
  });

  const handleInputChange = (e) => {
    setInput(e.target.value);
    setSelectedUser(null);
    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (user) => {
    setInput(user.username);
    setSelectedUser(user);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleAdd = () => {
    const value = input.trim();
    if (!value) return;
    inviteMutation.mutate(value);
  };

  const collaborators = data?.collaborators ?? [];
  const pending = data?.pendingCollaborators ?? [];

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
            {(collaborators.length + pending.length) > 0 && (
              <span className="text-xs bg-[#272727] text-[#aaa] px-2 py-0.5 rounded-full">
                {collaborators.length} active{pending.length > 0 ? ` · ${pending.length} pending` : ''}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[#272727] text-[#aaaaaa]">
            <X size={15} />
          </button>
        </div>

        <p className="text-xs text-[#606060] mb-4">
          Invite people to collaborate on{' '}
          <span className="text-[#aaaaaa]">"{playlistTitle}"</span>.
          They'll receive a notification to accept.
        </p>

        {/* Add collaborator input with autocomplete */}
        <div className="relative mb-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onFocus={() => input.trim().length >= 1 && setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && input.trim()) handleAdd();
                  if (e.key === 'Escape') setShowSuggestions(false);
                }}
                placeholder="Username or email"
                autoComplete="off"
                className="w-full bg-[#0f0f0f] border border-[#3f3f3f] rounded-xl px-4 py-2.5 text-sm text-[#f1f1f1] outline-none focus:border-[#606060] placeholder:text-[#606060]"
              />

              {/* Suggestions dropdown */}
              <AnimatePresence>
                {showSuggestions && input.trim().length >= 1 && (
                  <motion.div
                    ref={suggestionsRef}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-[#1f1f1f] border border-[#3f3f3f] rounded-xl overflow-hidden z-50 shadow-xl"
                  >
                    {isSearching ? (
                      <div className="flex justify-center py-3"><Spinner size="sm" /></div>
                    ) : suggestions.length === 0 ? (
                      <p className="text-xs text-[#606060] text-center py-3 px-4">No users found</p>
                    ) : (
                      suggestions.map((user) => (
                        <button
                          key={user._id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectSuggestion(user);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#2a2a2a] transition-colors text-left"
                        >
                          <Avatar src={user.avatar} alt={user.displayName} size="xs" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#f1f1f1] truncate">
                              {user.displayName || user.username}
                            </p>
                            <p className="text-xs text-[#606060]">@{user.username}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleAdd}
              disabled={!input.trim()}
              loading={inviteMutation.isPending}
              className="rounded-xl px-4 self-start"
            >
              <UserPlus size={14} />
              Invite
            </Button>
          </div>
        </div>

        {/* Collaborators list */}
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-6"><Spinner size="sm" /></div>
          ) : (collaborators.length === 0 && pending.length === 0) ? (
            <p className="text-sm text-[#606060] text-center py-6">No collaborators yet</p>
          ) : (
            <>
              {/* Active collaborators */}
              {collaborators.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={user.avatar} alt={user.displayName} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-[#f1f1f1] truncate">
                          {user.displayName || user.username}
                        </p>
                        <CheckCircle2 size={12} className="text-green-400 flex-shrink-0" />
                      </div>
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
              ))}

              {/* Pending invites */}
              {pending.map((p) => (
                <div
                  key={p.user._id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0f0f0f] border border-yellow-900/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={p.user.avatar} alt={p.user.displayName} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-[#f1f1f1] truncate">
                          {p.user.displayName || p.user.username}
                        </p>
                        <span className="flex items-center gap-0.5 text-[10px] text-yellow-400 bg-yellow-900/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          <Clock size={9} /> Pending
                        </span>
                      </div>
                      <p className="text-xs text-[#606060]">@{p.user.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMutation.mutate(p.user._id)}
                    disabled={removeMutation.isPending}
                    className="p-1.5 rounded-lg hover:bg-red-900/30 text-[#606060] hover:text-red-400 transition-colors flex-shrink-0"
                    aria-label="Cancel invite"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CollaboratorModal;
