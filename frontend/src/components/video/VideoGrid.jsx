import { motion } from 'framer-motion';
import VideoCard from './VideoCard';
import VideoCardSkeleton from './VideoCardSkeleton';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const VideoGrid = ({ videos = [], isLoading = false, skeletonCount = 12 }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8"
    >
      {videos.map((video, i) => (
        <VideoCard key={video._id} video={video} index={i} />
      ))}
    </motion.div>
  );
};

export default VideoGrid;
