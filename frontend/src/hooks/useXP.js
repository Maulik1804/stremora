import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featuresService } from '../services/features.service';
import { useAuth } from './useAuth';
import { toast } from '../components/ui/Toast';

export const useXP = () => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['xp'],
    queryFn: () => featuresService.getXP().then((r) => r.data.data),
    enabled: isAuthenticated,
  });

  const awardMutation = useMutation({
    mutationFn: (action) => featuresService.awardXP(action),
    onSuccess: (res) => {
      const { earned, streakBonus } = res.data.data;
      queryClient.invalidateQueries({ queryKey: ['xp'] });
      if (streakBonus > 0) {
        toast.success(`🔥 Streak bonus! +${earned} XP`);
      }
    },
  });

  return {
    xp: data?.xp ?? 0,
    streak: data?.streak ?? 0,
    streakActive: data?.streakActive ?? false,
    level: data?.level ?? 1,
    xpInLevel: data?.xpInLevel ?? 0,
    xpToNextLevel: data?.xpToNextLevel ?? 100,
    award: (action) => isAuthenticated && awardMutation.mutate(action),
  };
};
