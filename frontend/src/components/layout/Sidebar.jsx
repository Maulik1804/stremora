import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Compass, PlaySquare, ThumbsUp, ListVideo,
  Bell, History, LayoutDashboard, Settings, Clapperboard, TrendingUp, Target,
} from 'lucide-react';
import { useSidebar } from '../../hooks/useSidebar';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS_PUBLIC = [
  { icon: Home,       label: 'Home',      to: '/' },
  { icon: TrendingUp, label: 'Trending',  to: '/trending' },
  { icon: Compass,    label: 'Explore',   to: '/explore' },
];

const NAV_ITEMS_AUTH = [
  { icon: PlaySquare, label: 'Subscriptions', to: '/subscriptions' },
  { icon: History,    label: 'History',       to: '/history' },
  { icon: ThumbsUp,   label: 'Liked',         to: '/liked' },
  { icon: ListVideo,  label: 'Playlists',     to: '/playlists' },
  { icon: Target,     label: 'Goals',         to: '/goals' },
  { icon: Bell,       label: 'Notifications', to: '/notifications' },
];

const NAV_ITEMS_CREATOR = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
  { icon: Clapperboard,    label: 'Studio',    to: '/studio' },
  { icon: Settings,        label: 'Settings',  to: '/settings' },
];

const NavItem = ({ icon: Icon, label, to, isExpanded }) => (
  <NavLink
    to={to}
    end={to === '/'}
    className={({ isActive }) =>
      `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium group
      ${isActive
        ? 'bg-white/7 text-[#f0f0f0] nav-active-indicator'
        : 'text-[#666] hover:bg-white/4 hover:text-[#ccc]'}
      ${!isExpanded ? 'justify-center px-2.5' : ''}`
    }
    title={!isExpanded ? label : undefined}
  >
    {({ isActive }) => (
      <>
        <Icon size={18} className={`flex-shrink-0 transition-colors ${isActive ? 'text-[#f0f0f0]' : 'text-[#555] group-hover:text-[#ccc]'}`} />
        <AnimatePresence>
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden whitespace-nowrap"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </>
    )}
  </NavLink>
);

const SectionLabel = ({ label, isExpanded }) => (
  <AnimatePresence>
    {isExpanded && (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#444]"
      >
        {label}
      </motion.p>
    )}
  </AnimatePresence>
);

const Divider = () => <div className="my-2 mx-3 border-t border-white/4" />;

const Sidebar = () => {
  const { isExpanded } = useSidebar();
  const { isAuthenticated } = useAuth();

  return (
    <motion.aside
      animate={{ width: isExpanded ? 232 : 68 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-14 bottom-0 z-40 bg-[#080808] border-r border-white/4 overflow-y-auto overflow-x-hidden flex-shrink-0 hidden md:block"
    >
      <nav className="flex flex-col gap-0.5 p-2 pt-3 pb-4">
        {NAV_ITEMS_PUBLIC.map((item) => (
          <NavItem key={item.to} {...item} isExpanded={isExpanded} />
        ))}

        {isAuthenticated && (
          <>
            <Divider />
            <SectionLabel label="Library" isExpanded={isExpanded} />
            {NAV_ITEMS_AUTH.map((item) => (
              <NavItem key={item.to} {...item} isExpanded={isExpanded} />
            ))}
            <Divider />
            <SectionLabel label="Creator" isExpanded={isExpanded} />
            {NAV_ITEMS_CREATOR.map((item) => (
              <NavItem key={item.to} {...item} isExpanded={isExpanded} />
            ))}
          </>
        )}

        {/* Copyright — in normal flow, never overlaps */}
        <AnimatePresence>
          {isExpanded && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 px-3 text-[10px] text-[#2a2a2a] text-center"
            >
              © 2026 Streamora
            </motion.p>
          )}
        </AnimatePresence>
      </nav>
    </motion.aside>
  );
};

export default Sidebar;
