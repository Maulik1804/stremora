import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import VideoCard from '../components/video/VideoCard';
import Spinner from '../components/ui/Spinner';
import { videoService } from '../services/video.service';

const Subscriptions = () => {
  const loaderRef = useRef(null);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['subscriptions-feed'],
    queryFn: ({ pageParam }) => videoService.getSubscriptionFeed(pageParam).then((r) => r.data.data),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 60_000,
  });

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && hasNextPage) fetchNextPage(); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, fetchNextPage]);

  const videos = data?.pages.flatMap((p) => p.videos) ?? [];

  if (isLoading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;

  return (
    <div className="px-4 py-6 max-w-screen-2xl mx-auto">
      <h1 className="text-xl font-bold text-[#f1f1f1] mb-6">Subscriptions</h1>
      {videos.length === 0 ? (
        <p className="text-[#aaaaaa] text-center mt-16">Subscribe to channels to see their videos here.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {videos.map((v) => <VideoCard key={v._id} video={v} />)}
        </div>
      )}
      <div ref={loaderRef} className="flex justify-center py-8">
        {isFetchingNextPage && <Spinner />}
      </div>
    </div>
  );
};

export default Subscriptions;
