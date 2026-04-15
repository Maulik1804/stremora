import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Film, Lock, Globe, Play, Trash2, ArrowLeft } from 'lucide-react';
import { engagementService } from '../services/engagement.service';
import VideoCard from '../components/video/VideoCard';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import { toast } from '../components/ui/Toast';
import { useAuth } from '../hooks/useAuth';
import { formatDistanceToNow } from '../utils/date';

const ChannelPlaylistDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: playlist, isLoading, isError } = useQuery({
    queryKey: ['channel-playlist', id],
    queryFn: () => engagementService.getPlaylist(id).then((r) => r.data.data.playlist),
  });

  const removeVideoMutation = useMutation({
    mutationFn: (videoId) => engagementService.removeFromPlaylist(id, videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-playlist', id] });
      toast.success('Video removed');
    },
    onError: () => toast.error('Failed to remove video'),
  });

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]"><Spinner size="lg" /></div>
  );

  if (isError || !playlist) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Film size={40} className="text-[#333]" />
      <p className="text-[#f1f1f1] font-medium">Playlist not found</p>
      <Link to="/" className="text-[#3ea6ff] text-sm hover:underline">← Back to home</Link>
    </div>
  );

  const isOwner = user?._id === playlist.owner?._id;
  const videos = playlist.videos ?? [];
  const thumbnail = playlist.seriesThumbnail || videos[0]?.thumbnailUrl || '';

  return (
    <div className="px-4 py-6 max-w-screen-xl mx-auto">
      {/* Back to channel */}
      <Link
        to={`/channel/${playlist.owner?.username}`}
        className="inline-flex items-center gap-1.5 text-sm text-[#aaa] hover:text-[#f1f1f1]
                   transition-colors mb-6 group"
      >
        <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to {playlist.owner?.displayName || playlist.owner?.username}'s channel
      </Link>

      <div className="flex flex-col lg:flex-row gap-8">

        {/* ── Left panel ── */}
        <div className="lg:w-72 flex-shrink-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#141414] border border-[#1f1f1f] rounded-2xl overflow-hidden sticky top-20"
          >
            {/* Cover */}
            <div className="aspect-video bg-[#1a1a1a] relative">
              {thumbnail ? (
                <img src={thumbnail} alt={playlist.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film size={40} className="text-[#333]" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              {/* Channel Playlist badge */}
              <div className="absolute top-2 left-2 bg-[#ff0000]/90 text-white text-[10px]
                              font-bold px-2 py-0.5 rounded-md tracking-wide uppercase">
                Channel Playlist
              </div>
              <div className="absolute bottom-3 left-3 text-white text-sm font-medium">
                {videos.length} video{videos.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <h1 className="text-base font-bold text-[#f1f1f1] leading-snug">{playlist.title}</h1>

              {/* Channel owner */}
              <div className="flex items-center gap-2">
                <Avatar src={playlist.owner?.avatar} alt={playlist.owner?.displayName} size="xs" />
                <Link
                  to={`/channel/${playlist.owner?.username}`}
                  className="text-xs text-[#aaa] hover:text-[#f1f1f1] transition-colors"
                >
                  {playlist.owner?.displayName || playlist.owner?.username}
                </Link>
              </div>

              {/* Visibility + date */}
              <div className="flex items-center gap-1.5 text-xs text-[#555]">
                {playlist.visibility === 'private'
                  ? <><Lock size={11} /> Private</>
                  : <><Globe size={11} /> Public</>}
                {playlist.updatedAt && (
                  <span className="ml-auto">{formatDistanceToNow(playlist.updatedAt)}</span>
                )}
              </div>

              {playlist.description && (
                <p className="text-xs text-[#aaa] line-clamp-3 leading-relaxed">
                  {playlist.description}
                </p>
              )}

              {/* Play all */}
              {videos.length > 0 && (
                <Link to={`/watch/${videos[0]._id}`}>
                  <Button variant="primary" size="sm" className="w-full rounded-xl">
                    <Play size={14} /> Play all
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── Video list ── */}
        <div className="flex-1 min-w-0">
          {videos.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <Film size={40} className="text-[#333]" />
              <p className="text-[#f1f1f1] font-medium">No videos in this playlist yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {videos.map((video, idx) => (
                <motion.div
                  key={video._id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-start gap-3 group"
                >
                  <span className="text-xs text-[#555] w-5 text-right mt-3 flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <VideoCard video={video} horizontal={true} />
                  </div>
                  {/* Owner can remove videos */}
                  {isOwner && (
                    <button
                      onClick={() => removeVideoMutation.mutate(video._id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity mt-3 p-1.5
                                 rounded-lg hover:bg-red-900/30 text-[#555] hover:text-red-400 flex-shrink-0"
                      aria-label="Remove from playlist"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelPlaylistDetail;
