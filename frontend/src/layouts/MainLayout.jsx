import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import { selectSidebarExpanded, setSidebarExpanded } from '../store/slices/sidebarSlice';
import { selectFocusMode } from '../store/slices/focusSlice';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.16 } },
};

const MainLayout = () => {
  const isExpanded = useSelector(selectSidebarExpanded);
  const focusMode = useSelector(selectFocusMode);
  const dispatch = useDispatch();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && window.innerWidth >= 768) {
        dispatch(setSidebarExpanded(false));
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch]);

  const sidebarWidth = focusMode
    ? 0
    : typeof window !== 'undefined' && window.innerWidth < 768
      ? 0
      : isExpanded ? 232 : 68;

  return (
    <div className={`min-h-screen bg-[#080808] transition-colors duration-300 ${focusMode ? 'bg-[#050505]' : ''}`}>
      <AnimatePresence>
        {!focusMode && (
          <motion.div key="navbar"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.2 }}
          >
            <Navbar />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!focusMode && (
          <motion.div key="sidebar"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.main
        animate={{ marginLeft: sidebarWidth }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className={`${focusMode ? 'pt-0' : 'pt-14'} min-h-screen`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </motion.main>
    </div>
  );
};

export default MainLayout;
