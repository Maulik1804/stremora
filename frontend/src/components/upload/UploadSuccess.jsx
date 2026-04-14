import { motion } from 'framer-motion';
import { CheckCircle, ExternalLink, UploadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';

const UploadSuccess = ({ video, onUploadAnother }) => (
  <div className="flex flex-col items-center gap-8 py-12 text-center">
    {/* Success icon */}
    <motion.div
      initial={{ scale: 0, rotate: -30 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
      className="w-24 h-24 rounded-full bg-green-900/30 flex items-center justify-center"
    >
      <CheckCircle size={48} className="text-green-400" />
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="flex flex-col gap-2"
    >
      <h2 className="text-xl font-bold text-[#f1f1f1]">Video uploaded!</h2>
      <p className="text-sm text-[#aaaaaa] max-w-sm">
        Your video is live and ready to watch.
      </p>
    </motion.div>

    {/* Thumbnail preview */}
    {video?.thumbnailUrl && (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35 }}
        className="w-64 aspect-video rounded-xl overflow-hidden bg-[#272727]"
      >
        <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
      </motion.div>
    )}

    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="text-sm font-medium text-[#f1f1f1] max-w-xs line-clamp-2"
    >
      {video?.title}
    </motion.p>

    {/* Actions */}
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="flex flex-wrap gap-3 justify-center"
    >
      {video?._id && (
        <Link to={`/watch/${video._id}`}>
          <Button variant="primary">
            <ExternalLink size={15} />
            Watch video
          </Button>
        </Link>
      )}
      <Button variant="secondary" onClick={onUploadAnother}>
        <UploadCloud size={15} />
        Upload another
      </Button>
    </motion.div>
  </div>
);

export default UploadSuccess;
