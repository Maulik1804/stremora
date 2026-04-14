import { forwardRef } from 'react';

const Input = forwardRef(({ label, error, className = '', ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && (
      <label className="text-sm text-[#aaaaaa]">{label}</label>
    )}
    <input
      ref={ref}
      className={`
        w-full bg-[#1a1a1a] border rounded-lg px-3 py-2 text-[#f1f1f1] text-sm
        placeholder:text-[#606060] transition-colors
        ${error ? 'border-red-500 focus:border-red-500' : 'border-[#3f3f3f] focus:border-[#aaaaaa]'}
        outline-none ${className}
      `}
      {...props}
    />
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
));

Input.displayName = 'Input';
export default Input;
