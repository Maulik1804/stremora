import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import VideoCard from '../components/video/VideoCard';
import Spinner from '../components/ui/Spinner';

const LikedVideos = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['liked-videos'],
    queryFn: () => api.get('/likes/me/videos').then((r) => r.data.data),
    staleTime: 30_000,
  });

  const videos = data?.videos ?? [];

  if (isLoading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;

  return (
    <div className="px-4 py-6 max-w-screen-2xl mx-auto">
      <h1 className="text-xl font-bold text-[#f1f1f1] mb-6">Liked videos</h1>
      {videos.length === 0 ? (
        <p className="text-[#aaaaaa] text-center mt-16">No liked videos yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {videos.map((v) => <VideoCard key={v._id} video={v} />)}
        </div>
      )}
    </div>
  );
};

export default LikedVideos;
