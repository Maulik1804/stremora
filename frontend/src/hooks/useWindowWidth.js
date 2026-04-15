import { useState, useEffect } from 'react';

/**
 * Returns the current window inner width, updated reactively on resize.
 * Prevents layout bugs that occur when reading window.innerWidth at render time.
 */
export const useWindowWidth = () => {
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return width;
};
