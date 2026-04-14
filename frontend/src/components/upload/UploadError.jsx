import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Button from '../ui/Button';

const UploadError = ({ message, onRetry, onReset }) => (
  <div className="flex flex-col items-center gap-8 py-12 text-center">
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className="w-24 h-24 rounded-full bg-red-900/30 flex items-center justify-center"
    >
      <AlertTriangle size={44} className="text-red-400" />
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="flex flex-col gap-2"
    >
      <h2 className="text-xl font-bold text-[#f1f1f1]">Upload failed</h2>
      <p className="text-sm text-red-400 max-w-sm">
        {message || 'Something went wrong. Please try again.'}
      </p>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="flex gap-3"
    >
      <Button variant="primary" onClick={onRetry}>
        <RefreshCw size={15} />
        Try again
      </Button>
      <Button variant="secondary" onClick={onReset}>
        <ArrowLeft size={15} />
        Start over
      </Button>
    </motion.div>
  </div>
);

export default UploadError;
