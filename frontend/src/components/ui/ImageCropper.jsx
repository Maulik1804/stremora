import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Cropper from 'react-easy-crop';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import Button from './Button';

/**
 * Image Cropper Modal
 * Allows users to crop/adjust images before upload
 * 
 * Props:
 * - imageSrc: URL of image to crop
 * - aspect: Aspect ratio (e.g., 16/9 for video, 1/1 for profile)
 * - onCropComplete: Callback with cropped image blob
 * - onCancel: Callback when user cancels
 * - title: Modal title
 */
const ImageCropper = ({ imageSrc, aspect = 16 / 9, onCropComplete, onCancel, title = 'Adjust Image' }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);

    try {
      // Create canvas and crop image
      const image = new Image();
      image.src = imageSrc;

      await new Promise((resolve) => {
        image.onload = resolve;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        onCropComplete(blob);
        setIsProcessing(false);
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error('Crop error:', err);
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1a1a] border border-[#3f3f3f] rounded-2xl overflow-hidden w-full max-w-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3f3f3f]">
          <h3 className="text-lg font-semibold text-[#f1f1f1]">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-[#272727] text-[#aaaaaa] hover:text-[#f1f1f1] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cropper */}
        <div className="relative w-full bg-black" style={{ height: '400px' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape="rect"
            showGrid={true}
            onCropChange={setCrop}
            onCropComplete={handleCropComplete}
            onZoomChange={setZoom}
            restrictPosition={true}
          />
        </div>

        {/* Controls */}
        <div className="px-6 py-4 border-t border-[#3f3f3f] bg-[#0f0f0f]">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setZoom(Math.max(1, zoom - 0.1))}
              className="p-2 rounded-lg hover:bg-[#272727] text-[#aaaaaa] hover:text-[#f1f1f1] transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={18} />
            </button>

            <div className="flex-1">
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1 bg-[#272727] rounded-lg appearance-none cursor-pointer accent-[#ff0000]"
              />
            </div>

            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              className="p-2 rounded-lg hover:bg-[#272727] text-[#aaaaaa] hover:text-[#f1f1f1] transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={18} />
            </button>

            <span className="text-xs text-[#aaaaaa] min-w-[40px] text-center">
              {(zoom * 100).toFixed(0)}%
            </span>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              loading={isProcessing}
              className="flex-1"
            >
              Save & Continue
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ImageCropper;
