import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, X, Upload, Bell, LogIn, TrendingUp, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useSidebar } from '../../hooks/useSidebar';
import { useSearchSuggestions } from '../../hooks/useSearchSuggestions';
import { useWindowWidth } from '../../hooks/useWindowWidth';
import Avatar from '../ui/Avatar';
import SurpriseButton from '../features/SurpriseButton';
import { formatCount } from '../../utils/format';


// ── Recent searches (localStorage) ───────────────────────────────────────────
const RECENT_KEY = 'streamora_recent_searches';
const getRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; } };
const addRecent = (q) => {
  try {
    const prev = getRecent().filter((s) => s !== q);
    localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, 6)));
  } catch { /* ignore */ }
};
const clearRecent = () => { try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ } };

// ── SearchBox ─────────────────────────────────────────────────────────────────
const SearchBox = ({ onSearch, autoFocus = false, className = '' }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [recent, setRecent] = useState(getRecent);
  const { suggestions, loading } = useSearchSuggestions(query);
  const inputRef = useRef(null);
  const boxRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => setActiveIdx(-1), [suggestions]);

  const submit = useCallback((value) => {
    const q = (value ?? query).trim();
    if (q.length < 2) return;
    addRecent(q);
    setRecent(getRecent());
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setQuery(q);
    setOpen(false);
    onSearch?.();
  }, [query, navigate, onSearch]);

  const handleKeyDown = (e) => {
    const items = query.trim().length >= 2 ? suggestions : recent;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) {
        const item = items[activeIdx];
        submit(typeof item === 'string' ? item : item.title);
      } else submit();
    }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  };

  const showSuggestions = open && query.trim().length >= 2 && suggestions.length > 0;
  const showRecent = open && query.trim().length < 2 && recent.length > 0;
  const showDropdown = showSuggestions || showRecent;

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      {/* Input row */}
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200
          ${open
            ? 'bg-[#1a1a1a] border-white/18 shadow-[0_0_0_3px_rgba(255,255,255,0.04)]'
            : 'bg-[#111] border-white/8 hover:border-white/14'}`}
        >
          <Search size={15} className={`flex-shrink-0 transition-colors ${open ? 'text-[#aaa]' : 'text-[#555]'}`} />

          <input
            ref={inputRef}
            autoFocus={autoFocus}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search videos, channels..."
            className="flex-1 bg-transparent text-sm text-[#f0f0f0] placeholder:text-[#444] outline-none min-w-0"
            aria-label="Search"
            autoComplete="off"
            spellCheck={false}
          />

          

          {/* Divider + search button */}
          <div className="w-px h-4 bg-white/8 flex-shrink-0" />
          <button
            type="submit"
            className="flex-shrink-0 text-[#666] hover:text-[#f0f0f0] transition-colors p-0.5"
            aria-label="Search"
          >
            <Search size={15} />
          </button>
        </div>
      </form>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-0 right-0 mt-2 z-50 overflow-hidden"
            style={{ filter: 'drop-shadow(0 16px 48px rgba(0,0,0,0.8))' }}
          >
            <div className="bg-[#111] border border-white/8 rounded-2xl overflow-hidden">

              {/* Suggestions from search */}
              {showSuggestions && (
                <>
                  <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#444]">Suggestions</span>
                    {loading && <div className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />}
                  </div>
                  {suggestions.map((item, i) => (
                    <button
                      key={item._id || i}
                      type="button"
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => submit(item.title)}
                      className={`w-full flex items-center gap-3 px-3 py-2 mx-1 rounded-xl transition-all duration-100 text-left
                        ${i === activeIdx ? 'bg-white/6' : 'hover:bg-white/4'}`}
                      style={{ width: 'calc(100% - 8px)' }}
                    >
                      {/* Thumbnail */}
                      <div className="w-12 h-8 rounded-lg overflow-hidden bg-[#1a1a1a] flex-shrink-0">
                        {item.thumbnailUrl
                          ? <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Search size={10} className="text-[#444]" /></div>
                        }
                      </div>
                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#e0e0e0] truncate leading-snug">{item.title}</p>
                        {item.owner && (
                          <p className="text-xs text-[#555] truncate mt-0.5">
                            {item.owner.displayName || item.owner.username}
                            {item.viewCount > 0 && <span className="ml-1.5">{formatCount(item.viewCount)} views</span>}
                          </p>
                        )}
                      </div>
                      <Search size={12} className="text-[#444] flex-shrink-0" />
                    </button>
                  ))}
                  <div className="h-2" />
                </>
              )}

              {/* Recent searches */}
              {showRecent && (
                <>
                  <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#444]">Recent</span>
                    <button
                      type="button"
                      onClick={() => { clearRecent(); setRecent([]); }}
                      className="text-[10px] text-[#555] hover:text-[#999] transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  {recent.map((r, i) => (
                    <button
                      key={r}
                      type="button"
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => submit(r)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 mx-1 rounded-xl transition-all duration-100 text-left
                        ${i === activeIdx ? 'bg-white/6' : 'hover:bg-white/4'}`}
                      style={{ width: 'calc(100% - 8px)' }}
                    >
                      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                        <Clock size={13} className="text-[#555]" />
                      </div>
                      <span className="text-sm text-[#ccc] truncate flex-1">{r}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = recent.filter((s) => s !== r);
                          try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
                          setRecent(next);
                        }}
                        className="text-[#444] hover:text-[#999] transition-colors p-1"
                      >
                        <X size={11} />
                      </button>
                    </button>
                  ))}
                  <div className="h-2" />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Logo ──────────────────────────────────────────────────────────────────────
