import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

import { registerSchema } from '../lib/validations/auth';
import { useAuth } from '../hooks/useAuth';
import FormField from '../components/ui/FormField';
import PasswordStrength from '../components/ui/PasswordStrength';
import Button from '../components/ui/Button';
import { toast } from '../components/ui/Toast';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.26, ease: 'easeOut' } },
};

const Register = () => {
  const { register: registerUser, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors, isSubmitting }, setError } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', username: '', email: '', password: '', confirmPassword: '' },
  });

  const passwordValue = watch('password');

  useEffect(() => { if (isAuthenticated) navigate('/', { replace: true }); }, [isAuthenticated, navigate]);
  useEffect(() => () => clearError(), []);

  const onSubmit = async (values) => {
    const { confirmPassword, ...payload } = values;
    const result = await registerUser(payload);
    if (result?.error) {
      setError('root', { message: result.payload || 'Registration failed' });
    } else {
      toast.success('Account created! Welcome to Streamora 🎉');
    }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center mb-7">
        <motion.div
          whileHover={{ scale: 1.05, rotate: -5 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-red-500/20 mb-5"
        >
          <Sparkles size={24} className="text-[#ff0000]" />
        </motion.div>
        <h1 className="text-2xl font-bold text-[#f0f0f0]">Create account</h1>
        <p className="text-sm text-[#555] mt-1.5">Join Streamora today — it's free</p>
      </motion.div>

      {/* Error */}
      {(errors.root || error) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="mb-5 p-4 bg-red-950/40 border border-red-800/40 rounded-2xl text-sm text-red-400 flex items-start gap-2.5"
        >
          <span className="mt-0.5 flex-shrink-0 text-base">⚠️</span>
          <span>{errors.root?.message || error}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <motion.div variants={itemVariants}>
          <FormField label="Display name" placeholder="Your name (optional)"
            autoComplete="name" error={errors.displayName?.message} {...register('displayName')} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <FormField label="Username" placeholder="e.g. john_doe"
            autoComplete="username" hint="Letters, numbers, and underscores only"
            error={errors.username?.message} {...register('username')} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <FormField label="Email address" type="email" placeholder="you@example.com"
            autoComplete="email" error={errors.email?.message} {...register('email')} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <FormField label="Password" type="password" placeholder="Min. 8 characters"
            autoComplete="new-password" error={errors.password?.message} {...register('password')} />
          <PasswordStrength password={passwordValue} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <FormField label="Confirm password" type="password" placeholder="Re-enter your password"
            autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Button type="submit" variant="primary" size="lg"
            loading={isLoading || isSubmitting} className="w-full rounded-2xl mt-1 h-12 text-base font-semibold">
            Create account
          </Button>
        </motion.div>

        <motion.p variants={itemVariants} className="text-xs text-[#444] text-center">
          By creating an account you agree to our{' '}
          <span className="text-[#666] hover:text-[#999] cursor-pointer transition-colors">Terms of Service</span> and{' '}
          <span className="text-[#666] hover:text-[#999] cursor-pointer transition-colors">Privacy Policy</span>.
        </motion.p>
      </form>

      <motion.p variants={itemVariants} className="mt-6 text-center text-sm text-[#555]">
        Already have an account?{' '}
        <Link to="/login" className="text-[#3ea6ff] hover:text-[#6bbfff] font-medium transition-colors">
          Sign in
        </Link>
      </motion.p>
    </motion.div>
  );
};

export default Register;
