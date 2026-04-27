import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const, delay: i * 0.1 },
  }),
};

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, login } = useAuth();

  const [formData, setFormData] = useState({ username: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({ username: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validate = () => {
    const errors = { username: '', password: '' };
    if (!formData.username.trim()) {
      errors.username = 'Vui lòng nhập tên đăng nhập';
    }
    if (!formData.password) {
      errors.password = 'Vui lòng nhập mật khẩu';
    } else if (formData.password.length < 6) {
      errors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }
    return errors;
  };

  const handleChange = (field: 'username' | 'password', value: string) => {
    setFormData({ ...formData, [field]: value });
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: '' });
    }
    if (serverError) setServerError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    if (errors.username || errors.password) {
      setFieldErrors(errors);
      return;
    }
    setIsLoggingIn(true);
    setServerError('');
    try {
      await login(formData.username, formData.password);
      navigate('/dashboard');
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Tên đăng nhập hoặc mật khẩu không đúng');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-blue-900 px-4 overflow-hidden">
      {/* Gradient mesh background — same as LandingPage hero */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: '36px 36px',
          }}
        />
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-blue-500 opacity-20 blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-72 h-72 rounded-full bg-indigo-500 opacity-15 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-blue-700 opacity-25 blur-3xl" />
      </div>

      {/* Logo + branding */}
      <motion.div initial="hidden" animate="visible" className="relative z-10 flex flex-col items-center mb-8">
        <motion.div custom={0} variants={fadeUp} className="mb-5">
          <img
            src="/logo-trung-anh.png"
            alt="Trung Anh Group"
            className="h-16 w-auto max-w-[220px] rounded-xl shadow-xl object-contain"
          />
        </motion.div>
        <motion.p
          custom={1} variants={fadeUp}
          className="text-blue-300 text-base mt-1.5"
        >
          Hệ thống Quản lý Nhân sự
        </motion.p>
      </motion.div>

      {/* Card — glassmorphism */}
      <motion.div
        custom={2} variants={fadeUp} initial="hidden" animate="visible"
        className="relative z-10 w-full max-w-sm bg-white/[0.08] backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-8"
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-1.5">
              Tên đăng nhập
            </label>
            <input
              type="text"
              placeholder="Nhập tên đăng nhập"
              autoComplete="username"
              className={`block w-full px-3.5 py-2.5 bg-white/90 border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition ${
                fieldErrors.username
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-white/30 focus:ring-blue-400'
              }`}
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
            />
            {fieldErrors.username && (
              <p className="mt-1 text-xs text-red-300">{fieldErrors.username}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                className={`block w-full px-3.5 py-2.5 pr-10 bg-white/90 border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition ${
                  fieldErrors.password
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-white/30 focus:ring-blue-400'
                }`}
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword
                  ? <EyeSlashIcon className="h-4 w-4 text-blue-400" />
                  : <EyeIcon className="h-4 w-4 text-blue-400" />
                }
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-300">{fieldErrors.password}</p>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <div className="text-red-300 text-sm bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-60 text-white text-base font-bold rounded-xl transition-colors mt-1 shadow-lg shadow-blue-900/40"
          >
            {isLoggingIn ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </motion.div>

    </div>
  );
}
