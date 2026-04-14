import { useState, useEffect, useRef } from 'react';
import { useDebounce } from './useDebounce';
import { videoService } from '../services/video.service';

const cache = new Map();

/**
 * Returns rich suggestion objects: { title, thumbnailUrl, viewCount, owner }
 * Falls back to empty array on error.
 */
export const useSearchSuggestions = (query) => {
  const debounced = useDebounce(query, 280);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    const trimmed = debounced.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const key = trimmed.toLowerCase();
    if (cache.has(key)) {
      setSuggestions(cache.get(key));
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    videoService
      .search({ q: trimmed, limit: 8 })
      .then((r) => {
        const videos = r.data.data.videos ?? [];
        const results = videos.slice(0, 8).map((v) => ({
          title: v.title,
          thumbnailUrl: v.thumbnailUrl,
          viewCount: v.viewCount,
          owner: v.owner,
          _id: v._id,
        }));
        cache.set(key, results);
        setSuggestions(results);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [debounced]);

  return { suggestions, loading };
};
