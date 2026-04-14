import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Target, ChevronRight } from 'lucide-react';
import { goalService } from '../../services/goal.service';
import { useAuth } from '../../hooks/useAuth';

const GoalWidget = () => {
  const { isAuthenticated } = useAuth();

  const { data: goal } = useQuery({
    queryKey: ['active-goal'],
    queryFn: () => goalService.getActive().then((r) => r.data.data.goal),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  if (!isAuthenticated || !goal) return null;

  const pct = Math.min(Math.round((goal.completedVideos / goal.targetVideos) * 100), 100);
  const remaining = goal.targetVideos - goal.completedVideos;
  const daysLeft = Math.max(0, Math.ceil((new Date(goal.endDate) - new Date()) / (1000 * 60 * 60 * 24)));

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5"
    >
      <Link to="/goals">
        <div className="flex items-center gap-4 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3f3f3f] rounded-2xl px-4 py-3 transition-colors group">
          <div className="w-8 h-8 rounded-xl bg-[#3ea6ff]/10 flex items-center justify-center flex-shrink-0">
            <Target size={16} className="text-[#3ea6ff]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-[#f1f1f1] truncate">{goal.title}</p>
              <span className="text-xs text-[#3ea6ff] font-semibold ml-2 flex-shrink-0">{pct}%</span>
            </div>
            <div className="w-full bg-[#272727] rounded-full h-1.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-1.5 rounded-full bg-[#3ea6ff]"
              />
            </div>
            <p className="text-xs text-[#606060] mt-1">
              {remaining} video{remaining !== 1 ? 's' : ''} left · {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
            </p>
          </div>
          <ChevronRight size={14} className="text-[#606060] group-hover:text-[#aaaaaa] flex-shrink-0" />
        </div>
      </Link>
    </motion.div>
  );
};

export default GoalWidget;
