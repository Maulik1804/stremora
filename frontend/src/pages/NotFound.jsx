import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 text-center px-4">
      {/* Animated 404 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: 'spring', stiffness: 150 }}
        className="relative"
      >
        <p className="text-[120px] sm:text-[160px] font-black leading-none select-none"
          style={{
            background: 'linear-gradient(135deg, #1e1e1e 0%, #282828 50%, #1e1e1e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          404
        </p>
        {/* Red accent */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-1 bg-[#ff0000] rounded-full"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-2xl font-bold text-[#f8f8f8]">Page not found</h1>
        <p className="text-[#a0a0a0] max-w-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="flex items-center gap-3"
      >
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} />
          Go back
        </Button>
        <Link to="/">
          <Button variant="primary" size="sm">
            <Home size={15} />
            Home
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
