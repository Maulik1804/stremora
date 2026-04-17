import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Edit2, Trash2, Eye, ThumbsUp, MessageSquare,
  Globe, Lock, Link2, AlertTriangle, Film, Users,
} from 'lucide-react';
import { videoService } from '../services/video.service';
import AddToSeriesModal from '../components/series/AddToSeriesModal';
import VideoCollabModal from '../components/video/VideoCollabModal';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import { formatCount } from '../utils/format';
import { formatDistanceToNow } from '../utils/date';
import { toast } from '../components/ui/Toast';
import { useAuth } from '../hooks/useAuth';

// ── Delete confirm modal ──────────────────────────────────────────────────────
const DeleteModal = ({ video, onConfirm, onCancel, isDeleting }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={onCancel}
  >
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.92, opacity: 0 }} transition={{ duration: 0.15 }}
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

// ── Action buttons ────────────────────────────────────────────────────────────
const ActionButtons = ({ video, onDelete, onSeries, onCollab }) => (
  <div className="flex items-center gap-1">
    <Link to={`/watch/${video._id}`}>
      <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#aaaaaa] hover:text-[#f1f1f1] transition-colors" title="Watch">
        <Eye size={15} />
      </button>
    </Link>
    <Link to={`/studio/edit/${video._id}`}>
      <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#aaaaaa] hover:text-[#f1f1f1] transition-colors" title="Edit">
        <Edit2 size={15} />
      </button>
    </Link>
    <button onClick={() => onSeries(video._id)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#aaaaaa] hover:text-[#f1f1f1] transition-colors" title="Add to Playlist">
      <Film size={15} />
    </button>
    {/* Collab invite button — always available for owner */}
    <button
      onClick={() => onCollab(video)}
      className="p-2 rounded-lg bg-white/5 hover:bg-[#3ea6ff]/15 text-[#aaaaaa] hover:text-[#3ea6ff] transition-colors"
      title="Manage collaborators"
    >
      <Users size={15} />
    </button>
    <button onClick={() => onDelete(video)} className="p-2 rounded-lg bg-white/5 hover:bg-red-900/30 text-[#aaaaaa] hover:text-red-400 transition-colors" title="Delete">
      <Trash2 size={15} />
    </button>
  </div>
);

// ── Mobile video card ─────────────────────────────────────────────────────────
const VideoCard = ({ video, onDelete, onSeries, onCollab }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden">
    <div className="relative w-full aspect-video bg-[#272727]">
      {video.thumbnailUrl
        ? <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center"><Film size={24} className="text-[#444]" /></div>
      }
      <div className="absolute top-2 left-2"><VisibilityBadge visibility={video.visibility} /></div>
    </div>
    <div className="p-3">
      <Link to={`/watch/${video._id}`} className="text-sm font-semibold text-[#f1f1f1] line-clamp-2 leading-snug hover:text-white">{video.title}</Link>
      <div className="flex items-center gap-3 mt-2 text-xs text-[#666]">
        <span className="flex items-center gap-1"><Eye size={11} />{formatCount(video.viewCount)}</span>
        <span className="flex items-center gap-1"><ThumbsUp size={11} />{formatCount(video.likeCount)}</span>
        <span className="ml-auto">{formatDistanceToNow(video.createdAt)}</span>
      </div>
      <div className="mt-3 pt-3 border-t border-white/5">
        <ActionButtons video={video} onDelete={onDelete} onSeries={onSeries} onCollab={onCollab} />
      </div>
    </div>
  </motion.div>
);

// ── Collab video card ─────────────────────────────────────────────────────────
const CollabVideoCard = ({ video, currentUserId, onLeave, onManage, onRemoveCollaborator }) => {
  const isOwner = video.owner?._id === currentUserId;
  const acceptedCollabs = video.collaborators?.filter((c) => c.status === 'accepted') ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-[#141414] border border-[#3ea6ff]/20 rounded-2xl overflow-hidden"
    >
      <div className="relative w-full aspect-video bg-[#272727]">
        {video.thumbnailUrl
          ? <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Film size={24} className="text-[#444]" /></div>
        }
        <div className="absolute top-2 left-2 bg-[#3ea6ff]/20 border border-[#3ea6ff]/40 text-[#3ea6ff] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
          <Users size={9} /> Collab
        </div>
        {isOwner && (
          <div className="absolute top-2 right-2 bg-[#e50914]/20 border border-[#e50914]/40 text-[#e50914] text-[10px] font-bold px-2 py-0.5 rounded-full">
            Owner
          </div>
        )}
      </div>

      <div className="p-3">
        <Link to={`/watch/${video._id}`} className="text-sm font-semibold text-[#f1f1f1] line-clamp-2 leading-snug hover:text-white">
          {video.title}
        </Link>

        {/* Collaborators list */}
        <div className="flex flex-col gap-1.5 mt-2">
          {acceptedCollabs.map((c) => (
            <div key={c.user?._id} className="flex items-center gap-2">
              <Avatar src={c.user?.avatar} alt={c.user?.displayName} size="xs" />
              <Link to={`/channel/${c.user?.username}`} className="text-xs text-[#3ea6ff] hover:underline flex-1 truncate">
                {c.user?.displayName || c.user?.username}
              </Link>
              {/* Owner can remove collaborator */}
              {isOwner && (
                <button
                  onClick={() => onRemoveCollaborator(video._id, c.user?._id)}
                  className="p-1 rounded-lg text-[#555] hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                  title="Remove collaborator"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
          <Link to={`/watch/${video._id}`}>
            <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#aaaaaa] hover:text-[#f1f1f1] transition-colors" title="Watch">
              <Eye size={15} />
            </button>
          </Link>

          {/* Owner: invite more + edit */}
          {isOwner && (
            <>
              <button
                onClick={() => onManage(video)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3ea6ff]/10 text-[#3ea6ff] hover:bg-[#3ea6ff]/20 text-xs font-medium transition-colors"
                title="Invite more collaborators"
              >
                <Users size={12} /> Manage
              </button>
              <Link to={`/studio/edit/${video._id}`}>
                <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#aaaaaa] hover:text-[#f1f1f1] transition-colors" title="Edit">
                  <Edit2 size={15} />
                </button>
              </Link>
            </>
          )}

          {/* Collaborator: leave */}
          {!isOwner && (
            <button
              onClick={() => onLeave(video._id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-[#aaa] hover:bg-red-500/10 hover:text-red-400 text-xs transition-colors ml-auto"
            >
              Leave collab
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const Studio = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('mine');
  const [seriesTarget, setSeriesTarget] = useState(null);
  const [collabTarget, setCollabTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['studio-videos'],
    queryFn: () => videoService.getMyVideos().then((r) => r.data.data),
  });

  const { data: collabData, isLoading: collabLoading } = useQuery({
    queryKey: ['my-collab-videos'],
    queryFn: () => videoService.getMyCollabVideos().then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => videoService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['studio-videos'] }); setDeleteTarget(null); },
  });

  const leaveCollabMutation = useMutation({
    mutationFn: (id) => videoService.leaveCollab(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-collab-videos'] }); toast.success('You have left the collab'); },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to leave'),
  });

  const removeCollaboratorMutation = useMutation({
    mutationFn: ({ videoId, userId }) => videoService.removeCollaborator(videoId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-collab-videos'] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'video' });
      toast.success('Collaborator removed');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to remove'),
  });

  const allVideos = data?.videos ?? [];
  const collabVideos = collabData?.videos ?? [];
  const videos = filter === 'all'
    ? allVideos
    : allVideos.filter((v) => filter === 'private' ? v.visibility === 'private' : v.status === filter);

  const totalViews = allVideos.reduce((s, v) => s + (v.viewCount ?? 0), 0);
  const totalLikes = allVideos.reduce((s, v) => s + (v.likeCount ?? 0), 0);

  return (
    <>
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal video={deleteTarget} onConfirm={() => deleteMutation.mutate(deleteTarget._id)} onCancel={() => setDeleteTarget(null)} isDeleting={deleteMutation.isPending} />
        )}
        {seriesTarget && <AddToSeriesModal videoId={seriesTarget} onClose={() => setSeriesTarget(null)} />}
        {collabTarget && <VideoCollabModal videoId={collabTarget._id} videoTitle={collabTarget.title} onClose={() => setCollabTarget(null)} />}
      </AnimatePresence>

      <div className="px-4 py-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#f1f1f1]">Studio</h1>
            <p className="text-sm text-[#aaaaaa] mt-0.5">
              {allVideos.length} videos · {formatCount(totalViews)} views · {formatCount(totalLikes)} likes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard"><Button variant="secondary" size="sm">Analytics</Button></Link>
            <Link to="/upload"><Button variant="primary" size="sm"><Upload size={14} /> Upload</Button></Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-[#1a1a1a] p-1 rounded-xl w-fit">
          <button
            onClick={() => setTab('mine')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'mine' ? 'bg-[#272727] text-[#f1f1f1]' : 'text-[#606060] hover:text-[#aaaaaa]'}`}
          >
            <Film size={14} /> My Videos
          </button>
          <button
            onClick={() => setTab('collab')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'collab' ? 'bg-[#272727] text-[#f1f1f1]' : 'text-[#606060] hover:text-[#aaaaaa]'}`}
          >
            <Users size={14} /> Collab Videos
            {collabVideos.length > 0 && (
              <span className="ml-1 bg-[#3ea6ff]/20 text-[#3ea6ff] text-xs px-1.5 py-0.5 rounded-full">{collabVideos.length}</span>
            )}
          </button>
        </div>

        {/* ── MY VIDEOS TAB ── */}
        {tab === 'mine' && (
          <>
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'all', label: `All (${allVideos.length})` },
                { id: 'published', label: 'Published' },
                { id: 'processing', label: 'Processing' },
                { id: 'private', label: 'Private' },
              ].map(({ id, label }) => (
                <button key={id} onClick={() => setFilter(id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === id ? 'bg-[#f1f1f1] text-[#0f0f0f]' : 'bg-[#272727] text-[#aaaaaa] hover:text-[#f1f1f1]'}`}>
                  {label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-48"><Spinner size="lg" /></div>
            ) : videos.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <Upload size={40} className="text-[#606060]" />
                <p className="text-[#f1f1f1] font-medium">{filter === 'all' ? 'No videos uploaded yet' : `No ${filter} videos`}</p>
                {filter === 'all' && <Link to="/upload"><Button variant="primary" size="sm">Upload your first video</Button></Link>}
              </div>
            ) : (
              <>
                {/* Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
                  {videos.map((v) => <VideoCard key={v._id} video={v} onDelete={setDeleteTarget} onSeries={setSeriesTarget} onCollab={setCollabTarget} />)}
                </div>
                {/* Desktop */}
                <div className="hidden md:block bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#1f1f1f] text-[#606060] text-xs uppercase tracking-wide">
                          <th className="text-left px-5 py-3 font-medium">Video</th>
                          <th className="text-left px-4 py-3 font-medium">Visibility</th>
                          <th className="text-left px-4 py-3 font-medium"><span className="flex items-center gap-1"><Eye size={12} /> Views</span></th>
                          <th className="text-left px-4 py-3 font-medium"><span className="flex items-center gap-1"><ThumbsUp size={12} /> Likes</span></th>
                          <th className="text-left px-4 py-3 font-medium"><span className="flex items-center gap-1"><MessageSquare size={12} /> Comments</span></th>
                          <th className="text-left px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {videos.map((v) => (
                          <motion.tr key={v._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-[#1f1f1f] hover:bg-[#1a1a1a] transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-24 aspect-video rounded-lg overflow-hidden bg-[#272727] flex-shrink-0">
                                  {v.thumbnailUrl && <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />}
                                </div>
                                <div className="min-w-0">
                                  <Link to={`/watch/${v._id}`} className="text-sm font-medium text-[#f1f1f1] hover:text-white line-clamp-2 leading-snug">{v.title}</Link>
                                  <span className={`text-xs mt-0.5 inline-block ${v.status === 'published' ? 'text-green-400' : v.status === 'processing' ? 'text-yellow-400' : 'text-red-400'}`}>{v.status}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3"><VisibilityBadge visibility={v.visibility} /></td>
                            <td className="px-4 py-3 text-[#aaaaaa] tabular-nums">{formatCount(v.viewCount)}</td>
                            <td className="px-4 py-3 text-[#aaaaaa] tabular-nums">{formatCount(v.likeCount)}</td>
                            <td className="px-4 py-3 text-[#aaaaaa] tabular-nums">{formatCount(v.commentCount)}</td>
                            <td className="px-4 py-3 text-[#aaaaaa] text-xs whitespace-nowrap">{formatDistanceToNow(v.createdAt)}</td>
                            <td className="px-4 py-3"><ActionButtons video={v} onDelete={setDeleteTarget} onSeries={setSeriesTarget} onCollab={setCollabTarget} /></td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ── COLLAB VIDEOS TAB ── */}
        {tab === 'collab' && (
          <>
            {collabLoading ? (
              <div className="flex justify-center items-center h-48"><Spinner size="lg" /></div>
            ) : collabVideos.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <Users size={40} className="text-[#606060]" />
                <p className="text-[#f1f1f1] font-medium">No collab videos yet</p>
                <p className="text-sm text-[#555]">Videos you've been invited to collaborate on will appear here.</p>
                <Link to="/collab-invites"><Button variant="secondary" size="sm">Check invites</Button></Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {collabVideos.map((v) => {
                  const isOwner = v.owner?._id === user?._id;
                  return (
                    <CollabVideoCard
                      key={v._id}
                      video={v}
                      currentUserId={user?._id}
                      onLeave={(id) => leaveCollabMutation.mutate(id)}
                      onManage={(video) => setCollabTarget(video)}
                      onRemoveCollaborator={(videoId, userId) => removeCollaboratorMutation.mutate({ videoId, userId })}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Studio;
