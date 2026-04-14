import { useState } from 'react';

const GRADIENT_COLORS = [
  'from-red-500 to-orange-500',
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-green-500 to-teal-500',
  'from-yellow-500 to-orange-500',
  'from-indigo-500 to-purple-500',
];

const getGradient = (name = '') => {
  const idx = name.charCodeAt(0) % GRADIENT_COLORS.length;
  return GRADIENT_COLORS[idx];
};

const SIZES = {
  xs:  'w-6 h-6 text-[10px]',
  sm:  'w-8 h-8 text-xs',
  md:  'w-10 h-10 text-sm',
  lg:  'w-12 h-12 text-base',
  xl:  'w-16 h-16 text-lg',
  '2xl': 'w-20 h-20 text-xl',
};

const Avatar = ({ src, alt = '', size = 'md', className = '', onClick }) => {
  const [imgError, setImgError] = useState(false);
  const sizeClass = SIZES[size] ?? SIZES.md;
  const initials = alt.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const gradient = getGradient(alt);

  const base = `rounded-full flex-shrink-0 overflow-hidden ${sizeClass} ${className} ${onClick ? 'cursor-pointer' : ''}`;

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setImgError(true)}
        onClick={onClick}
        className={`${base} object-cover ring-1 ring-white/10`}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      aria-label={alt}
      className={`${base} bg-gradient-to-br ${gradient} flex items-center justify-center font-semibold text-white ring-1 ring-white/10`}
    >
      {initials}
    </div>
  );
};

export default Avatar;
