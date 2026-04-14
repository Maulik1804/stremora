import { useQuery } from '@tanstack/react-query';
import { videoService } from '../../services/video.service';
import VideoCard from './VideoCard';
import VideoCardSkeleton from './VideoCardSkeleton';

const SuggestedVideos = ({ currentVideoId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['suggested', currentVideoId],
    queryFn: () => videoService.getFeed().then((r) => r.data.data),
    staleTime: 60_000,
  });

  const videos = (data?.videos ?? []).filter((v) => v._id !== currentVideoId).slice(0, 15);

  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-[#444] px-1 mb-3">Up next</h3>

      <div className="flex flex-col gap-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <VideoCardSkeleton key={i} horizontal />)
          : videos.map((video) => <VideoCard key={video._id} video={video} horizontal />)
        }
      </div>

      {!isLoading && videos.length === 0 && (
        <p className="text-sm text-[#444] px-1 py-4 text-center">No suggestions available</p>
      )}
    </div>
  );
};

export default SuggestedVideos;
