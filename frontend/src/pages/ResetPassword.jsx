import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import FormField from '../components/ui/FormField';
import PasswordStrength from '../components/ui/PasswordStrength';
import Button from '../components/ui/Button';
import { toast } from '../components/ui/Toast';

const schema = z.object({
  newPassword: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Include at least one uppercase letter')
    .regex(/[0-9]/, 'Include at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.26, ease: 'easeOut' } },
};

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [done, setDone] = useState(false);
  const [tokenError, setTokenError] = useState(!token);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting }, setError } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const passwordValue = watch('newPassword');

  // Redirect to forgot-password if no token
  useEffect(() => {
    if (!token) setTokenError(true);
  }, [token]);

  const onSubmit = async ({ newPassword }) => {
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setDone(true);
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Reset failed. The link may have expired.';
      if (err.response?.status === 400) {
        setTokenError(true);
      } else {
        setError('root', { message: msg });
      }
    }
  };

  // ── No / invalid token ────────────────────────────────────────────────────
  if (tokenError) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center gap-5"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          className="w-16 h-16 rounded-2xl bg-red-950/30 border border-red-800/30 flex items-center justify-center"
        >
          <AlertTriangle size={28} className="text-red-400" />
        </motion.div>
        <div>
          <h1 className="text-xl font-bold text-[#f0f0f0]">Link expired or invalid</h1>
          <p className="text-sm text-[#555] mt-2 leading-relaxed max-w-xs">
            This password reset link is invalid or has expired. Reset links are only valid for 1 hour.
          </p>
        </div>
        <Link to="/forgot-password" className="w-full">
          <Button variant="primary" size="md" className="w-full rounded-2xl">
            Request a new link
          </Button>
        </Link>
        <Link to="/login" className="flex items-center gap-2 text-sm text-[#555] hover:text-[#e0e0e0] transition-colors">
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </motion.div>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center gap-5"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
        >
          <CheckCircle2 size={30} className="text-emerald-400" />
        </motion.div>
        <div>
          <h1 className="text-xl font-bold text-[#f0f0f0]">Password updated!</h1>
          <p className="text-sm text-[#555] mt-2">
            Your password has been reset. Redirecting you to sign in…
          </p>
        </div>
        <Link to="/login" className="w-full">
          <Button variant="primary" size="md" className="w-full rounded-2xl">
            Sign in now
          </Button>
        </Link>
      </motion.div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col">
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center mb-8">
        <motion.div
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 mb-5"
        >
          <KeyRound size={24} className="text-emerald-400" />
        </motion.div>
        <h1 className="text-2xl font-bold text-[#f0f0f0]">Set new password</h1>
        <p className="text-sm text-[#555] mt-1.5">
          Choose a strong password for your account
        </p>
      </motion.div>

      {/* Root error */}
      <AnimatePresence>
        {errors.root && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-5 p-4 bg-red-950/40 border border-red-800/40 rounded-2xl text-sm text-red-400 flex items-start gap-2.5"
          >
            <span className="text-base flex-shrink-0">⚠️</span>
            <span>{errors.root.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <motion.div variants={itemVariants}>
          <FormField
            label="New password"
            type="password"
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            autoFocus
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <PasswordStrength password={passwordValue} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <FormField
            label="Confirm new password"
            type="password"
            placeholder="Re-enter your password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isSubmitting}
            className="w-full rounded-2xl h-12 text-base font-semibold mt-1"
          >
            <KeyRound size={16} />
            Reset password
          </Button>
        </motion.div>
      </form>

      <motion.div variants={itemVariants} className="mt-6">
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 text-sm text-[#555] hover:text-[#e0e0e0] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </motion.div>
    </motion.div>
  );
};

export default ResetPassword;
