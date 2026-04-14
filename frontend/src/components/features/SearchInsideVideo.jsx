import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clock, X } from 'lucide-react';
import { featuresService } from '../../services/features.service';
import { formatDuration } from '../../utils/format';
import { useDebounce } from '../../hooks/useDebounce';
import { useQuery } from '@tanstack/react-query';

/**
 * Feature 14: Search Inside Video.
 * Creator-defined keywords with timestamps — user types a word, gets jump points.
 */
const SearchInsideVideo = ({ videoId, onSeek }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['video-keywords', videoId, debouncedQuery],
    queryFn: () => featuresService.searchKeywords(videoId, debouncedQuery).then((r) => r.data.data),
    enabled: !!videoId && debouncedQuery.trim().length >= 1,
    staleTime: 60_000,
  });

  const matches = data?.matches ?? [];

  return (
    <div className="relative">
      {/* Search input */}
      <div className={`flex items-center gap-2 bg-white/5 border rounded-xl px-3 py-2 transition-colors
        ${open ? 'border-white/20' : 'border-white/8'}`}
      >
        <Search size={14} className="text-[#606060] flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search in video…"
          className="flex-1 bg-transparent text-sm text-[#f8f8f8] placeholder:text-[#606060] outline-none min-w-0"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); }}
            className="text-[#606060] hover:text-[#f8f8f8] flex-shrink-0"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {open && debouncedQuery.trim().length >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
            transition={{ duration: 0.12 }}
            style={{ transformOrigin: 'top' }}
            className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/8 rounded-xl shadow-2xl overflow-hidden z-30 max-h-48 overflow-y-auto"
          >
            {isLoading ? (
              <div className="px-4 py-3 text-xs text-[#606060]">Searching…</div>
            ) : matches.length === 0 ? (
              <div className="px-4 py-3 text-xs text-[#606060]">
                No matches for "{debouncedQuery}"
              </div>
            ) : (
              matches.map((m, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => {
                    onSeek?.(m.timestamp);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/6 transition-colors"
                >
                  <Clock size={13} className="text-[#ff0000] flex-shrink-0" />
                  <span className="font-mono text-xs text-[#ff0000] font-bold min-w-[44px]">
                    {formatDuration(m.timestamp)}
                  </span>
                  <span className="text-[#f8f8f8] capitalize">{m.word}</span>
                </motion.button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchInsideVideo;
