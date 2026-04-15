import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { videoService } from '../services/video.service';
import FormField from '../components/ui/FormField';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import ImageCropper from '../components/ui/ImageCropper';
import { toast } from '../components/ui/Toast';
import { useAuth } from '../hooks/useAuth';

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

const EditVideo = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  // Fetch video
  const { data: video, isLoading, isError } = useQuery({
    queryKey: ['edit-video', id],
    queryFn: () => videoService.getById(id).then((r) => r.data.data.video),
  });

  // Reset form when video loads
  useEffect(() => {
    if (video) {
      setThumbnailPreview(video.thumbnailUrl);
      reset({
        title: video.title,
        description: video.description || '',
        tags: video.tags?.join(', ') || '',
        category: video.category || '',
        visibility: video.visibility || 'public',
      });
    }
  }, [video, reset]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // First update metadata
      await videoService.update(id, data);
      
      // Then upload thumbnail if selected
      if (selectedThumbnail) {
        const tfd = new FormData();
        tfd.append('thumbnail', selectedThumbnail);
        await videoService.uploadThumbnail(id, tfd);
      }
    },
    onSuccess: () => {
      toast.success('Video updated successfully');
      queryClient.invalidateQueries({ queryKey: ['edit-video', id] });
      queryClient.invalidateQueries({ queryKey: ['video', id] });
      queryClient.invalidateQueries({ queryKey: ['studio-videos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-videos'] });
      setTimeout(() => navigate(`/watch/${id}`), 1000);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to update video';
      toast.error(msg);
    },
  });

  const handleThumbnailSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validMimes.includes(file.type)) {
      toast.error('Invalid image type. Accepted: JPEG, PNG, WebP, GIF');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image exceeds 5 MB limit');
      return;
    }

    // Show cropper
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageToCrop(e.target.result);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedBlob) => {
    setShowCropper(false);
    setImageToCrop(null);
    setSelectedThumbnail(croppedBlob);
    setThumbnailPreview(URL.createObjectURL(croppedBlob));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveThumbnail = () => {
    setSelectedThumbnail(null);
    if (thumbnailPreview && !video?.thumbnailUrl) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailPreview(video?.thumbnailUrl || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = (values) => {
    const parsedTags = values.tags
      ? values.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 15)
      : [];

    updateMutation.mutate({
      title: values.title,
      description: values.description || '',
      visibility: values.visibility,
      tags: parsedTags,
      category: values.category || '',
    });
  };

  const titleValue = watch('title') ?? '';
  const descValue = watch('description') ?? '';

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-[#f1f1f1] font-medium">Video not found</p>
        <Link to="/studio" className="text-[#3ea6ff] text-sm hover:underline">
          Back to Studio
        </Link>
      </div>
    );
  }

  // Check if user is the owner
  if (video.owner?._id !== user?._id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-[#f1f1f1] font-medium">You don't have permission to edit this video</p>
        <Link to="/studio" className="text-[#3ea6ff] text-sm hover:underline">
          Back to Studio
        </Link>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showCropper && imageToCrop && (
          <ImageCropper
            imageSrc={imageToCrop}
            aspect={16 / 9}
            title="Adjust Thumbnail"
            onCropComplete={handleCropComplete}
            onCancel={() => {
              setShowCropper(false);
              setImageToCrop(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
          />
        )}
      </AnimatePresence>

      <div className="px-4 py-6 max-w-4xl mx-auto">
        {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/studio">
          <button className="p-2 rounded-lg hover:bg-[#272727] text-[#aaaaaa] hover:text-[#f1f1f1] transition-colors">
            <ArrowLeft size={20} />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#f1f1f1]">Edit video</h1>
          <p className="text-sm text-[#aaaaaa] mt-0.5">{video.title}</p>
        </div>
      </div>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col lg:flex-row gap-8"
      >
        {/* Left — form fields */}
        <div className="flex-1 flex flex-col gap-5">
          {/* Thumbnail picker */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#aaaaaa]">Thumbnail</label>
            <div className="relative bg-[#1a1a1a] border border-[#3f3f3f] rounded-xl overflow-hidden group cursor-pointer hover:border-[#606060] transition-colors">
              {thumbnailPreview ? (
                <>
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail"
                    className="w-full aspect-video object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#ff0000] hover:bg-[#ff0000]/80 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <Upload size={13} />
                      Change
                    </button>
                    {selectedThumbnail && (
                      <button
                        type="button"
                        onClick={handleRemoveThumbnail}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#272727] hover:bg-[#3f3f3f] text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <X size={13} />
                        Remove
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-video flex flex-col items-center justify-center gap-2 bg-[#0f0f0f]"
                >
                  <Upload size={24} className="text-[#606060]" />
                  <p className="text-xs text-[#aaaaaa]">Click to upload thumbnail</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleThumbnailSelect}
                className="hidden"
              />
            </div>
            <p className="text-xs text-[#606060]">JPEG, PNG, WebP, GIF · Max 5 MB</p>
          </div>

          {/* Title */}
          <div>
            <FormField
              label="Title *"
              placeholder="Add a title that describes your video"
              error={errors.title?.message}
              hint={`${titleValue.length}/100`}
              {...register('title')}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
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
          </div>

          {/* Tags */}
          <div>
            <FormField
              label="Tags"
              placeholder="gaming, tutorial, react (comma-separated)"
              hint="Up to 15 tags · max 30 chars each"
              error={errors.tags?.message}
              {...register('tags')}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
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
          </div>

          {/* Visibility */}
          <div className="flex flex-col gap-2">
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
          </div>
        </div>

        {/* Right — submit button */}
        <div className="lg:w-64 flex flex-col gap-3">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={updateMutation.isPending}
            className="w-full rounded-xl"
          >
            <Save size={16} />
            Save changes
          </Button>
          <Link to="/studio">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full rounded-xl"
            >
              Cancel
            </Button>
          </Link>
        </div>
      </motion.form>
      </div>
    </>
  );
};

export default EditVideo;
