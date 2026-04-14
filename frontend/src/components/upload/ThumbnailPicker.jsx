import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus, X } from 'lucide-react';

const ThumbnailPicker = ({ preview, onSelect, onRemove, error }) => {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onSelect(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[#aaaaaa]">
        Thumbnail <span className="text-[#606060] font-normal">(optional · max 5 MB)</span>
      </label>

      {preview ? (
        <div className="relative w-48 aspect-video rounded-xl overflow-hidden group">
          <img src={preview} alt="Thumbnail preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <button
              type="button"
              onClick={onRemove}
              className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 rounded-full p-1.5 text-white hover:bg-red-600"
              aria-label="Remove thumbnail"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => inputRef.current?.click()}
          className="w-48 aspect-video rounded-xl border-2 border-dashed border-[#3f3f3f] hover:border-[#606060] flex flex-col items-center justify-center gap-2 transition-colors bg-[#1a1a1a] hover:bg-[#272727]"
          aria-label="Upload thumbnail"
        >
          <ImagePlus size={24} className="text-[#606060]" />
          <span className="text-xs text-[#606060]">Upload image</span>
        </motion.button>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
};

export default ThumbnailPicker;
