import { useEffect, useRef, useCallback } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Compass, PlaySquare, ThumbsUp, ListVideo,
  Bell, History, LayoutDashboard, Settings, Clapperboard,
  TrendingUp, Target, X, LogIn, Film,
} from 'lucide-react';
import { useSidebar } from '../../hooks/useSidebar';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../ui/Avatar';

// ── Nav definitions ───────────────────────────────────────────────────────────
const NAV_PUBLIC = [
  { icon: Home,       label: 'Home',      to: '/' },
  { icon: TrendingUp, label: 'Trending',  to: '/trending' },
  { icon: Compass,    label: 'Explore',   to: '/explore' },
];

const NAV_AUTH = [
  { icon: PlaySquare, label: 'Subscriptions', to: '/subscriptions' },
  { icon: History,    label: 'History',       to: '/history' },
  { icon: ThumbsUp,   label: 'Liked',         to: '/liked' },
  { icon: ListVideo,  label: 'Playlists',     to: '/playlists' },
  { icon: Target,     label: 'Goals',         to: '/goals' },
  { icon: Bell,       label: 'Notifications', to: '/notifications' },
];

const NAV_CREATOR = [
  { icon: LayoutDashboard, label: 'Dashboard',         to: '/dashboard' },
  { icon: Clapperboard,    label: 'Studio',             to: '/studio' },
  { icon: Film,            label: 'Channel Playlists',  to: '/series' },
  { icon: Settings,        label: 'Settings',           to: '/settings' },
];

// ── NavItem ───────────────────────────────────────────────────────────────────
const NavItem = ({ icon: Icon, label, to, collapsed, onClick }) => (
  <NavLink
    to={to}
    end={to === '/'}
    onClick={onClick}
    className={({ isActive }) =>
      `relative flex items-center gap-3 rounded-xl transition-all duration-150 text-sm font-medium group
       ${collapsed ? 'justify-center px-2.5 py-2.5' : 'px-3 py-2.5'}
       ${isActive
         ? 'bg-white/8 text-[#f0f0f0] nav-active'
         : 'text-[#666] hover:bg-white/5 hover:text-[#ccc]'}`
    }
    title={collapsed ? label : undefined}
  >
    {({ isActive }) => (
      <>
        <Icon
          size={18}
          className={`flex-shrink-0 transition-colors
            ${isActive ? 'text-[#f0f0f0]' : 'text-[#555] group-hover:text-[#ccc]'}`}
        />
        {!collapsed && (
          <span className="whitespace-nowrap">{label}</span>
        )}
      </>
    )}
  </NavLink>
);

const Divider = () => <div className="my-2 mx-3 border-t border-white/5" />;

const SectionLabel = ({ label }) => (
  <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#3a3a3a]">
    {label}
  </p>
);

// ── Shared nav list ───────────────────────────────────────────────────────────
const NavList = ({ collapsed = false, onItemClick }) => {
  const { isAuthenticated } = useAuth();

  return (
    <nav className="flex flex-col gap-0.5 p-2 pt-3">
      {NAV_PUBLIC.map((item) => (
        <NavItem key={item.to} {...item} collapsed={collapsed} onClick={onItemClick} />
      ))}

      {isAuthenticated && (
        <>
          <Divider />
          {!collapsed && <SectionLabel label="Library" />}
          {NAV_AUTH.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} onClick={onItemClick} />
          ))}
          <Divider />
          {!collapsed && <SectionLabel label="Creator" />}
          {NAV_CREATOR.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} onClick={onItemClick} />
          ))}
        </>
      )}
    </nav>
  );
};

// ── Desktop Sidebar ───────────────────────────────────────────────────────────
export const DesktopSidebar = () => {
  const { isExpanded } = useSidebar();

  return (
    <motion.aside
      animate={{ width: isExpanded ? 232 : 68 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-14 bottom-0 z-40 bg-[#080808] border-r border-white/5
                 overflow-y-auto overflow-x-hidden hidden md:flex flex-col"
    >
      <NavList collapsed={!isExpanded} />

      {/* Footer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-auto p-4 text-[10px] text-[#252525] text-center"
          >
            © 2026 Streamora
          </motion.p>
        )}
      </AnimatePresence>
    </motion.aside>
  );
};

// ── Mobile Drawer ─────────────────────────────────────────────────────────────
export const MobileDrawer = () => {
  const { mobileOpen, setMobileOpen } = useSidebar();
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Close on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]); // eslint-disable-line

  // Body scroll lock
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileOpen]);

  // ESC to close
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mobileOpen]); // eslint-disable-line

  // Focus close button when drawer opens
  useEffect(() => {
    if (mobileOpen) {
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
  }, [mobileOpen]);

  // Swipe-to-close (touch)
  const touchStartX = useRef(null);
  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (delta > 60) setMobileOpen(false); // swipe left > 60px = close
    touchStartX.current = null;
  }, []); // eslint-disable-line

  const close = useCallback(() => setMobileOpen(false), []); // eslint-disable-line

  return (
    <AnimatePresence>
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm md:hidden"
            aria-hidden="true"
            onClick={close}
          />

          {/* Drawer panel */}
          <motion.aside
            key="drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="fixed left-0 top-0 bottom-0 z-[70] w-72 max-w-[85vw]
                       bg-[#0a0a0a] border-r border-white/6
                       flex flex-col overflow-hidden md:hidden
                       shadow-[4px_0_40px_rgba(0,0,0,0.8)]"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/6 flex-shrink-0">
              <Link to="/" onClick={close} className="flex items-center gap-0.5 select-none">
                <span className="text-[#ff0000] font-black text-xl tracking-tight">Stream</span>
                <span className="text-[#f0f0f0] font-black text-xl tracking-tight">ora</span>
              </Link>
              <button
                ref={closeButtonRef}
                onClick={close}
                className="p-2 rounded-xl text-[#666] hover:text-[#f0f0f0] hover:bg-white/6
                           transition-all duration-150 focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-white/20"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── User profile strip (authenticated) ── */}
            {isAuthenticated && user && (
              <Link
                to={`/channel/${user.username}`}
                onClick={close}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5
                           hover:bg-white/4 transition-colors duration-150 flex-shrink-0"
              >
                <Avatar src={user.avatar} alt={user.displayName || user.username} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#e8e8e8] truncate leading-tight">
                    {user.displayName || user.username}
                  </p>
                  <p className="text-xs text-[#555] truncate mt-0.5">@{user.username}</p>
                </div>
              </Link>
            )}

            {/* ── Nav list (scrollable) ── */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <NavList collapsed={false} onItemClick={close} />
            </div>

            {/* ── Footer ── */}
            <div className="flex-shrink-0 border-t border-white/5 p-3 space-y-1">
              {!isAuthenticated && (
                <Link
                  to="/login"
                  onClick={close}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                             text-sm font-medium text-[#f0f0f0]
                             bg-[#e50914] hover:bg-[#f40612]
                             transition-colors duration-150"
                >
                  <LogIn size={16} />
                  Sign in
                </Link>
              )}
              <p className="text-[10px] text-[#252525] text-center pt-1">© 2026 Streamora</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

// ── Default export (both combined) ───────────────────────────────────────────
const Sidebar = () => (
  <>
    <DesktopSidebar />
    <MobileDrawer />
  </>
);

export default Sidebar;
