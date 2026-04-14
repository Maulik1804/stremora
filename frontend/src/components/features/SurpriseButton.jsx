import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shuffle } from 'lucide-react';
import { featuresService } from '../../services/features.service';

/**
 * Feature 5: "Surprise Me" random video button.
 * Fetches a random video and navigates to its watch page.
 */
const SurpriseButton = ({ className = '' }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await featuresService.getRandomVideo();
      const video = res.data.data.video;
      if (video?._id) navigate(`/watch/${video._id}`);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
        bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500
        text-white shadow-lg disabled:opacity-60 transition-all ${className}`}
    >
      <motion.div
        animate={loading ? { rotate: 360 } : { rotate: 0 }}
        transition={loading ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : {}}
      >
        <Shuffle size={15} />
      </motion.div>
      {loading ? 'Finding…' : 'Surprise Me'}
    </motion.button>
  );
};

export default SurpriseButton;
