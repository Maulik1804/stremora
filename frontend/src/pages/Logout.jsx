import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';

/**
 * Dedicated logout page — shown briefly while the logout request fires,
 * then redirects to /login. Accessible via /logout or programmatic navigation.
 */
const Logout = () => {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const doLogout = async () => {
      await logout();
      if (!cancelled) {
        setDone(true);
        setTimeout(() => navigate('/login', { replace: true }), 1200);
      }
    };

    doLogout();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col items-center gap-5 text-center"
      >
        {done ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-16 h-16 rounded-full bg-green-900/30 flex items-center justify-center"
            >
              <CheckCircle size={32} className="text-green-400" />
            </motion.div>
            <div>
              <p className="text-lg font-semibold text-[#f1f1f1]">Signed out</p>
              <p className="text-sm text-[#aaaaaa] mt-1">Redirecting you to sign in…</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-[#272727] flex items-center justify-center">
              <LogOut size={28} className="text-[#aaaaaa]" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[#f1f1f1]">Signing out…</p>
              <p className="text-sm text-[#aaaaaa] mt-1">Please wait a moment</p>
            </div>
            <Spinner size="sm" />
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Logout;
