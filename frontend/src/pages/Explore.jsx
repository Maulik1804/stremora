import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, Sparkles } from 'lucide-react';

const CATEGORIES = [
  { slug: 'music',         label: 'Music',        emoji: '🎵', color: '#7c3aed', glow: 'rgba(124,58,237,0.3)' },
  { slug: 'gaming',        label: 'Gaming',       emoji: '🎮', color: '#16a34a', glow: 'rgba(22,163,74,0.3)' },
  { slug: 'news',          label: 'News',         emoji: '📰', color: '#2563eb', glow: 'rgba(37,99,235,0.3)' },
  { slug: 'sports',        label: 'Sports',       emoji: '⚽', color: '#ea580c', glow: 'rgba(234,88,12,0.3)' },
  { slug: 'education',     label: 'Education',    emoji: '📚', color: '#ca8a04', glow: 'rgba(202,138,4,0.3)' },
  { slug: 'entertainment', label: 'Entertainment',emoji: '🎬', color: '#db2777', glow: 'rgba(219,39,119,0.3)' },
  { slug: 'technology',    label: 'Technology',   emoji: '💻', color: '#0891b2', glow: 'rgba(8,145,178,0.3)' },
  { slug: 'travel',        label: 'Travel',       emoji: '✈️', color: '#0d9488', glow: 'rgba(13,148,136,0.3)' },
  { slug: 'food',          label: 'Food',         emoji: '🍕', color: '#e50914', glow: 'rgba(229,9,20,0.3)' },
  { slug: 'fashion',       label: 'Fashion',      emoji: '👗', color: '#be185d', glow: 'rgba(190,24,93,0.3)' },
  { slug: 'comedy',        label: 'Comedy',       emoji: '😂', color: '#d97706', glow: 'rgba(217,119,6,0.3)' },
  { slug: 'science',       label: 'Science',      emoji: '🔬', color: '#4f46e5', glow: 'rgba(79,70,229,0.3)' },
];

const Explore = () => (
  <div className="min-h-screen px-4 md:px-8 py-8 max-w-screen-2xl mx-auto">
    {/* Header */}
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 mb-10"
    >
      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
        <Compass size={22} className="text-[#e8e8e8]" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-[#e8e8e8]">Explore</h1>
        <p className="text-sm text-[#555]">Discover content across every category</p>
      </div>
    </motion.div>

    {/* Featured banner */}
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative rounded-3xl overflow-hidden mb-10 p-8 md:p-12"
      style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #0d1a3a 50%, #0a1a0d 100%)' }}
    >
      <div className="absolute inset-0 opacity-30"
        style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(124,58,237,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(37,99,235,0.3) 0%, transparent 50%)' }} />
      <div className="relative z-10 flex items-center gap-4">
        <Sparkles size={32} className="text-[#a855f7]" />
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Find your next obsession</h2>
          <p className="text-sm text-white/50 mt-1">Browse thousands of videos across every genre</p>
        </div>
      </div>
    </motion.div>

    {/* Category grid */}
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {CATEGORIES.map(({ slug, label, emoji, color, glow }, i) => (
        <motion.div
          key={slug}
          initial={{ opacity: 0, scale: 0.88, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.25, type: 'spring', stiffness: 200, damping: 20 }}
        >
          <Link to={`/category/${slug}`} className="cat-card block aspect-square">
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-3 p-4"
              style={{
                background: `radial-gradient(ellipse at 50% 30%, ${color}33 0%, ${color}11 60%, #111 100%)`,
                border: `1px solid ${color}22`,
              }}
            >
              <motion.span
                className="text-4xl"
                whileHover={{ scale: 1.2, rotate: [0, -8, 8, 0] }}
                transition={{ duration: 0.4 }}
              >
                {emoji}
              </motion.span>
              <span className="text-sm font-semibold text-white/90 text-center leading-tight">{label}</span>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  </div>
);

export default Explore;
