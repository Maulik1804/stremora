import { useState, useEffect, useRef } from 'react';

/**
 * Feature 9: Audio Only Mode
 * Hides the video element visually and shows a waveform placeholder.
 * The <video> element keeps playing — only the visual track is hidden.
 */
export const useAudioMode = (videoRef) => {
  const [audioOnly, setAudioOnly] = useState(false);

  useEffect(() => {
    const el = videoRef?.current;
    if (!el) return;
    // Hide/show video track visually — audio continues uninterrupted
    el.style.visibility = audioOnly ? 'hidden' : 'visible';
  }, [audioOnly, videoRef]);

  const toggle = () => setAudioOnly((v) => !v);

  return { audioOnly, toggle };
};
