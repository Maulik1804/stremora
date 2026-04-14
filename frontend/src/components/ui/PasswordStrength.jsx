import { motion } from 'framer-motion';
import {
  getPasswordStrength,
  strengthLabel,
  strengthColor,
} from '../../lib/validations/auth';

const PasswordStrength = ({ password }) => {
  if (!password) return null;
  const score = getPasswordStrength(password);

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      {/* Bar segments */}
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div
            key={i}
            className="h-1 flex-1 rounded-full overflow-hidden bg-[#3f3f3f]"
          >
            <motion.div
              className={`h-full rounded-full ${i < score ? strengthColor[score] : ''}`}
              initial={{ width: 0 }}
              animate={{ width: i < score ? '100%' : '0%' }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
            />
          </motion.div>
        ))}
      </div>
      <p className={`text-xs ${score <= 1 ? 'text-red-400' : score === 2 ? 'text-yellow-400' : score === 3 ? 'text-blue-400' : 'text-green-400'}`}>
        {strengthLabel[score]}
      </p>
    </div>
  );
};

export default PasswordStrength;
