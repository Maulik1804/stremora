import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

const ErrorState = ({
  title = 'Something went wrong',
  description = 'An error occurred. Please try again.',
  onRetry,
  className = '',
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className={`flex flex-col items-center justify-center gap-4 py-20 text-center px-4 ${className}`}
  >
    <motion.div
      initial={{ scale: 0.7 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
      className="w-16 h-16 rounded-2xl bg-red-950/30 border border-red-900/30 flex items-center justify-center"
    >
      <AlertTriangle size={28} className="text-red-400" />
    </motion.div>
    <div>
      <p className="text-base font-semibold text-[#f8f8f8]">{title}</p>
      <p className="text-sm text-[#a0a0a0] mt-1 max-w-xs">{description}</p>
    </div>
    {onRetry && (
      <Button variant="secondary" size="sm" onClick={onRetry}>
        <RefreshCw size={14} />
        Try again
      </Button>
    )}
  </motion.div>
);

export default ErrorState;
