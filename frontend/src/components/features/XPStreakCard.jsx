import { motion } from 'framer-motion';
import { Flame, Zap, Star } from 'lucide-react';
import { useXP } from '../../hooks/useXP';

const XPStreakCard = () => {
  const { xp, streak, streakActive, level, xpInLevel, xpToNextLevel } = useXP();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-white/8 rounded-2xl p-5 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-yellow-500/15 flex items-center justify-center">
            <Star size={16} className="text-yellow-400" />
          </div>
          <span className="text-sm font-semibold text-[#f8f8f8]">Level {level}</span>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold
          ${streakActive ? 'bg-orange-500/15 text-orange-400' : 'bg-white/5 text-[#606060]'}`}
        >
          <Flame size={14} className={streakActive ? 'text-orange-400' : 'text-[#606060]'} />
          {streak} day{streak !== 1 ? 's' : ''}
        </div>
      </div>

      {/* XP bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#a0a0a0] flex items-center gap-1">
            <Zap size={11} className="text-yellow-400" />
            {xp} XP total
          </span>
          <span className="text-[#606060]">{xpInLevel}/{xpInLevel + xpToNextLevel} to Level {level + 1}</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(xpInLevel / (xpInLevel + xpToNextLevel)) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
          />
        </div>
      </div>

      {/* Streak message */}
      {streakActive && streak >= 3 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-orange-400/80 text-center"
        >
          🔥 {streak}-day streak! Keep it up!
        </motion.p>
      )}
    </motion.div>
  );
};

export default XPStreakCard;
