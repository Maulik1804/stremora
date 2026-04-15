import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Edit2, Trash2, Eye, ThumbsUp, MessageSquare, Globe, Lock, Link2, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { videoService } from '../services/video.service';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import { formatCount } from '../utils/format';
import { formatDistanceToNow } from '../utils/date';

// ── Delete confirm modal ──────────────────────────────────────────────────────
const DeleteModal = ({ video, onConfirm, onCancel, isDeleting }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={onCancel}
  >
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.92, opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => e.stopPropagation()}
      className="bg-[#1a1a1a] border border-[#3f3f3f] rounded-2xl p-6 max-w-sm w-full"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-red-900/30 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={20} className="text-red-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[#f1f1f1]">Delete video?</h3>
          <p className="text-xs text-[#aaaaaa]">This action cannot be undone</p>
        </div>
      </div>
      <p className="text-sm text-[#aaaaaa] mb-5 line-clamp-2">"{video?.title}"</p>
      <div className="flex gap-3">
        <Button variant="secondary" size="md" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button variant="danger" size="md" onClick={onConfirm} loading={isDeleting} className="flex-1">Delete</Button>
      </div>
    </motion.div>
  </motion.div>
);

// ── Visibility badge ──────────────────────────────────────────────────────────
const VisibilityBadge = ({ visibility }) => {
  const map = {
    public:   { icon: Globe,  color: 'text-green-400',  bg: 'bg-green-900/30' },
    unlisted: { icon: Link2,  color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
    private:  { icon: Lock,   color: 'text-[#aaaaaa]',  bg: 'bg-[#272727]' },
  };
  const { icon: Icon, color, bg } = map[visibility] ?? map.public;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${color}`}>
      <Icon size={10} />
      {visibility}
    </span>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const Studio = () => {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filter, setFilter] = useState('all'); // all | published | processing | private

  const { data, isLoading } = useQuery({
    queryKey: ['studio-videos'],
    queryFn: () => api.get('/videos').then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => videoService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-videos'] });
      setDeleteTarget(null);
    },
  });

  const allVideos = data?.videos ?? [];
  const videos = filter === 'all'
    ? allVideos
    : allVideos.filter((v) =>
        filter === 'private' ? v.visibility === 'private' : v.status === filter
      );

  const totalViews    = allVideos.reduce((s, v) => s + (v.viewCount ?? 0), 0);
  const totalLikes    = allVideos.reduce((s, v) => s + (v.likeCount ?? 0), 0);

  return (
    <>
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            video={deleteTarget}
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
            <h1 className="text-2xl font-bold text-[#f1f1f1]">Studio</h1>
            <p className="text-sm text-[#aaaaaa] mt-0.5">
              {allVideos.length} videos · {formatCount(totalViews)} total views · {formatCount(totalLikes)} total likes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="secondary" size="sm">Analytics</Button>
            </Link>
            <Link to="/upload">
              <Button variant="primary" size="sm">
                <Upload size={14} />
                Upload video
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all',        label: `All (${allVideos.length})` },
            { id: 'published',  label: 'Published' },
            { id: 'processing', label: 'Processing' },
            { id: 'private',    label: 'Private' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${filter === id ? 'bg-[#f1f1f1] text-[#0f0f0f]' : 'bg-[#272727] text-[#aaaaaa] hover:text-[#f1f1f1]'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center items-center h-48"><Spinner size="lg" /></div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <Upload size={40} className="text-[#606060]" />
            <p className="text-[#f1f1f1] font-medium">
              {filter === 'all' ? 'No videos uploaded yet' : `No ${filter} videos`}
            </p>
            {filter === 'all' && (
              <Link to="/upload">
                <Button variant="primary" size="sm">Upload your first video</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1f1f1f] text-[#606060] text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-medium">Video</th>
                    <th className="text-left px-4 py-3 font-medium">Visibility</th>
                    <th className="text-left px-4 py-3 font-medium">
                      <span className="flex items-center gap-1"><Eye size={12} /> Views</span>
                    </th>
                    <th className="text-left px-4 py-3 font-medium">
                      <span className="flex items-center gap-1"><ThumbsUp size={12} /> Likes</span>
                    </th>
                    <th className="text-left px-4 py-3 font-medium">
                      <span className="flex items-center gap-1"><MessageSquare size={12} /> Comments</span>
                    </th>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {videos.map((v) => (
                    <motion.tr
                      key={v._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-[#1f1f1f] hover:bg-[#1a1a1a] transition-colors group"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-24 aspect-video rounded-lg overflow-hidden bg-[#272727] flex-shrink-0">
                            {v.thumbnailUrl && (
                              <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={`/watch/${v._id}`}
                              className="text-sm font-medium text-[#f1f1f1] hover:text-white line-clamp-2 leading-snug"
                            >
                              {v.title}
                            </Link>
                            <span className={`text-xs mt-0.5 inline-block
                              ${v.status === 'published' ? 'text-green-400'
                                : v.status === 'processing' ? 'text-yellow-400'
                                : 'text-red-400'}`}
                            >
                              {v.status}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <VisibilityBadge visibility={v.visibility} />
                      </td>
                      <td className="px-4 py-3 text-[#aaaaaa] tabular-nums">{formatCount(v.viewCount)}</td>
                      <td className="px-4 py-3 text-[#aaaaaa] tabular-nums">{formatCount(v.likeCount)}</td>
                      <td className="px-4 py-3 text-[#aaaaaa] tabular-nums">{formatCount(v.commentCount)}</td>
                      <td className="px-4 py-3 text-[#aaaaaa] text-xs whitespace-nowrap">
                        {formatDistanceToNow(v.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/watch/${v._id}`}>
                            <button className="p-1.5 rounded-lg hover:bg-[#272727] text-[#aaaaaa] hover:text-[#f1f1f1] transition-colors" title="Watch">
                              <Eye size={15} />
                            </button>
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(v)}
                            className="p-1.5 rounded-lg hover:bg-red-900/30 text-[#aaaaaa] hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
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

export default Studio;
