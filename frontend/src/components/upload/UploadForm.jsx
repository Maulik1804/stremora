import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Film, X } from 'lucide-react';
import FormField from '../ui/FormField';
import Button from '../ui/Button';
import ThumbnailPicker from './ThumbnailPicker';
import { formatDuration } from '../../utils/format';

const CATEGORIES = [
  'Entertainment', 'Music', 'Gaming', 'News', 'Sports',
  'Education', 'Science & Tech', 'Travel', 'Food', 'Fashion',
  'Comedy', 'Film & Animation', 'Howto & Style', 'Pets & Animals', 'Other',
];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', desc: 'Anyone can watch' },
  { value: 'unlisted', label: 'Unlisted', desc: 'Only people with the link' },
  { value: 'private', label: 'Private', desc: 'Only you' },
];

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Max 100 characters'),
  description: z.string().max(5000, 'Max 5000 characters').optional(),
  tags: z.string().optional(),
  category: z.string().optional(),
  visibility: z.enum(['public', 'unlisted', 'private']),
});

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const UploadForm = ({
  videoFile,
  thumbnailPreview,
  onThumbnailSelect,
  onThumbnailRemove,
  thumbnailError,
  onSubmit,
  onCancel,
  isUploading,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: videoFile?.name?.replace(/\.[^.]+$/, '') ?? '',
      description: '',
      tags: '',
      category: '',
      visibility: 'public',
    },
  });

  const titleValue = watch('title') ?? '';
  const descValue = watch('description') ?? '';

  return (
    <motion.form
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col lg:flex-row gap-8"
    >
      {/* ── Left — form fields ── */}
      <div className="flex-1 flex flex-col gap-5">
        {/* Selected file info */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-3 bg-[#1a1a1a] border border-[#3f3f3f] rounded-xl px-4 py-3"
        >
          <div className="w-10 h-10 rounded-lg bg-[#272727] flex items-center justify-center flex-shrink-0">
            <Film size={18} className="text-[#aaaaaa]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f1f1f1] truncate">{videoFile?.name}</p>
            <p className="text-xs text-[#aaaaaa]">
              {videoFile ? `${(videoFile.size / 1024 / 1024).toFixed(1)} MB` : ''}
              {videoFile && videoFile.size > 80 * 1024 * 1024 && (
                <span className="text-yellow-400 ml-2">⚠ Large file — may take a while</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-[#606060] hover:text-[#f1f1f1] transition-colors flex-shrink-0"
            aria-label="Remove file"
          >
            <X size={18} />
          </button>
        </motion.div>

        {/* Title */}
        <motion.div variants={itemVariants}>
          <FormField
            label="Title *"
            placeholder="Add a title that describes your video"
            error={errors.title?.message}
            hint={`${titleValue.length}/100`}
            {...register('title')}
          />
        </motion.div>

        {/* Description */}
        <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#aaaaaa]">
            Description
            <span className="text-[#606060] font-normal ml-1">(optional)</span>
          </label>
          <textarea
            rows={5}
            placeholder="Tell viewers about your video…"
            className="w-full bg-[#121212] border border-[#3f3f3f] rounded-xl px-4 py-3 text-sm text-[#f1f1f1] placeholder:text-[#606060] outline-none resize-none focus:border-[#606060] focus:ring-1 focus:ring-white/10 transition-all"
            {...register('description')}
          />
          <p className="text-xs text-[#606060] text-right">{descValue.length}/5000</p>
          {errors.description && (
            <p className="text-xs text-red-400">{errors.description.message}</p>
          )}
        </motion.div>

        {/* Tags */}
        <motion.div variants={itemVariants}>
          <FormField
            label="Tags"
            placeholder="gaming, tutorial, react (comma-separated)"
            hint="Up to 15 tags · max 30 chars each"
            error={errors.tags?.message}
            {...register('tags')}
          />
        </motion.div>

        {/* Category */}
        <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#aaaaaa]">Category</label>
          <select
            className="w-full bg-[#121212] border border-[#3f3f3f] rounded-xl px-4 py-3 text-sm text-[#f1f1f1] outline-none focus:border-[#606060] transition-colors appearance-none cursor-pointer"
            {...register('category')}
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </motion.div>

        {/* Visibility */}
        <motion.div variants={itemVariants} className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#aaaaaa]">Visibility</label>
          <div className="flex flex-col gap-2">
            {VISIBILITY_OPTIONS.map(({ value, label, desc }) => (
              <label
                key={value}
                className="flex items-center gap-3 bg-[#1a1a1a] border border-[#3f3f3f] rounded-xl px-4 py-3 cursor-pointer hover:border-[#606060] transition-colors has-[:checked]:border-[#ff0000] has-[:checked]:bg-[#ff0000]/5"
              >
                <input
                  type="radio"
                  value={value}
                  className="accent-[#ff0000]"
                  {...register('visibility')}
                />
                <div>
                  <p className="text-sm font-medium text-[#f1f1f1]">{label}</p>
                  <p className="text-xs text-[#aaaaaa]">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Right — thumbnail + submit ── */}
      <div className="lg:w-64 flex flex-col gap-6">
        <motion.div variants={itemVariants}>
          <ThumbnailPicker
            preview={thumbnailPreview}
            onSelect={onThumbnailSelect}
            onRemove={onThumbnailRemove}
            error={thumbnailError}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col gap-3 mt-auto">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isUploading}
            className="w-full rounded-xl"
          >
            Upload video
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onCancel}
            className="w-full rounded-xl"
          >
            Cancel
          </Button>
        </motion.div>
      </div>
    </motion.form>
  );
};

export default UploadForm;
