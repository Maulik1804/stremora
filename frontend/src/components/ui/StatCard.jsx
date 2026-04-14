import { motion } from 'framer-motion';

const ACCENT_COLORS = {
  blue:   { bg: 'bg-blue-500/10',   icon: 'text-blue-400',   border: 'border-blue-500/20' },
  red:    { bg: 'bg-red-500/10',    icon: 'text-red-400',    border: 'border-red-500/20' },
  green:  { bg: 'bg-green-500/10',  icon: 'text-green-400',  border: 'border-green-500/20' },
  purple: { bg: 'bg-purple-500/10', icon: 'text-purple-400', border: 'border-purple-500/20' },
  orange: { bg: 'bg-orange-500/10', icon: 'text-orange-400', border: 'border-orange-500/20' },
  yellow: { bg: 'bg-yellow-500/10', icon: 'text-yellow-400', border: 'border-yellow-500/20' },
};

const StatCard = ({
  label,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  loading = false,
  index = 0,
}) => {
  const accent = ACCENT_COLORS[color] ?? ACCENT_COLORS.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="bg-[#141414] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 hover:border-white/10 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#606060] uppercase tracking-widest">{label}</span>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl ${accent.bg} border ${accent.border} flex items-center justify-center`}>
            <Icon size={16} className={accent.icon} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="skeleton h-8 w-28 rounded-xl" />
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-bold text-[#f8f8f8] tabular-nums"
        >
          {value ?? '—'}
        </motion.p>
      )}

      {trend !== undefined && !loading && (
        <p className={`text-xs font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last period
        </p>
      )}
    </motion.div>
  );
};

export default StatCard;
