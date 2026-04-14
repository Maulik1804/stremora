import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Link2, ExternalLink } from 'lucide-react';

const ShareModal = ({ videoId, title, onClose }) => {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/watch/${videoId}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the input
    }
  };

  const shareLinks = [
    {
      label: 'Twitter / X',
      icon: ExternalLink,
      color: 'hover:bg-[#1da1f2]/20 hover:text-[#1da1f2]',
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    {
      label: 'Facebook',
      icon: ExternalLink,
      color: 'hover:bg-[#1877f2]/20 hover:text-[#1877f2]',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 12 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#1a1a1a] border border-[#3f3f3f] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-[#f1f1f1]">Share</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[#272727] text-[#aaaaaa] hover:text-[#f1f1f1] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Social share buttons */}
          <div className="flex gap-3 mb-5">
            {shareLinks.map(({ label, icon: Icon, color, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col items-center gap-1.5 flex-1 py-3 rounded-xl bg-[#272727] text-[#aaaaaa] transition-colors ${color}`}
              >
                <Icon size={20} />
                <span className="text-xs">{label}</span>
              </a>
            ))}
            <button
              onClick={copy}
              className="flex flex-col items-center gap-1.5 flex-1 py-3 rounded-xl bg-[#272727] text-[#aaaaaa] hover:bg-[#3f3f3f] hover:text-[#f1f1f1] transition-colors"
            >
              <Link2 size={20} />
              <span className="text-xs">Copy link</span>
            </button>
          </div>

          {/* URL bar */}
          <div className="flex items-center gap-2 bg-[#0f0f0f] border border-[#3f3f3f] rounded-xl px-3 py-2.5">
            <span className="text-xs text-[#aaaaaa] flex-1 truncate">{url}</span>
            <button
              onClick={copy}
              className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors flex-shrink-0
                ${copied ? 'bg-green-900/40 text-green-400' : 'bg-[#272727] text-[#f1f1f1] hover:bg-[#3f3f3f]'}`}
            >
              {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ShareModal;