const Logo = () => (
  <Link to="/" className="flex items-center gap-0.5 select-none group">
    <motion.span
      className="text-[#ff0000] font-black text-xl tracking-tight"
      whileHover={{ scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      Stream
    </motion.span>
    <span className="text-[#f0f0f0] font-black text-xl tracking-tight">ora</span>
  </Link>
);

// ── Navbar ────────────────────────────────────────────────────────────────────
const Navbar = () => {
  const { user, isAuthenticated } = useAuth();
  const { toggle, toggleMobile, mobileOpen } = useSidebar();
  const windowWidth = useWindowWidth();
  const handleMenuClick = () => windowWidth < 768 ? toggleMobile() : toggle();
  const navigate = useNavigate();
  const location = useLocation();

  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => setShowMobileSearch(false), [location.pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 navbar-blur flex items-center px-4 gap-4">
      {/* Left */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <motion.button
          onClick={handleMenuClick}
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
          className="p-2 rounded-xl hover:bg-white/6 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={19} className="text-[#f0f0f0]" />
        </motion.button>
        <Logo />
      </div>

      {/* Center search */}
      <SearchBox className="hidden md:flex flex-1 max-w-lg mx-auto" />

      {/* Right */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          className="md:hidden p-2 rounded-xl hover:bg-white/6 transition-colors"
          onClick={() => setShowMobileSearch(true)} aria-label="Search"
        >
          <Search size={19} className="text-[#f0f0f0]" />
        </button>

        <Link to="/trending" className="hidden sm:block">
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
            className="p-2 rounded-xl hover:bg-white/6 transition-colors" aria-label="Trending">
            <TrendingUp size={19} className="text-[#f0f0f0]" />
          </motion.button>
        </Link>

        <SurpriseButton className="hidden md:flex text-xs px-3 py-1.5" />

        {isAuthenticated ? (
          <>
            <Link to="/upload">
              <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
                className="p-2 rounded-xl hover:bg-white/6 transition-colors" aria-label="Upload">
                <Upload size={19} className="text-[#f0f0f0]" />
              </motion.button>
            </Link>

            <Link to="/notifications">
              <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
                className="relative p-2 rounded-xl hover:bg-white/6 transition-colors" aria-label="Notifications">
                <Bell size={19} className="text-[#f0f0f0]" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ff0000] rounded-full ring-2 ring-[#080808]" />
              </motion.button>
            </Link>

            {/* User menu */}
            <div className="relative ml-1" ref={menuRef}>
              <motion.button
                onClick={() => setShowUserMenu((v) => !v)}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                className="rounded-full ring-2 ring-transparent hover:ring-white/20 transition-all duration-200"
                aria-label="Account menu"
              >
                <Avatar src={user?.avatar} alt={user?.displayName || user?.username} size="sm" />
              </motion.button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                    className="absolute right-0 top-11 w-60 glass-strong rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    {/* User info */}
                    <div className="px-4 py-3.5 border-b border-white/6">
                      <div className="flex items-center gap-3">
                        <Avatar src={user?.avatar} alt={user?.displayName || user?.username} size="md" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#f0f0f0] truncate">{user?.displayName}</p>
                          <p className="text-xs text-[#666] truncate">@{user?.username}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5">
                      {[
                        { label: 'Your channel', to: `/channel/${user?.username}`, emoji: '📺' },
                        { label: 'Studio', to: '/studio', emoji: '🎬' },
                        { label: 'Dashboard', to: '/dashboard', emoji: '📊' },
                        { label: 'Settings', to: '/settings', emoji: '⚙️' },
                      ].map(({ label, to, emoji }) => (
                        <Link key={to} to={to} onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#ccc] hover:text-[#f0f0f0] hover:bg-white/5 rounded-xl transition-all duration-150">
                          <span className="text-base">{emoji}</span>
                          {label}
                        </Link>
                      ))}
                    </div>

                    <div className="p-1.5 border-t border-white/6">
                      <button
                        onClick={() => { navigate('/logout'); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[#ff6b6b] hover:text-[#ff4444] hover:bg-red-500/8 rounded-xl transition-all duration-150"
                      >
                        <span className="text-base">🚪</span>
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link to="/login">
              <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/12 hover:border-white/24 hover:bg-white/4 text-sm font-medium text-[#f0f0f0] transition-all duration-200">
                <LogIn size={15} />
                Sign in
              </button>
            </Link>
          </motion.div>
        )}
      </div>

      {/* Mobile search overlay */}
      <AnimatePresence>
        {showMobileSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 navbar-blur flex items-center px-4 gap-3 z-50"
          >
            <SearchBox autoFocus className="flex-1" onSearch={() => setShowMobileSearch(false)} />
            <motion.button whileTap={{ scale: 0.94 }}
              onClick={() => setShowMobileSearch(false)}
              className="p-2 rounded-xl hover:bg-white/6 flex-shrink-0" aria-label="Close">
              <X size={19} className="text-[#f0f0f0]" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
