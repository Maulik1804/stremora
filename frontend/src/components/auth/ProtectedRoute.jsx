import { Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';

/**
 * Wraps any route that requires authentication.
 *
 * Behaviour:
 * - While the initial auth check is in-flight (`!initialized`): show a
 *   full-screen branded loader so the user never sees a flash-redirect.
 * - Once initialized and NOT authenticated: redirect to /login, preserving
 *   the originally requested URL in `location.state.from` for post-login redirect.
 * - Once initialized and authenticated: render children.
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, initialized } = useAuth();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="fixed inset-0 bg-[#0f0f0f] flex flex-col items-center justify-center gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center gap-4"
        >
          {/* Branded spinner */}
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-[#3f3f3f]" />
            <div className="absolute inset-0 rounded-full border-2 border-t-[#ff0000] animate-spin" />
          </div>
          <p className="text-sm text-[#606060]">Loading…</p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
