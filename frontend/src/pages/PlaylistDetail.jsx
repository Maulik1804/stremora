import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListVideo, Lock, Globe, Users, Trash2, Play, Clock,
} from 'lucide-react';
import { engagementService } from '../services/engagement.service';
import CollaboratorModal from '../components/engagement/CollaboratorModal';
import VideoCard from '../components/video/VideoCard';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import { toast } from '../components/ui/Toast';
import { useAuth } from '../hooks/useAuth';
import { formatDistanceToNow } from '../utils/date';
import api from '../services/api';

const PlaylistDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCollaborators, setShowCollaborators] = useState(false);

  const { data: playlist, isLoading, isError } = useQuery({
    queryKey: ['playlist', id],
    queryFn: () => engagementService.getPlaylist(id).then((r) => r.data.data.playlist),
    staleTime: 30_000,
  });

  const removeVideoMutation = useMutation({
    mutationFn: (videoId) => engagementService.removeFromPlaylist(id, videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', id] });
      toast.success('Video removed');
    },
    onError: () => toast.error('Failed to remove video'),
  });

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]"><Spinner size="lg" /></div>
  );

  if (isError || !playlist) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-[#f1f1f1] font-medium">Playlist not found</p>
      <Link to="/playlists" className="text-[#3ea6ff] text-sm hover:underline">Back to playlists</Link>
    </div>
  );

  const isOwner = user && playlist.owner?._id === user._id;
  const isCollaborator = user && playlist.collaborators?.some((c) => c._id === user._id || c === user._id);
  const canEdit = isOwner || isCollaborator;
  const videos = playlist.videos ?? [];

  return (
    <>
      <AnimatePresence>
        {showCollaborators && isOwner && (
          <CollaboratorModal
            playlistId={id}
            playlistTitle={playlist.title}
            onClose={() => setShowCollaborators(false)}
          />
        )}
      </AnimatePresence>

      <div className="px-4 py-6 max-w-screen-xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Sidebar info ── */}
          <div className="lg:w-72 flex-shrink-0">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden sticky top-20"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-[#272727] relative">
                {videos[0]?.thumbnailUrl ? (
                  <img src={videos[0].thumbnailUrl} alt={playlist.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ListVideo size={40} className="text-[#606060]" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 text-white text-sm font-medium">
                  {videos.length} videos
                </div>
              </div>

              <div className="p-4 flex flex-col gap-3">
                <h1 className="text-base font-bold text-[#f1f1f1] leading-snug">{playlist.title}</h1>

                {/* Owner */}
                <div className="flex items-center gap-2">
                  <Avatar src={playlist.owner?.avatar} alt={playlist.owner?.displayName} size="xs" />
                  <Link
                    to={`/channel/${playlist.owner?.username}`}
                    className="text-xs text-[#aaaaaa] hover:text-[#f1f1f1]"
                  >
                    {playlist.owner?.displayName || playlist.owner?.username}
                  </Link>
                </div>

                {/* Visibility */}
                <div className="flex items-center gap-1.5 text-xs text-[#606060]">
                  {playlist.visibility === 'private'
                    ? <><Lock size={11} /> Private</>
                    : <><Globe size={11} /> Public</>}
                  {playlist.updatedAt && (
                    <span className="ml-auto">{formatDistanceToNow(playlist.updatedAt)}</span>
                  )}
                </div>

                {playlist.description && (
                  <p className="text-xs text-[#aaaaaa] line-clamp-3">{playlist.description}</p>
                )}

                {/* Collaborators badge */}
                {(playlist.collaborators?.length > 0 || isOwner) && (
                  <div className="flex items-center justify-between pt-1 border-t border-[#2a2a2a]">
                    <div className="flex items-center gap-1.5 text-xs text-[#aaaaaa]">
                      <Users size={12} className="text-[#3ea6ff]" />
                      {playlist.collaborators?.length ?? 0} collaborator{playlist.collaborators?.length !== 1 ? 's' : ''}
                    </div>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCollaborators(true)}
                        className="text-xs text-[#3ea6ff] hover:text-[#3ea6ff] px-2 py-1"
                      >
                        Manage
                      </Button>
                    )}
                  </div>
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
                <ListVideo size={40} className="text-[#606060]" />
                <p className="text-[#f1f1f1] font-medium">No videos in this playlist</p>
                {canEdit && (
                  <p className="text-sm text-[#aaaaaa]">Browse videos and save them to this playlist</p>
                )}
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
                    <span className="text-xs text-[#606060] w-5 text-right mt-3 flex-shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <VideoCard video={video} horizontal={true} />
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => removeVideoMutation.mutate(video._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity mt-3 p-1.5 rounded-lg hover:bg-red-900/30 text-[#606060] hover:text-red-400 flex-shrink-0"
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
    </>
  );
};

export default PlaylistDetail;
