import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const FEATURES = [
  { emoji: '🎬', text: 'Upload and share videos with the world' },
  { emoji: '🔔', text: 'Subscribe and never miss new content' },
  { emoji: '💬', text: 'Comment, like, and engage with creators' },
  { emoji: '📊', text: 'Creator analytics and channel dashboard' },
  { emoji: '🎯', text: 'Set goals and track your watch progress' },
];

const AuthLayout = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen auth-gradient flex">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[42%] flex-col justify-between p-12 relative overflow-hidden border-r border-white/5">
        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-500/6 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-blue-500/4 rounded-full blur-3xl pointer-events-none" />

        <Link to="/" className="flex items-center gap-0.5 select-none relative z-10">
          <span className="text-[#ff0000] font-black text-2xl tracking-tight">Stream</span>
          <span className="text-[#f0f0f0] font-black text-2xl tracking-tight">ora</span>
        </Link>

        <div className="flex flex-col gap-10 relative z-10">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl font-bold text-[#f0f0f0] leading-tight"
            >
              Your stage.<br />
              <span className="gradient-text">Your audience.</span><br />
              Your story.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-[#666] mt-4 text-sm leading-relaxed max-w-xs"
            >
              The platform built for creators who want to share their passion with the world — without limits.
            </motion.p>
          </div>

          <ul className="flex flex-col gap-3.5">
            {FEATURES.map(({ emoji, text }, i) => (
              <motion.li
                key={text}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.3 + i * 0.07 }}
                className="flex items-center gap-3.5 text-sm text-[#777]"
              >
                <span className="text-xl w-7 flex-shrink-0">{emoji}</span>
                <span>{text}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-[#333] relative z-10">© {new Date().getFullYear()} Streamora. All rights reserved.</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative">
        {/* Subtle ambient */}
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-red-500/3 rounded-full blur-3xl pointer-events-none" />

        {/* Mobile logo */}
        <Link to="/" className="flex items-center gap-0.5 mb-8 lg:hidden select-none">
          <span className="text-[#ff0000] font-black text-2xl tracking-tight">Stream</span>
          <span className="text-[#f0f0f0] font-black text-2xl tracking-tight">ora</span>
        </Link>

        <div className="w-full max-w-md relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="bg-[#0f0f0f] border border-white/7 rounded-3xl p-8 shadow-2xl"
              style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
