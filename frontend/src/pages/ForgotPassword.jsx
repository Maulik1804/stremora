import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import api from '../services/api';
import FormField from '../components/ui/FormField';
import Button from '../components/ui/Button';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.26, ease: 'easeOut' } },
};

const ForgotPassword = () => {
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }) => {
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmittedEmail(email);
      setSent(true);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      // 500 = server/email failure — show real error
      // 4xx validation errors — show message
      // Network error — show generic message
      if (!err.response) {
        setError('root', { message: 'Cannot connect to server. Check your connection.' });
      } else if (status >= 500) {
        setError('root', { message: msg || 'Email service unavailable. Please try again later.' });
      } else {
        // 400 validation — still show success to prevent enumeration
        setSubmittedEmail(email);
        setSent(true);
      }
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex flex-col items-center text-center gap-5"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.1 }}
          className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
        >
          <CheckCircle2 size={30} className="text-emerald-400" />
        </motion.div>

        <div>
          <h1 className="text-xl font-bold text-[#f0f0f0]">Check your inbox</h1>
          <p className="text-sm text-[#555] mt-2 leading-relaxed max-w-xs">
            If <span className="text-[#999]">{submittedEmail}</span> is registered, we've sent a password reset link. Check your spam folder too.
          </p>
        </div>

        <div className="w-full flex flex-col gap-2 mt-1">
          <Button
            variant="secondary"
            size="md"
            className="w-full rounded-2xl"
            onClick={() => setSent(false)}
          >
            Try a different email
          </Button>
          <Link to="/login" className="w-full">
            <Button variant="ghost" size="md" className="w-full rounded-2xl text-[#555] hover:text-[#e0e0e0]">
              <ArrowLeft size={15} />
              Back to sign in
            </Button>
          </Link>
        </div>

        <p className="text-xs text-[#444] mt-2">
          Didn't receive it? The link expires in 1 hour.
        </p>
      </motion.div>
    );
  }

  // ── Form state ────────────────────────────────────────────────────────────
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col">
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center mb-8">
        <motion.div
          whileHover={{ scale: 1.05, rotate: -5 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 mb-5"
        >
          <Mail size={24} className="text-[#3ea6ff]" />
        </motion.div>
        <h1 className="text-2xl font-bold text-[#f0f0f0]">Forgot password?</h1>
        <p className="text-sm text-[#555] mt-1.5 leading-relaxed">
          Enter your email and we'll send you a reset link
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
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            error={errors.email?.message}
            {...register('email')}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isSubmitting}
            className="w-full rounded-2xl h-12 text-base font-semibold"
          >
            <Send size={16} />
            Send reset link
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

export default ForgotPassword;
