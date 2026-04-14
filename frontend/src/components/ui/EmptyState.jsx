import { motion } from 'framer-motion';

const EmptyState = ({ icon: Icon, title, description, action, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className={`flex flex-col items-center justify-center gap-5 py-24 text-center px-4 ${className}`}
  >
    {Icon && (
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 18 }}
        className="w-18 h-18 rounded-3xl bg-[#111] border border-white/6 flex items-center justify-center p-5"
      >
        <Icon size={30} className="text-[#444]" />
      </motion.div>
    )}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="flex flex-col gap-1.5"
    >
      <p className="text-base font-semibold text-[#e0e0e0]">{title}</p>
      {description && (
        <p className="text-sm text-[#555] max-w-xs leading-relaxed">{description}</p>
      )}
    </motion.div>
    {action && (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        {action}
      </motion.div>
    )}
  </motion.div>
);

export default EmptyState;
