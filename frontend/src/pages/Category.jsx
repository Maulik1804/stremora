import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Music2, Gamepad2, Newspaper, Trophy, BookOpen, Film, Monitor, Plane, UtensilsCrossed, Shirt, Laugh, FlaskConical, Tv2 } from 'lucide-react';
import VideoGrid from '../components/video/VideoGrid';
import Spinner from '../components/ui/Spinner';
import { videoService } from '../services/video.service';

const CATEGORY_META = {
  music:        { icon: Music2,          color: 'from-purple-900/40' },
  gaming:       { icon: Gamepad2,        color: 'from-green-900/40' },
  news:         { icon: Newspaper,       color: 'from-blue-900/40' },
  sports:       { icon: Trophy,          color: 'from-orange-900/40' },
  education:    { icon: BookOpen,        color: 'from-yellow-900/40' },
  entertainment:{ icon: Film,            color: 'from-pink-900/40' },
  technology:   { icon: Monitor,         color: 'from-cyan-900/40' },
  travel:       { icon: Plane,           color: 'from-teal-900/40' },
  food:         { icon: UtensilsCrossed, color: 'from-red-900/40' },
  fashion:      { icon: Shirt,           color: 'from-rose-900/40' },
  comedy:       { icon: Laugh,           color: 'from-amber-900/40' },
  science:      { icon: FlaskConical,    color: 'from-indigo-900/40' },
};

const Category = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const loaderRef = useRef(null);

  const meta = CATEGORY_META[slug?.toLowerCase()] ?? { icon: Tv2, color: 'from-[#272727]' };
  const Icon = meta.icon;
  const label = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : '';

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading,
  } = useInfiniteQuery({
    queryKey: ['category', slug],
    queryFn: ({ pageParam }) =>
      videoService.search({ q: slug, sort: 'views', cursor: pageParam })
        .then((r) => r.data.data),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!slug,
  });

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage) fetchNextPage(); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, fetchNextPage]);

  const videos = data?.pages.flatMap((p) => p.videos) ?? [];

  return (
    <div>
      {/* Hero banner */}
      <div className={`bg-gradient-to-b ${meta.color} to-[#0f0f0f] px-4 pt-8 pb-6`}>
        <div className="max-w-screen-xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-[#aaaaaa] hover:text-[#f1f1f1] transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/8 flex items-center justify-center flex-shrink-0">
              <Icon size={28} className="text-[#e8e8e8]" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#f1f1f1]">{label}</h1>
              <p className="text-sm text-[#aaaaaa] mt-1">
                {isLoading ? '…' : `${videos.length}+ videos`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="px-4 py-6 max-w-screen-xl mx-auto">
        <VideoGrid videos={videos} isLoading={isLoading} />

        <div ref={loaderRef} className="flex justify-center py-8">
          {isFetchingNextPage && <Spinner />}
        </div>

        {!isLoading && !hasNextPage && videos.length > 0 && (
          <p className="text-center text-[#606060] text-sm pb-4">End of results</p>
        )}
      </div>
    </div>
  );
};

export default Category;
