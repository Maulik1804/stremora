import { motion } from 'framer-motion';

const SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-7 h-7 border-2',
  lg: 'w-11 h-11 border-[3px]',
};

const Spinner = ({ size = 'md', className = '' }) => (
  <div
    className={`${SIZES[size]} border-white/8 border-t-[#ff0000] rounded-full animate-spin ${className}`}
    role="status"
    aria-label="Loading"
  />
);

export const PageLoader = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="fixed inset-0 bg-[#080808] flex flex-col items-center justify-center gap-5 z-50"
  >
    <div className="relative">
      <div className="w-16 h-16 rounded-full border-[3px] border-white/4" />
      <div className="absolute inset-0 w-16 h-16 rounded-full border-[3px] border-transparent border-t-[#ff0000] animate-spin" />
      <div className="absolute inset-2 w-12 h-12 rounded-full border-[2px] border-transparent border-t-white/10 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
    </div>
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="flex items-center gap-0.5"
    >
      <span className="text-[#ff0000] font-black text-xl">Stream</span>
      <span className="text-[#f0f0f0] font-black text-xl">ora</span>
    </motion.div>
  </motion.div>
);

export default Spinner;
