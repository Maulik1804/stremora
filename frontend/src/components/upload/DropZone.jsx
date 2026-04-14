import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Film, AlertCircle } from 'lucide-react';

// Include all known AVI MIME variants — Windows/browsers are inconsistent
const ACCEPTED_TYPES = '.mp4,.mov,.avi,.mkv,video/mp4,video/quicktime,video/avi,video/msvideo,video/x-msvideo,video/x-avi,video/x-matroska,video/mkv';

const DropZone = ({ onFileSelect, error }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Drop area */}
      <motion.div
        animate={{
          borderColor: dragging ? '#ff0000' : '#3f3f3f',
          backgroundColor: dragging ? 'rgba(255,0,0,0.05)' : 'rgba(255,255,255,0.02)',
          scale: dragging ? 1.01 : 1,
        }}
        transition={{ duration: 0.15 }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className="w-full max-w-xl border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-5 cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label="Upload video"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <motion.div
          animate={{ y: dragging ? -6 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-20 h-20 rounded-full bg-[#272727] flex items-center justify-center"
        >
          {dragging
            ? <Film size={36} className="text-[#ff0000]" />
            : <UploadCloud size={36} className="text-[#aaaaaa]" />}
        </motion.div>

        <div className="text-center">
          <p className="text-base font-semibold text-[#f1f1f1]">
            {dragging ? 'Drop your video here' : 'Drag and drop a video'}
          </p>
          <p className="text-sm text-[#aaaaaa] mt-1">
            or <span className="text-[#3ea6ff] hover:underline">browse files</span>
          </p>
          <p className="text-xs text-[#606060] mt-3">
            MP4, MOV, AVI, MKV · Max 100 MB
          </p>
          <p className="text-xs text-[#3f3f3f] mt-1">
            (Cloudinary Free plan limit)
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleChange}
          className="hidden"
          aria-hidden="true"
        />
      </motion.div>

      {/* File error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 text-sm text-red-400 bg-red-950/40 border border-red-800/50 px-4 py-3 rounded-xl"
          >
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DropZone;
