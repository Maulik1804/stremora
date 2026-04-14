import { motion } from 'framer-motion';

const variants = {
  primary:   'bg-[#ff0000] hover:bg-[#e00000] active:bg-[#cc0000] text-white font-semibold shadow-sm hover:shadow-[0_0_20px_rgba(255,0,0,0.3)]',
  secondary: 'bg-[#1a1a1a] hover:bg-[#222] active:bg-[#2c2c2c] text-[#e8e8e8] border border-white/7 hover:border-white/14',
  ghost:     'bg-transparent hover:bg-white/5 active:bg-white/8 text-[#e8e8e8]',
  outline:   'border border-white/10 hover:border-white/22 hover:bg-white/4 text-[#e8e8e8]',
  danger:    'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-sm hover:shadow-[0_0_16px_rgba(239,68,68,0.3)]',
  success:   'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm',
};

const sizes = {
  xs:   'px-2.5 py-1 text-xs',
  sm:   'px-3.5 py-1.5 text-sm',
  md:   'px-4 py-2 text-sm',
  lg:   'px-6 py-2.5 text-base',
  xl:   'px-8 py-3 text-base',
  icon: 'p-2',
};

const Button = ({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  ...props
}) => (
  <motion.button
    whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
    whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
    disabled={disabled || loading}
    className={`
      inline-flex items-center justify-center gap-2 rounded-full font-medium
      transition-all duration-200 cursor-pointer select-none
      disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
      ${variants[variant]} ${sizes[size]} ${className}
    `}
    {...props}
  >
    {loading ? (
      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
    ) : children}
  </motion.button>
);

export default Button;
