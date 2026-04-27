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
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#0F172A] px-4 overflow-hidden">
      {/* ── BACKGROUND ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: '36px 36px',
          }}
        />
        {/* Blurred background blobs - Ruby Theme */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-ruby-primary opacity-[0.15] blur-[120px]" />
        <div className="absolute top-1/2 right-1/3 w-72 h-72 rounded-full bg-ruby-accent opacity-[0.1] blur-[100px]" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-ruby-primary opacity-[0.12] blur-[120px]" />
      </div>

      {/* ── LOGO + BRANDING ── */}
      <motion.div initial="hidden" animate="visible" className="relative z-10 flex flex-col items-center mb-10">
        <motion.div custom={0} variants={fadeUp} className="mb-6">
          <img 
            src="/logo-alan.png" 
            alt="ALAN Beauty Medical Clinic" 
            className="h-24 w-auto max-w-[280px] rounded-xl shadow-2xl shadow-black/40 object-contain mix-blend-multiply" 
          />
        </motion.div>
        <motion.div custom={1} variants={fadeUp} className="text-center">

          <p className="text-ruby-accent text-sm font-medium mt-1 opacity-80">
      Hệ thống Quản lý Nhân sự
          </p>
        </motion.div>
      </motion.div>

      {/* ── LOGIN CARD ── */}
      <motion.div
        custom={2} variants={fadeUp} initial="hidden" animate="visible"
        className="relative z-10 w-full max-w-sm bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl p-10"
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Username */}
          <div>
             <label className="block text-sm font-semibold text-gray-400 mb-2 px-1">
              Tên đăng nhập
            </label>
            <input
              type="text"
              placeholder="Nhập tên đăng nhập"
              autoComplete="username"
              className={`block w-full px-4 py-3 bg-white/5 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ruby-primary/50 focus:border-ruby-primary/50 transition-all duration-300 ${
                fieldErrors.username
                  ? 'border-red-500/50 bg-red-500/5'
                  : 'border-white/10 hover:border-white/20'
              }`}
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
            />
            {fieldErrors.username && (
              <p className="mt-1.5 text-xs text-red-400 px-1">{fieldErrors.username}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2 px-1">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                className={`block w-full px-4 py-3 pr-11 bg-white/5 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ruby-primary/50 focus:border-ruby-primary/50 transition-all duration-300 ${
                  fieldErrors.password
                    ? 'border-red-500/50 bg-red-500/5'
                    : 'border-white/10 hover:border-white/20'
                }`}
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-ruby-primary transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword
                  ? <EyeSlashIcon className="h-5 w-5" />
                  : <EyeIcon className="h-5 w-5" />
                }
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1.5 text-xs text-red-400 px-1">{fieldErrors.password}</p>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
            >
              {serverError}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3 px-4 bg-ruby-primary hover:bg-ruby-hover active:bg-[#9B0B42] disabled:opacity-60 text-white text-base font-bold rounded-xl transition-colors mt-1 shadow-lg shadow-ruby-primary/30"
          >
            {isLoggingIn ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </>
            ) : 'Đăng nhập'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
