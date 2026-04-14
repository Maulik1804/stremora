import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useUpload, UPLOAD_STEPS } from '../hooks/useUpload';
import DropZone from '../components/upload/DropZone';
import UploadForm from '../components/upload/UploadForm';
import UploadProgress from '../components/upload/UploadProgress';
import UploadSuccess from '../components/upload/UploadSuccess';
import UploadError from '../components/upload/UploadError';

// ── Step indicator ────────────────────────────────────────────────────────────
const STEP_LABELS = ['Select', 'Details', 'Upload', 'Done'];
const STEP_MAP = {
  [UPLOAD_STEPS.SELECT]: 0,
  [UPLOAD_STEPS.DETAILS]: 1,
  [UPLOAD_STEPS.UPLOADING]: 2,
  [UPLOAD_STEPS.SUCCESS]: 3,
  [UPLOAD_STEPS.ERROR]: 2,
};

const StepIndicator = ({ currentStep }) => {
  const active = STEP_MAP[currentStep] ?? 0;
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className={`flex items-center gap-2 ${i <= active ? 'text-[#f1f1f1]' : 'text-[#606060]'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
              ${i < active ? 'bg-green-600 text-white'
                : i === active ? 'bg-[#ff0000] text-white'
                : 'bg-[#272727] text-[#606060]'}`}
            >
              {i < active ? '✓' : i + 1}
            </div>
            <span className="text-sm font-medium hidden sm:block">{label}</span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div className={`flex-1 h-px w-8 transition-colors ${i < active ? 'bg-green-600' : 'bg-[#3f3f3f]'}`} />
          )}
        </div>
      ))}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const Upload = () => {
  const navigate = useNavigate();
  const {
    step, videoFile, thumbnailFile, thumbnailPreview, videoPreview,
    uploadProgress, uploadedVideo, error, fileError,
    selectVideo, selectThumbnail, removeThumbnail,
    upload, cancel, reset,
  } = useUpload();

  const handleFormSubmit = (values) => upload(values);
  const handleCancel = () => {
    reset();
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f1f1f1]">Upload video</h1>
        <p className="text-sm text-[#aaaaaa] mt-1">
          Share your content with the Streamora community
        </p>
      </div>

      {/* Step indicator — hide on error/success */}
      {step !== UPLOAD_STEPS.SUCCESS && step !== UPLOAD_STEPS.ERROR && (
        <StepIndicator currentStep={step} />
      )}

      {/* Card */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 md:p-8 min-h-[400px]">
        <AnimatePresence mode="wait">
          {/* ── SELECT ── */}
          {step === UPLOAD_STEPS.SELECT && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <DropZone onFileSelect={selectVideo} error={fileError} />
            </motion.div>
          )}

          {/* ── DETAILS ── */}
          {step === UPLOAD_STEPS.DETAILS && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <UploadForm
                videoFile={videoFile}
                thumbnailPreview={thumbnailPreview}
                onThumbnailSelect={selectThumbnail}
                onThumbnailRemove={removeThumbnail}
                thumbnailError={fileError}
                onSubmit={handleFormSubmit}
                onCancel={handleCancel}
                isUploading={false}
              />
            </motion.div>
          )}

          {/* ── UPLOADING ── */}
          {step === UPLOAD_STEPS.UPLOADING && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <UploadProgress
                progress={uploadProgress}
                fileName={videoFile?.name}
              />
            </motion.div>
          )}

          {/* ── SUCCESS ── */}
          {step === UPLOAD_STEPS.SUCCESS && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <UploadSuccess
                video={uploadedVideo}
                onUploadAnother={reset}
              />
            </motion.div>
          )}

          {/* ── ERROR ── */}
          {step === UPLOAD_STEPS.ERROR && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <UploadError
                message={error}
                onRetry={reset}
                onReset={reset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Upload;
