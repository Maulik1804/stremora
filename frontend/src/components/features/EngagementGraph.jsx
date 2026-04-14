import { useQuery } from '@tanstack/react-query';
import { featuresService } from '../../services/features.service';

/**
 * Feature 3: Engagement heatmap.
 * Only renders when there is actual engagement data (at least one bucket > 0).
 */
const EngagementGraph = ({ videoId, duration, onSeek }) => {
  const { data } = useQuery({
    queryKey: ['engagement', videoId],
    queryFn: () => featuresService.getEngagement(videoId).then((r) => r.data.data),
    staleTime: 30_000,
    enabled: !!videoId,
  });

  const buckets = data?.buckets ?? [];
  const max = Math.max(...buckets, 0);

  // Don't render if no real engagement data
  if (!buckets.length || max === 0) return null;

  return (
    <div
      className="w-full flex items-end gap-px cursor-pointer"
      style={{ height: '16px' }}
      title="Engagement heatmap — click to seek"
    >
      {buckets.map((val, i) => {
        const heightPct = Math.max(6, (val / max) * 100);
        const bucketStart = i * (data?.bucketSize ?? 5);
        return (
          <div
            key={i}
            onClick={() => onSeek?.(bucketStart)}
            style={{ height: `${heightPct}%` }}
            className="flex-1 rounded-sm bg-white/20 hover:bg-white/40 transition-colors"
            title={`${Math.floor(bucketStart / 60)}:${String(bucketStart % 60).padStart(2, '0')} — ${val}% engagement`}
          />
        );
      })}
    </div>
  );
};

export default EngagementGraph;
