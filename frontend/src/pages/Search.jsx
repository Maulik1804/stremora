import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, ChevronDown, Search as SearchIcon, Play } from 'lucide-react';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import { videoService } from '../services/video.service';
import { formatCount, formatDuration } from '../utils/format';
import { formatDistanceToNow } from '../utils/date';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'date',      label: 'Upload date' },
  { value: 'views',     label: 'View count' },
];
const DATE_OPTIONS = [
  { value: '',      label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'week',  label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year',  label: 'This year' },
];
const DURATION_OPTIONS = [
  { value: '',       label: 'Any duration' },
  { value: 'short',  label: 'Short (< 4 min)' },
  { value: 'medium', label: 'Medium (4–20 min)' },
  { value: 'long',   label: 'Long (> 20 min)' },
];

// ── Filter pill ───────────────────────────────────────────────────────────────
const FilterPill = ({ label, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value);
  const active = !!value && value !== 'relevance';

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-200
          ${active
            ? 'bg-[#e8e8e8] text-[#0a0a0a] border-[#e8e8e8]'
            : 'bg-[#181818] text-[#888] border-white/6 hover:border-white/14 hover:text-[#e0e0e0]'}`}
      >
        {selected?.label || label}
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute top-full left-0 mt-2 bg-[#111] border border-white/8 rounded-2xl shadow-2xl overflow-hidden z-30 min-w-[170px] py-1"
          >
            {options.map((opt) => (
              <button key={opt.value} type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                  ${opt.value === value ? 'text-white bg-white/8' : 'text-[#888] hover:text-[#e0e0e0] hover:bg-white/5'}`}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Search result row ─────────────────────────────────────────────────────────
const ResultRow = ({ video, index }) => {
  const [hovered, setHovered] = useState(false);
  const { _id, title, thumbnailUrl, duration, viewCount, createdAt, owner, description } = video;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.22 }}
      className="flex gap-4 md:gap-6 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <Link to={`/watch/${_id}`}
        className="relative flex-shrink-0 w-44 sm:w-60 md:w-80 aspect-video rounded-xl overflow-hidden bg-[#111]">
        {thumbnailUrl ? (
          <motion.img
            src={thumbnailUrl} alt={title} loading="lazy"
            animate={{ scale: hovered ? 1.05 : 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#111]">
            <Play size={24} className="text-[#333]" />
          </div>
        )}
        {/* Play overlay */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          className="absolute inset-0 bg-black/30 flex items-center justify-center"
        >
          <div className="bg-black/60 backdrop-blur-sm rounded-full p-3">
            <Play size={18} className="text-white fill-white ml-0.5" />
          </div>
        </motion.div>
        {duration > 0 && (
          <span className="absolute bottom-1.5 right-1.5 bg-black/85 text-white text-xs px-2 py-0.5 rounded-lg font-medium">
            {formatDuration(duration)}
          </span>
        )}
      </Link>

      {/* Info */}
      <div className="flex flex-col gap-2 min-w-0 flex-1 py-1">
        <Link to={`/watch/${_id}`}
          className="text-sm md:text-base font-semibold text-[#e0e0e0] line-clamp-2 hover:text-white transition-colors leading-snug">
          {title}
        </Link>
        <p className="text-xs text-[#555]">
          {formatCount(viewCount)} views · {formatDistanceToNow(createdAt)}
        </p>
        {owner && (
          <Link to={`/channel/${owner.username}`} className="flex items-center gap-2 mt-0.5 w-fit">
            <Avatar src={owner.avatar} alt={owner.displayName || owner.username} size="xs" />
            <span className="text-xs text-[#666] hover:text-[#ccc] transition-colors">
              {owner.displayName || owner.username}
            </span>
          </Link>
        )}
        {description && (
          <p className="text-xs text-[#444] line-clamp-2 mt-1 hidden md:block leading-relaxed">{description}</p>
        )}
      </div>
    </motion.article>
  );
};

// ── Skeleton row ──────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <div className="flex gap-6">
    <div className="skeleton w-80 aspect-video rounded-xl flex-shrink-0" />
    <div className="flex flex-col gap-3 flex-1 py-2">
      <div className="skeleton h-4 w-full rounded-full" />
      <div className="skeleton h-4 w-3/4 rounded-full" />
      <div className="skeleton h-3 w-1/3 rounded-full mt-1" />
    </div>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────
const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const loaderRef = useRef(null);

  const q        = searchParams.get('q') || '';
  const sort     = searchParams.get('sort') || 'relevance';
  const date     = searchParams.get('date') || '';
  const duration = searchParams.get('duration') || '';

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const hasFilters = sort !== 'relevance' || date || duration;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useInfiniteQuery({
    queryKey: ['search', q, sort, date, duration],
    queryFn: ({ pageParam }) =>
      videoService.search({ q, sort, date, duration, cursor: pageParam }).then((r) => r.data.data),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: q.trim().length >= 2,
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

  // Empty query state
  if (!q || q.trim().length < 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-20 h-20 rounded-3xl bg-[#111] border border-white/6 flex items-center justify-center"
        >
          <SearchIcon size={32} className="text-[#333]" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-lg font-semibold text-[#e0e0e0]">Search Streamora</p>
          <p className="text-sm text-[#555] mt-1">Type at least 2 characters to find videos</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-6 max-w-5xl mx-auto">
      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-2 mb-6"
      >
        <div className="flex items-center gap-2 text-[#555] mr-1">
          <SlidersHorizontal size={14} />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <FilterPill label="Sort by"      value={sort}     options={SORT_OPTIONS}     onChange={(v) => setParam('sort', v === 'relevance' ? '' : v)} />
        <FilterPill label="Upload date"  value={date}     options={DATE_OPTIONS}     onChange={(v) => setParam('date', v)} />
        <FilterPill label="Duration"     value={duration} options={DURATION_OPTIONS} onChange={(v) => setParam('duration', v)} />
        {hasFilters && (
          <button
            onClick={() => setSearchParams({ q }, { replace: true })}
            className="flex items-center gap-1 text-xs text-[#555] hover:text-[#e0e0e0] transition-colors px-2.5 py-1.5 rounded-full hover:bg-white/5"
          >
            <X size={11} /> Clear
          </button>
        )}
      </motion.div>

      {/* Results label */}
      {!isLoading && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-[#555] mb-5"
        >
          {videos.length === 0
            ? `No results for "${q}"`
            : <><span className="text-[#888]">{videos.length}{hasNextPage ? '+' : ''}</span> results for "<span className="text-[#e0e0e0]">{q}</span>"</>}
        </motion.p>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="flex flex-col gap-6">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-[#e0e0e0] font-semibold">Search failed</p>
          <p className="text-sm text-[#555]">Please try again.</p>
        </div>
      ) : videos.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-5 py-24 text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-[#111] border border-white/6 flex items-center justify-center">
            <SearchIcon size={32} className="text-[#333]" />
          </div>
          <div>
            <p className="text-[#e0e0e0] font-semibold text-lg">No results found</p>
            <p className="text-sm text-[#555] mt-1">Try different keywords or remove filters</p>
          </div>
          {hasFilters && (
            <button onClick={() => setSearchParams({ q }, { replace: true })}
              className="text-sm text-[#3ea6ff] hover:underline">
              Clear all filters
            </button>
          )}
        </motion.div>
      ) : (
        <div className="flex flex-col gap-5">
          {videos.map((video, i) => <ResultRow key={video._id} video={video} index={i} />)}
        </div>
      )}

      {/* Infinite scroll */}
      <div ref={loaderRef} className="flex justify-center py-10">
        {isFetchingNextPage && <Spinner />}
      </div>

      {!isLoading && !hasNextPage && videos.length > 0 && (
        <p className="text-center text-[#333] text-sm pb-6 flex items-center justify-center gap-3">
          <span className="w-16 h-px bg-white/6" />
          End of results
          <span className="w-16 h-px bg-white/6" />
        </p>
      )}
    </div>
  );
};

export default Search;
