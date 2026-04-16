import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Trash2, Eye, Film, ChevronDown, ChevronUp,
  AlertTriangle, X, Play,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { toast } from '../../components/ui/Toast';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import { formatCount } from '../../utils/format';
import { formatDistanceToNow } from '../../utils/date';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

// ── Confirm delete modal ──────────────────────────────────────────────────────
const DeleteModal = ({ video, onConfirm, onClose, loading }) => (
  <AnimatePresence>
    {video && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }} transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#111] border border-red-500/25 rounded-2xl p-6 w-full max-w-md"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-[#e8e8e8] font-semibold">Remove video?</h3>
              <p className="text-xs text-[#555] mt-0.5 line-clamp-2">"{video.title}"</p>
            </div>
            <button onClick={onClose} className="text-[#555] hover:text-[#e8e8e8]"><X size={16} /></button>
          </div>
          <p className="text-sm text-[#888] mb-5">
            The video owner will be notified. Cloudinary assets will be deleted. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button variant="danger" size="sm" className="flex-1" loading={loading} onClick={onConfirm}>
              Remove video
            </Button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ── User group row ────────────────────────────────────────────────────────────
const UserGroup = ({ group, onDelete }) => {
  const [expanded, setExpanded] = useState(true);
  const { user, videos, totalVideos } = group;

  return (
    <div className="bg-[#111] border border-white/6 rounded-2xl overflow-hidden mb-4">
      {/* Group header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/3 transition-colors"
      >
        <Avatar src={user.avatar} alt={user.displayName || user.username} size="sm" />
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold text-[#e8e8e8] truncate">{user.displayName || user.username}</p>
          <p className="text-xs text-[#555]">@{user.username} · {totalVideos} video{totalVideos !== 1 ? 's' : ''}</p>
        </div>
        {expanded ? <ChevronUp size={16} className="text-[#555] flex-shrink-0" /> : <ChevronDown size={16} className="text-[#555] flex-shrink-0" />}
      </button>

      {/* Videos list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5">
              {videos.map((v, i) => (
                <div
                  key={v._id}
                  className={`flex items-center gap-3 px-3 py-2.5 ${i < videos.length - 1 ? 'border-b border-white/4' : ''} hover:bg-white/2 transition-colors`}
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                    {v.thumbnailUrl
                      ? <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Film size={12} className="text-[#444]" /></div>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#e8e8e8] truncate">{v.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-[#555] flex-wrap">
                      <span className="flex items-center gap-1"><Eye size={10} />{formatCount(v.viewCount)}</span>
                      <span className="hidden sm:inline">{fmtDate(v.createdAt)}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        v.status === 'published' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-yellow-500/15 text-yellow-400'
                      }`}>{v.status}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Link to={`/watch/${v._id}`} target="_blank">
                      <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#aaa] hover:text-white transition-colors" title="Watch">
                        <Play size={13} />
                      </button>
                    </Link>
                    <button
                      onClick={() => onDelete(v)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/15 text-[#aaa] hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const AdminVideos = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'videos-by-user', search],
    queryFn: () => adminService.getVideosByUser({ search: search || undefined }).then((r) => r.data.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => adminService.deleteVideo(id),
    onSuccess: () => {
      toast.success('Video removed');
      qc.invalidateQueries(['admin', 'videos-by-user']);
      qc.invalidateQueries(['admin', 'stats']);
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const groups = data?.groups ?? [];
  const totalVideos = groups.reduce((s, g) => s + g.totalVideos, 0);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-[#e8e8e8]">Videos</h1>
          <p className="text-sm text-[#555] mt-0.5">
            {isLoading ? '…' : `${totalVideos} videos from ${groups.length} creators`}
          </p>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }}
          className="flex gap-2"
        >
          <div className="relative flex-1 sm:flex-none">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by creator…"
              className="bg-[#111] border border-white/8 rounded-xl pl-9 pr-4 py-2 text-sm text-[#e8e8e8] placeholder-[#444] focus:outline-none focus:border-white/20 w-full sm:w-48"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">Search</Button>
          {search && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSearch(''); setSearchInput(''); }}>Clear</Button>
          )}
        </form>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[#111] border border-white/6 rounded-2xl p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-white/5" />
                <div className="h-4 w-32 bg-white/5 rounded" />
              </div>
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="flex gap-3 py-3 border-t border-white/4">
                  <div className="w-20 h-12 rounded-lg bg-white/5 flex-shrink-0" />
                  <div className="flex-1"><div className="h-4 w-3/4 bg-white/5 rounded mb-2" /><div className="h-3 w-1/2 bg-white/5 rounded" /></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Film size={40} className="text-[#333]" />
          <p className="text-[#555]">{search ? 'No creators found matching your search' : 'No videos uploaded yet'}</p>
        </div>
      ) : (
        groups.map((group) => (
          <UserGroup key={group.user._id} group={group} onDelete={setDeleteTarget} />
        ))
      )}

      <DeleteModal
        video={deleteTarget}
        onConfirm={() => deleteMut.mutate(deleteTarget._id)}
        onClose={() => setDeleteTarget(null)}
        loading={deleteMut.isPending}
      />
    </div>
  );
};

export default AdminVideos;
