import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, Film, Search, CheckCircle2, CloudUpload,
  AlertTriangle, Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { engagementService } from '../../services/engagement.service';
import { videoService } from '../../services/video.service';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import { toast } from '../ui/Toast';
import { formatDistanceToNow } from '../../utils/date';

// ── Accepted file types ───────────────────────────────────────────────────────
const ACCEPTED_VIDEO_MIMES = new Set([
  'video/mp4', 'video/mpeg', 'video/quicktime', 'video/avi',
  'video/msvideo', 'video/x-msvideo', 'video/x-avi',
  'video/x-matroska', 'video/mkv', 'video/x-ms-wmv',
  'application/octet-stream',
]);
const ACCEPTED_VIDEO_EXTS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.mpeg', '.mpg']);
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

// ── Upload progress bar ───────────────────────────────────────────────────────
const ProgressBar = ({ progress, label }) => (
  <div className="w-full">
    <div className="flex justify-between text-xs text-[#aaa] mb-1.5">
      <span>{label}</span>
      <span>{progress}%</span>
    </div>
    <div className="h-1.5 bg-[#272727] rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-[#ff0000] rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
  </div>
);

// ── ProposeVideoModal ─────────────────────────────────────────────────────────
const ProposeVideoModal = ({ playlistId, playlistTitle, onClose }) => {
  const [tab, setTab] = useState('existing'); // 'existing' | 'upload'
  const [search, setSearch] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState(null);

  // Upload state
  const [videoFile, setVideoFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [uploadStep, setUploadStep] = useState('idle'); // idle | uploading | done | error
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadError, setUploadError] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const abortRef = useRef(null);

  const queryClient = useQueryClient();

  // My videos for "pick existing"
  const { data: myVideosData, isLoading: loadingVideos } = useQuery({
    queryKey: ['my-videos-for-collab'],
    queryFn: () => videoService.getMyVideos().then((r) => r.data.data.videos),
    enabled: tab === 'existing',
  });

  const myVideos = (myVideosData ?? []).filter(
    (v) => v.status === 'published' &&
      (search.trim() === '' || v.title.toLowerCase().includes(search.toLowerCase()))
  );

  // Propose mutation
  const proposeMutation = useMutation({
    mutationFn: (videoId) => engagementService.proposeCollabVideo(playlistId, videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-requests', playlistId] });
      toast.success('Video proposed! Waiting for owner approval.');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to propose video'),
  });

  // ── File validation ───────────────────────────────────────────────────────
  const validateVideo = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_VIDEO_MIMES.has(file.type) && !ACCEPTED_VIDEO_EXTS.has(ext)) {
      return `Unsupported type. Accepted: MP4, MOV, AVI, MKV`;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(0)} MB). Max 100 MB.`;
    }
    return null;
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0] || e.target.files?.[0];
    if (!file) return;
    const err = validateVideo(file);
    if (err) { setFileError(err); return; }
    setFileError(null);
    setVideoFile(file);
    if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^.]+$/, ''));
  };

  // ── Upload + propose ──────────────────────────────────────────────────────
  const handleUploadAndPropose = useCallback(async () => {
    if (!videoFile || !uploadTitle.trim()) return;
    setUploadStep('uploading');
    setUploadProgress(0);
    setUploadError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // 1. Get Cloudinary signature
      setUploadLabel('Getting upload credentials…');
      const sigRes = await videoService.getUploadSignature();
      const { signature, timestamp, folder, apiKey, cloudName } = sigRes.data.data;

      // 2. Upload to Cloudinary directly
      setUploadLabel('Uploading video…');
      const formData = new FormData();
      formData.append('file', videoFile);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', folder);
      formData.append('resource_type', 'video');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 88));
      };
      controller.signal.addEventListener('abort', () => xhr.abort());

      const cloudResult = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
          else {
            try { reject(new Error(JSON.parse(xhr.responseText).error?.message || 'Upload failed')); }
            catch { reject(new Error(`Upload failed (${xhr.status})`)); }
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.onabort = () => reject(new Error('Cancelled'));
        xhr.send(formData);
      });

      setUploadProgress(92);
      setUploadLabel('Saving video…');

      // 3. Save to backend
      const saveRes = await videoService.saveVideo({
        title: uploadTitle.trim(),
        description: uploadDesc.trim(),
        visibility: 'public',
        tags: '',
        cloudinaryPublicId: cloudResult.public_id,
        videoUrl: cloudResult.secure_url,
        thumbnailUrl: cloudResult.eager?.[0]?.secure_url || '',
        duration: cloudResult.duration || 0,
      });

      const savedVideo = saveRes.data.data.video;
      setUploadProgress(96);
      setUploadLabel('Proposing to playlist…');

      // 4. Propose the newly uploaded video
      await engagementService.proposeCollabVideo(playlistId, savedVideo._id);
      setUploadProgress(100);
      setUploadStep('done');

      queryClient.invalidateQueries({ queryKey: ['collab-requests', playlistId] });
      toast.success('Video uploaded and proposed! Waiting for owner approval.');
      setTimeout(onClose, 1200);

    } catch (err) {
      if (err.message === 'Cancelled') return;
      setUploadError(err.message || 'Upload failed');
      setUploadStep('error');
    }
  }, [videoFile, uploadTitle, uploadDesc, playlistId, queryClient, onClose]);

  const fileInputRef = useRef(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 12 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1a1a] border border-[#3f3f3f] rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a] flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-[#f1f1f1]">Propose a video</h3>
            <p className="text-xs text-[#606060] mt-0.5">
              for <span className="text-[#aaa]">"{playlistTitle}"</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#272727] text-[#aaa]">
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2a2a2a] flex-shrink-0">
          {[
            { id: 'existing', label: 'Pick existing video' },
            { id: 'upload',   label: 'Upload new video' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2
                ${tab === id
                  ? 'border-[#ff0000] text-[#f1f1f1]'
                  : 'border-transparent text-[#606060] hover:text-[#aaa]'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">

            {/* ── Tab: Pick existing ── */}
            {tab === 'existing' && (
              <motion.div
                key="existing"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex flex-col gap-3"
              >
                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search your videos…"
                    className="w-full bg-[#0f0f0f] border border-[#3f3f3f] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#f1f1f1] outline-none focus:border-[#606060] placeholder:text-[#555]"
                  />
                </div>

                {loadingVideos ? (
                  <div className="flex justify-center py-8"><Spinner size="sm" /></div>
                ) : myVideos.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <Film size={32} className="text-[#333]" />
                    <p className="text-sm text-[#555]">
                      {search ? 'No videos match your search' : 'You have no published videos yet'}
                    </p>
                    <button
                      onClick={() => setTab('upload')}
                      className="text-xs text-[#3ea6ff] hover:underline"
                    >
                      Upload a new video instead →
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {myVideos.map((video) => (
                      <button
                        key={video._id}
                        onClick={() => setSelectedVideoId(
                          selectedVideoId === video._id ? null : video._id
                        )}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                          ${selectedVideoId === video._id
                            ? 'border-[#ff0000]/50 bg-[#ff0000]/5'
                            : 'border-[#2a2a2a] bg-[#0f0f0f] hover:border-[#3f3f3f]'}`}
                      >
                        {/* Thumbnail */}
                        <div className="w-20 aspect-video rounded-lg overflow-hidden bg-[#272727] flex-shrink-0 relative">
                          {video.thumbnailUrl
                            ? <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                            : <Film size={16} className="absolute inset-0 m-auto text-[#444]" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#f1f1f1] truncate">{video.title}</p>
                          <p className="text-xs text-[#555] mt-0.5">{formatDistanceToNow(video.createdAt)}</p>
                        </div>
                        {selectedVideoId === video._id && (
                          <CheckCircle2 size={16} className="text-[#ff0000] flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Tab: Upload new ── */}
            {tab === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col gap-4"
              >
                {uploadStep === 'done' ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-green-900/20 border border-green-900/30 flex items-center justify-center">
                      <CheckCircle2 size={28} className="text-green-400" />
                    </div>
                    <p className="text-sm font-semibold text-[#f1f1f1]">Proposed successfully!</p>
                    <p className="text-xs text-[#555]">Waiting for the playlist owner to approve.</p>
                  </div>
                ) : uploadStep === 'uploading' ? (
                  <div className="flex flex-col gap-5 py-6">
                    <div className="flex items-center gap-3">
                      <Loader2 size={18} className="text-[#ff0000] animate-spin flex-shrink-0" />
                      <p className="text-sm text-[#f1f1f1]">{uploadLabel}</p>
                    </div>
                    <ProgressBar progress={uploadProgress} label="Uploading…" />
                  </div>
                ) : (
                  <>
                    {/* Drop zone */}
                    {!videoFile ? (
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleFileDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-[#3f3f3f] rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-[#606060] transition-colors"
                      >
                        <div className="w-12 h-12 rounded-xl bg-[#272727] flex items-center justify-center">
                          <CloudUpload size={22} className="text-[#aaa]" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-[#f1f1f1]">Drop video here or click to browse</p>
                          <p className="text-xs text-[#555] mt-1">MP4, MOV, AVI, MKV · Max 100 MB</p>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={handleFileDrop}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl">
                        <Film size={18} className="text-[#3ea6ff] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#f1f1f1] truncate">{videoFile.name}</p>
                          <p className="text-xs text-[#555]">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                        <button
                          onClick={() => { setVideoFile(null); setUploadTitle(''); }}
                          className="p-1 rounded-lg hover:bg-[#272727] text-[#555] hover:text-[#aaa]"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {fileError && (
                      <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-xl px-3 py-2">
                        <AlertTriangle size={13} />
                        {fileError}
                      </div>
                    )}

                    {/* Title */}
                    <div>
                      <label className="text-xs text-[#aaa] mb-1.5 block">Video title *</label>
                      <input
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="Enter a title for your video"
                        maxLength={100}
                        className="w-full bg-[#0f0f0f] border border-[#3f3f3f] rounded-xl px-4 py-2.5 text-sm text-[#f1f1f1] outline-none focus:border-[#606060] placeholder:text-[#555]"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-xs text-[#aaa] mb-1.5 block">Description (optional)</label>
                      <textarea
                        value={uploadDesc}
                        onChange={(e) => setUploadDesc(e.target.value)}
                        placeholder="Describe your video…"
                        rows={3}
                        maxLength={500}
                        className="w-full bg-[#0f0f0f] border border-[#3f3f3f] rounded-xl px-4 py-2.5 text-sm text-[#f1f1f1] outline-none focus:border-[#606060] placeholder:text-[#555] resize-none"
                      />
                    </div>

                    {uploadStep === 'error' && (
                      <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-xl px-3 py-2">
                        <AlertTriangle size={13} />
                        {uploadError}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {uploadStep !== 'done' && uploadStep !== 'uploading' && (
          <div className="p-5 border-t border-[#2a2a2a] flex gap-3 flex-shrink-0">
            <Button variant="secondary" size="md" onClick={onClose} className="flex-1">
              Cancel
            </Button>

            {tab === 'existing' ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => selectedVideoId && proposeMutation.mutate(selectedVideoId)}
                disabled={!selectedVideoId}
                loading={proposeMutation.isPending}
                className="flex-1"
              >
                Propose video
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleUploadAndPropose}
                disabled={!videoFile || !uploadTitle.trim()}
                className="flex-1"
              >
                <Upload size={14} />
                Upload &amp; propose
              </Button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ProposeVideoModal;
