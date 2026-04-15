import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Rss, Compass } from 'lucide-react';
import VideoCard from '../components/video/VideoCard';
import VideoCardSkeleton from '../components/video/VideoCardSkeleton';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
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

  return (
    <div className="px-4 py-6 max-w-screen-2xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0">
          <Rss size={18} className="text-[#aaa]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#f1f1f1] leading-tight">Subscriptions</h1>
          <p className="text-xs text-[#555] mt-0.5">Latest from channels you follow</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {Array.from({ length: 8 }).map((_, i) => <VideoCardSkeleton key={i} />)}
        </div>
      ) : videos.length === 0 ? (
        <EmptyState
          icon={Rss}
          title="Nothing here yet"
          description="Subscribe to your favourite channels and their newest videos will show up right here."
          action={
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/8 hover:bg-white/12 border border-white/10 hover:border-white/20 text-sm font-medium text-[#e0e0e0] transition-all duration-200"
            >
              <Compass size={15} />
              Explore channels
            </Link>
          }
        />
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
