import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ThumbsUp, Play } from 'lucide-react';
import api from '../services/api';
import VideoCard from '../components/video/VideoCard';
import VideoCardSkeleton from '../components/video/VideoCardSkeleton';
import EmptyState from '../components/ui/EmptyState';

const LikedVideos = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['liked-videos'],
    queryFn: () => api.get('/likes/me/videos').then((r) => r.data.data),
    staleTime: 30_000,
  });

  const videos = data?.videos ?? [];

  return (
    <div className="px-4 py-6 max-w-screen-2xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0">
          <ThumbsUp size={18} className="text-[#aaa]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#f1f1f1] leading-tight">Liked videos</h1>
          <p className="text-xs text-[#555] mt-0.5">
            {!isLoading && videos.length > 0
              ? `${videos.length} video${videos.length !== 1 ? 's' : ''}`
              : 'Videos you\'ve liked'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {Array.from({ length: 8 }).map((_, i) => <VideoCardSkeleton key={i} />)}
        </div>
      ) : videos.length === 0 ? (
        <EmptyState
          icon={ThumbsUp}
          title="No liked videos yet"
          description="Hit the thumbs up on any video you enjoy and it'll be saved here for easy access."
          action={
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/8 hover:bg-white/12 border border-white/10 hover:border-white/20 text-sm font-medium text-[#e0e0e0] transition-all duration-200"
            >
              <Play size={15} className="fill-current" />
              Browse videos
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {videos.map((v) => <VideoCard key={v._id} video={v} />)}
        </div>
      )}
    </div>
  );
};

export default LikedVideos;
