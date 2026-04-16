import { motion } from 'framer-motion';
import { UploadCloud, Loader2 } from 'lucide-react';

const UploadProgress = ({ progress = 0, fileName }) => {
  const isChunking   = progress < 92;
  const isProcessing = progress >= 92 && progress < 100;
  const isDone       = progress >= 100;

  const statusLabel = isDone
    ? 'Finalizing…'
    : isProcessing
    ? 'Processing on server…'
    : 'Uploading chunks…';

  const statusSub = isDone
    ? 'Almost done!'
    : isProcessing
    ? 'Your video is being processed. This may take a minute — please keep this page open.'
    : 'Large files may take a few minutes';

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      {/* Animated ring */}
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#272727" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke={isDone ? '#22c55e' : isProcessing ? '#f59e0b' : '#ff0000'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 44}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
            animate={{ strokeDashoffset: (1 - progress / 100) * 2 * Math.PI * 44 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isProcessing ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="text-yellow-400"
            >
              <Loader2 size={28} />
            </motion.div>
          ) : isDone ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="text-green-400"
            >
              <UploadCloud size={28} />
            </motion.div>
          ) : (
            <span className="text-xl font-bold text-[#f1f1f1] tabular-nums">{progress}%</span>
          )}
        </div>
      </div>

      <div className="text-center max-w-sm">
        <p className="text-base font-semibold text-[#f1f1f1]">{statusLabel}</p>
        {fileName && (
          <p className="text-sm text-[#aaaaaa] mt-1 truncate">{fileName}</p>
        )}
        <p className="text-xs text-[#606060] mt-2 leading-relaxed">{statusSub}</p>
      </div>

      {/* Linear bar */}
      <div className="w-full max-w-sm h-1.5 bg-[#272727] rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isDone ? 'bg-green-500' : isProcessing ? 'bg-yellow-500' : 'bg-[#ff0000]'}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {isProcessing && (
        <p className="text-xs text-yellow-500/70 text-center max-w-xs">
          Do not close or refresh this page
        </p>
      )}
    </div>
  );
};

export default UploadProgress;
