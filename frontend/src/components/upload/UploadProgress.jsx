import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, AlertTriangle } from 'lucide-react';

// ── Cancel confirm modal ──────────────────────────────────────────────────────
const CancelConfirm = ({ onConfirm, onDismiss }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    onClick={onDismiss}
  >
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.92, opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => e.stopPropagation()}
      className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={18} className="text-orange-400" />
        </div>
        <div>
          <h3 className="text-[#e8e8e8] font-semibold">Cancel upload?</h3>
          <p className="text-sm text-[#666] mt-1">
            The upload will be stopped and no video will be saved.
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-5">
        <button
          onClick={onDismiss}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/6 text-[#e8e8e8] hover:bg-white/10 transition-colors"
        >
          Keep uploading
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-500 transition-colors"
        >
          Cancel upload
        </button>
      </div>
    </motion.div>
  </motion.div>
);

// ── Upload Progress ───────────────────────────────────────────────────────────
const UploadProgress = ({ progress = 0, fileName, onCancel }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const phase =
    progress < 90  ? 'uploading'  :
    progress < 96  ? 'processing' :
    progress < 100 ? 'saving'     : 'done';

  const label = {
    uploading:  'Uploading...',
    processing: 'Processing video…',
    saving:     'Saving…',
    done:       'Almost done!',
  }[phase];

  const sub = {
    uploading:  'Uploading directly to Cloudinary — fast and reliable',
    processing: 'Your video is being processed',
    saving:     'Saving video details',
    done:       'Finishing up…',
  }[phase];

  const color =
    phase === 'done' || phase === 'saving' ? '#22c55e' :
    phase === 'processing' ? '#f59e0b' : '#e50914';

  // Only allow cancel during actual upload (not during processing/saving)
  const canCancel = phase === 'uploading' && onCancel;

  const handleCancelClick = () => setShowConfirm(true);
  const handleConfirmCancel = () => {
    setShowConfirm(false);
    onCancel?.();
  };

  return (
    <>
      <AnimatePresence>
        {showConfirm && (
          <CancelConfirm
            onConfirm={handleConfirmCancel}
            onDismiss={() => setShowConfirm(false)}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center gap-6 py-10">
        {/* Ring */}
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#1f1f1f" strokeWidth="7" />
            <motion.circle
              cx="50" cy="50" r="44"
              fill="none"
              stroke={color}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
              animate={{ strokeDashoffset: (1 - Math.min(progress, 100) / 100) * 2 * Math.PI * 44 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {phase === 'done' ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                <CheckCircle size={30} className="text-green-400" />
              </motion.div>
            ) : (
              <span className="text-xl font-bold text-[#f1f1f1] tabular-nums">{Math.min(progress, 99)}%</span>
            )}
          </div>
        </div>

        {/* Text */}
        <div className="text-center max-w-xs px-4">
          <p className="text-base font-semibold text-[#f1f1f1]">{label}</p>
          {fileName && <p className="text-sm text-[#666] mt-1 truncate">{fileName}</p>}
          <p className="text-xs text-[#555] mt-1.5 leading-relaxed">{sub}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>

        {/* Cancel button — only during upload phase */}
        {canCancel ? (
          <button
            onClick={handleCancelClick}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-[#888] hover:text-[#e8e8e8] hover:bg-white/6 border border-white/8 hover:border-white/16 transition-all"
          >
            <X size={14} />
            Cancel upload
          </button>
        ) : (
          <p className="text-xs text-[#444] text-center">Do not close this page</p>
        )}
      </div>
    </>
  );
};

export default UploadProgress;
