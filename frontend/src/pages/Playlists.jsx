import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ListVideo, Plus, Lock, Globe, Clock, Trash2, X, Users } from 'lucide-react';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import { engagementService } from '../services/engagement.service';
import api from '../services/api';

// ── Create playlist modal ─────────────────────────────────────────────────────
const CreateModal = ({ onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState('private');

  const mutation = useMutation({
    mutationFn: () => engagementService.createPlaylist({ title: title.trim(), visibility }),
    onSuccess: (res) => { onCreated(res.data.data.playlist); onClose(); },
  });

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
        className="bg-[#1a1a1a] border border-[#3f3f3f] rounded-2xl p-6 w-full max-w-sm"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-[#f1f1f1]">New playlist</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[#272727] text-[#aaaaaa]">
            <X size={15} />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && title.trim() && mutation.mutate()}
            placeholder="Playlist name"
            maxLength={150}
            className="w-full bg-[#0f0f0f] border border-[#3f3f3f] rounded-xl px-4 py-3 text-sm
                       text-[#f1f1f1] outline-none focus:border-[#606060]"
          />
          <div className="flex gap-2">
            {['public', 'private'].map((v) => (
              <button
                key={v}
                onClick={() => setVisibility(v)}
                className={`flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl text-sm font-medium border transition-colors
                  ${visibility === v
                    ? 'border-[#f1f1f1] bg-[#272727] text-[#f1f1f1]'
                    : 'border-[#3f3f3f] text-[#aaaaaa] hover:border-[#606060]'}`}
              >
                {v === 'private' ? <Lock size={13} /> : <Globe size={13} />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => title.trim() && mutation.mutate()}
            disabled={!title.trim()}
            loading={mutation.isPending}
            className="w-full rounded-xl"
          >
            Create playlist
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Playlist card ─────────────────────────────────────────────────────────────
const PlaylistCard = ({ playlist, onDelete, showOwner = false }) => {
  const isWatchLater = playlist.isWatchLater;
  const count = playlist.videos?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden
                 hover:border-[#3f3f3f] transition-colors"
    >
      {/* Thumbnail */}
      <Link to={`/playlists/${playlist._id}`} className="block">
        <div className="relative aspect-video bg-[#272727]">
          {playlist.videos?.[0]?.thumbnailUrl ? (
            <img
              src={playlist.videos[0].thumbnailUrl}
              alt={playlist.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {isWatchLater
                ? <Clock size={32} className="text-[#606060]" />
                : <ListVideo size={32} className="text-[#606060]" />}
            </div>
          )}
          {/* Video count */}
          <div className="absolute bottom-0 right-0 bg-black/80 px-2 py-1 text-xs text-white font-medium">
            {count} video{count !== 1 ? 's' : ''}
          </div>
          {/* Collaborative badge */}
          {playlist.collaborators?.length > 0 && (
            <div className="absolute top-2 left-2 bg-[#3ea6ff]/20 border border-[#3ea6ff]/40
                            text-[#3ea6ff] text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <Users size={10} />
              Collab
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={`/playlists/${playlist._id}`}
              className="text-sm font-semibold text-[#f1f1f1] hover:text-white line-clamp-1"
            >
              {playlist.title}
            </Link>
            {showOwner && playlist.owner && (
              <p className="text-xs text-[#3ea6ff] mt-0.5 truncate">
                by {playlist.owner.displayName || playlist.owner.username}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              {playlist.visibility === 'private'
                ? <Lock size={11} className="text-[#606060]" />
                : <Globe size={11} className="text-[#606060]" />}
              <span className="text-xs text-[#606060] capitalize">{playlist.visibility}</span>
            </div>
          </div>
          {/* Delete — only for own non-WatchLater playlists */}
          {!isWatchLater && !showOwner && (
            <button
              onClick={() => onDelete(playlist._id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg
                         hover:bg-red-900/30 text-[#606060] hover:text-red-400"
              aria-label="Delete playlist"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const Playlists = () => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState('mine'); // 'mine' | 'collaborative'

  // Personal playlists — isSeries playlists are excluded by the backend
  const { data, isLoading } = useQuery({
    queryKey: ['my-playlists'],
    queryFn: () => engagementService.getMyPlaylists().then((r) => r.data.data),
  });

  // Playlists where the user is a collaborator
  const { data: collabData, isLoading: collabLoading } = useQuery({
    queryKey: ['collaborative-playlists'],
    queryFn: () => engagementService.getCollaborativePlaylists().then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/playlists/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-playlists'] }),
  });

  const playlists     = data?.playlists ?? [];
  const collabPlaylists = collabData?.playlists ?? [];
  const activeList    = tab === 'mine' ? playlists : collabPlaylists;
  const activeLoading = tab === 'mine' ? isLoading : collabLoading;

  return (
    <>
      <AnimatePresence>
        {showCreate && (
          <CreateModal
            onClose={() => setShowCreate(false)}
            onCreated={() => queryClient.invalidateQueries({ queryKey: ['my-playlists'] })}
          />
        )}
      </AnimatePresence>

      <div className="px-4 py-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#272727] flex items-center justify-center">
              <ListVideo size={18} className="text-[#f1f1f1]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#f1f1f1]">Playlists</h1>
              <p className="text-xs text-[#555] mt-0.5">Your personal saved playlists</p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} />
            New playlist
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#1a1a1a] p-1 rounded-xl w-fit">
          {[
            { key: 'mine',          label: 'My Playlists',   icon: ListVideo },
            { key: 'collaborative', label: 'Collaborative',  icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
                ${tab === key ? 'bg-[#272727] text-[#f1f1f1]' : 'text-[#606060] hover:text-[#aaaaaa]'}`}
            >
              <Icon size={14} />
              {label}
              {key === 'collaborative' && collabPlaylists.length > 0 && (
                <span className="ml-1 bg-[#3ea6ff]/20 text-[#3ea6ff] text-xs px-1.5 py-0.5 rounded-full">
                  {collabPlaylists.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        {activeLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[#1a1a1a] rounded-2xl overflow-hidden">
                <div className="aspect-video bg-[#272727] animate-pulse" />
                <div className="p-4 flex flex-col gap-2">
                  <div className="h-3 bg-[#272727] rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-[#272727] rounded animate-pulse w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : activeList.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            {tab === 'mine'
              ? <ListVideo size={40} className="text-[#606060]" />
              : <Users size={40} className="text-[#606060]" />}
            <p className="text-[#f1f1f1] font-medium">
              {tab === 'mine' ? 'No playlists yet' : 'No collaborative playlists'}
            </p>
            <p className="text-sm text-[#aaaaaa]">
              {tab === 'mine'
                ? 'Save videos to a playlist to watch them later'
                : "You haven't been added as a collaborator to any playlist yet"}
            </p>
            {tab === 'mine' && (
              <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                <Plus size={14} />
                Create playlist
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeList.map((pl) => (
              <PlaylistCard
                key={pl._id}
                playlist={pl}
                onDelete={(id) => deleteMutation.mutate(id)}
                showOwner={tab === 'collaborative'}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Playlists;
