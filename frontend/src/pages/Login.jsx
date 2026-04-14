import { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

import { loginSchema } from '../lib/validations/auth';
import { useAuth } from '../hooks/useAuth';
import FormField from '../components/ui/FormField';
import Button from '../components/ui/Button';
import { toast } from '../components/ui/Toast';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
};

const Login = () => {
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => { if (isAuthenticated) navigate(from, { replace: true }); }, [isAuthenticated, navigate, from]);
  useEffect(() => () => clearError(), []);

  const onSubmit = async (values) => {
    const result = await login(values);
    if (result?.error) {
      setError('root', { message: result.payload || 'Login failed' });
    } else {
      toast.success('Welcome back!');
    }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col">
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center mb-8">
        <motion.div
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 mb-5"
        >
          <Zap size={24} className="text-[#ff0000]" />
        </motion.div>
        <h1 className="text-2xl font-bold text-[#f0f0f0]">Welcome back</h1>
        <p className="text-sm text-[#555] mt-1.5">Sign in to your Streamora account</p>
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
          <FormField label="Email address" type="email" placeholder="you@example.com"
            autoComplete="email" error={errors.email?.message} {...register('email')} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <FormField label="Password" type="password" placeholder="••••••••"
            autoComplete="current-password" error={errors.password?.message} {...register('password')} />
        </motion.div>

        <motion.div variants={itemVariants} className="flex justify-end -mt-1">
          <Link to="/forgot-password" className="text-xs text-[#3ea6ff] hover:text-[#6bbfff] transition-colors">
            Forgot password?
          </Link>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Button type="submit" variant="primary" size="lg"
            loading={isLoading || isSubmitting} className="w-full rounded-2xl mt-1 h-12 text-base font-semibold">
            Sign in
          </Button>
        </motion.div>
      </form>

      <motion.div variants={itemVariants} className="mt-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-white/6" />
        <span className="text-xs text-[#444]">or</span>
        <div className="flex-1 h-px bg-white/6" />
      </motion.div>

      <motion.p variants={itemVariants} className="mt-5 text-center text-sm text-[#555]">
        Don't have an account?{' '}
        <Link to="/register" className="text-[#3ea6ff] hover:text-[#6bbfff] font-medium transition-colors">
          Create one free
        </Link>
      </motion.p>
    </motion.div>
  );
};

export default Login;
