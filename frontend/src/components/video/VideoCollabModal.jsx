import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, UserPlus, CheckCircle2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { videoService } from '../../services/video.service';
import { engagementService } from '../../services/engagement.service';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { toast } from '../ui/Toast';

const VideoCollabModal = ({ videoId, videoTitle, onClose }) => {
  const [input, setInput] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [invited, setInvited] = useState([]);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const qc = useQueryClient();

  // Search users — triggers on 1+ character, case-insensitive
  const { data: searchData, isFetching: isSearching } = useQuery({
    queryKey: ['user-search', input],
    queryFn: () => engagementService.searchUsers(input).then((r) => r.data.data.users),
    enabled: input.trim().length >= 1 && !selectedUser,
    staleTime: 200,
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

  const inviteMutation = useMutation({
    mutationFn: (usernameOrEmail) => videoService.inviteCollaborator(videoId, usernameOrEmail),
    onSuccess: (res) => {
      const invitee = res.data.data.invitee;
      setInvited((prev) => [...prev, invitee]);
      setInput('');
      setSelectedUser(null);
      setShowSuggestions(false);
      toast.success(`Collab invite sent to @${invitee.username}`);
      qc.invalidateQueries({ queryKey: ['video', videoId] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to send invite'),
  });

  const handleSelectSuggestion = (user) => {
    setInput(user.username);
    setSelectedUser(user);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleInvite = () => {
    const val = input.trim();
    if (!val) return;
    inviteMutation.mutate(val);
  };

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
          initial={{ scale: 0.92, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 12 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#1a1a1a] border border-[#3f3f3f] rounded-2xl p-6 w-full max-w-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#3ea6ff]" />
              <h3 className="text-base font-semibold text-[#f1f1f1]">Invite collaborator</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-[#272727] text-[#aaa]">
              <X size={15} />
            </button>
          </div>
          <p className="text-xs text-[#555] mb-5">
            Invite someone to collab on <span className="text-[#aaa]">"{videoTitle}"</span>.
            Once accepted, the video appears on both profiles.
          </p>

          {/* Input with autocomplete */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setSelectedUser(null);
                  setShowSuggestions(true);
                }}
                onFocus={() => input.trim().length >= 1 && setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && input.trim()) handleInvite();
                  if (e.key === 'Escape') setShowSuggestions(false);
                }}
                placeholder="Type username or email…"
                autoComplete="off"
                className="w-full bg-[#0f0f0f] border border-[#3f3f3f] rounded-xl px-4 py-2.5 text-sm text-[#f1f1f1] outline-none focus:border-[#606060] placeholder:text-[#555]"
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
                      <p className="text-xs text-[#555] text-center py-3 px-4">No users found</p>
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
                            <p className="text-xs text-[#555]">@{user.username}</p>
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
              onClick={handleInvite}
              disabled={!input.trim()}
              loading={inviteMutation.isPending}
              className="rounded-xl self-start"
            >
              <UserPlus size={14} />
              Invite
            </Button>
          </div>

          {/* Invited list */}
          {invited.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-[#555] font-medium uppercase tracking-widest">Invites sent</p>
              {invited.map((u) => (
                <div key={u._id} className="flex items-center gap-3 p-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl">
                  <Avatar src={u.avatar} alt={u.displayName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#f1f1f1] truncate">{u.displayName || u.username}</p>
                    <p className="text-xs text-[#555]">@{u.username}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#3ea6ff] bg-[#3ea6ff]/10 px-2.5 py-1 rounded-full flex-shrink-0">
                    ✓ Invite sent
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-5 flex justify-end">
            <Button variant="secondary" size="sm" onClick={onClose}>
              {invited.length > 0 ? 'Done' : 'Skip'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoCollabModal;
