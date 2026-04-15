import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Film, Globe, Lock } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { engagementService } from '../../services/engagement.service';
import Button from '../ui/Button';
import { toast } from '../ui/Toast';

const CreateSeriesModal = ({ onClose, onCreated }) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');

  const mutation = useMutation({
    mutationFn: () =>
      engagementService.createSeries({
        title: title.trim(),
        description: description.trim(),
        visibility,
      }),
    onSuccess: (res) => {
      const playlist = res.data.data.playlist;
      queryClient.invalidateQueries({ queryKey: ['my-series'] });
      toast.success('Playlist created!');
      onCreated?.(playlist);
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create playlist');
    },
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 16 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#141414] border border-[#2a2a2a] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#ff0000]/15 flex items-center justify-center">
                <Film size={16} className="text-[#ff0000]" />
              </div>
              <h3 className="text-base font-semibold text-[#f1f1f1]">Create Channel Playlist</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#1f1f1f] text-[#555] hover:text-[#aaa] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#aaa] uppercase tracking-wide">Playlist Title *</label>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && title.trim() && mutation.mutate()}
                placeholder="e.g. Kota Factory Season 1"
                maxLength={150}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm
                           text-[#f1f1f1] placeholder:text-[#444] outline-none
                           focus:border-[#3f3f3f] focus:ring-1 focus:ring-white/8 transition-all"
              />
              <p className="text-xs text-[#444] text-right">{title.length}/150</p>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#aaa] uppercase tracking-wide">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this playlist about?"
                rows={3}
                maxLength={500}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm
                           text-[#f1f1f1] placeholder:text-[#444] outline-none resize-none
                           focus:border-[#3f3f3f] focus:ring-1 focus:ring-white/8 transition-all"
              />
              <p className="text-xs text-[#444] text-right">{description.length}/500</p>
            </div>

            {/* Visibility */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-[#aaa] uppercase tracking-wide">Visibility</label>
              <div className="flex gap-2">
                {[
                  { value: 'public',  label: 'Public',  icon: Globe, desc: 'Shown on your channel' },
                  { value: 'private', label: 'Private', icon: Lock,  desc: 'Only you can see' },
                ].map(({ value, label, icon: Icon, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setVisibility(value)}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-medium transition-all duration-150
                      ${visibility === value
                        ? 'border-[#f1f1f1] bg-[#1f1f1f] text-[#f1f1f1]'
                        : 'border-[#2a2a2a] text-[#555] hover:border-[#3a3a3a] hover:text-[#aaa]'}`}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                    <span className="text-[10px] font-normal opacity-60">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 flex gap-3">
            <Button variant="secondary" size="md" onClick={onClose} className="flex-1 rounded-xl">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => title.trim() && mutation.mutate()}
              disabled={!title.trim()}
              loading={mutation.isPending}
              className="flex-1 rounded-xl"
            >
              Create Playlist
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateSeriesModal;
