import { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

const FormField = forwardRef(({ label, error, type = 'text', className = '', hint, ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-[#888]">{label}</label>
      )}

      <div className="relative">
        <input
          ref={ref}
          type={inputType}
          className={`
            w-full bg-[#111] border rounded-xl px-4 py-3 text-sm text-[#f0f0f0]
            placeholder:text-[#444] transition-all duration-200 outline-none
            ${isPassword ? 'pr-11' : ''}
            ${error
              ? 'border-red-500/60 focus:border-red-400/80 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.08)]'
              : 'border-white/8 focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)]'}
            ${className}
          `}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] hover:text-[#888] transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>

      {hint && !error && (
        <p className="text-xs text-[#444]">{hint}</p>
      )}

      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            key={error}
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.15 }}
            className="text-xs text-red-400 overflow-hidden"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

FormField.displayName = 'FormField';
export default FormField;
