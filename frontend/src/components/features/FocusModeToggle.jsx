import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Focus, Minimize2 } from 'lucide-react';
import { toggleFocusMode, selectFocusMode } from '../../store/slices/focusSlice';

const FocusModeToggle = ({ className = '' }) => {
  const dispatch = useDispatch();
  const enabled = useSelector(selectFocusMode);

  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={() => dispatch(toggleFocusMode())}
      title={enabled ? 'Exit Focus Mode' : 'Enter Focus Mode'}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200
        ${enabled
          ? 'bg-[#3ea6ff]/20 text-[#3ea6ff] border border-[#3ea6ff]/40'
          : 'bg-[#272727] text-[#f1f1f1] hover:bg-[#3f3f3f] border border-transparent'}
        ${className}`}
    >
      {enabled ? <Minimize2 size={14} /> : <Focus size={14} />}
      {enabled ? 'Exit Focus' : 'Focus Mode'}
    </motion.button>
  );
};

export default FocusModeToggle;
