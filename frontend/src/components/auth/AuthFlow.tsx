import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@hooks/useAuth';
import { ROUTES } from '@constants/routes';

interface AuthFlowProps {
  initialMode: 'login' | 'register';
  onBack: () => void;
}

export function AuthFlow({ initialMode, onBack }: AuthFlowProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isLoading } = useAuth();

  const [mode, setMode] = useState<'email' | 'password' | 'register'>(initialMode === 'login' ? 'email' : 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [error, setError] = useState('');
  const [pendingApproval, setPendingApproval] = useState(false);

  const from = (location.state as { from?: Location })?.from?.pathname || ROUTES.DASHBOARD;

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() === '') {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setMode('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err.message?.includes('pending') || err.code === 'ACCOUNT_PENDING') {
        setError('Your account is awaiting administrator approval.');
      } else {
        setError('Incorrect credentials. Check your email and password.');
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await register({
        email,
        password,
        firstName,
        lastName,
        role: 'Technician', // Default role request
      });
      setPendingApproval(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    }
  };

  const slideVariants = {
    initial: (direction: number) => ({ opacity: 0, x: direction > 0 ? 20 : -20 }),
    animate: { opacity: 1, x: 0 },
    exit: (direction: number) => ({ opacity: 0, x: direction < 0 ? 20 : -20 }),
  };

  const direction = mode === 'password' ? 1 : -1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-[360px] xs:max-w-[380px] sm:max-w-[420px] mx-auto z-10"
    >
      <div
        className="bg-white/75 dark:bg-[#1C1C1E]/75 backdrop-blur-3xl rounded-3xl sm:rounded-[28px] p-5 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/40 dark:border-white/10 relative overflow-visible h-auto"
      >
        {/* Subtle internal light effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none rounded-3xl sm:rounded-[28px]" />

        {/* Back Button */}
        <button
          onClick={() => {
            if (mode === 'password') setMode('email');
            else if (mode === 'register') setMode('email');
            else onBack();
          }}
          className="absolute top-3.5 left-3.5 sm:top-6 sm:left-6 p-1.5 sm:p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors z-20"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* 3D IEC Logo + Soft Luminous Bubbles */}
        <div className="flex justify-center mb-2.5 sm:mb-6 mt-0.5 sm:mt-2 relative">
          <div className="relative w-14 h-14 sm:w-28 sm:h-28 flex items-center justify-center">
            {/* Soft Luminous Bubbles */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-40 sm:h-40 bg-blue-400/15 dark:bg-blue-500/20 rounded-full blur-md sm:blur-xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-32 sm:h-32 bg-indigo-400/15 dark:bg-indigo-500/20 rounded-full blur-md translate-x-0.5 translate-y-0.5 pointer-events-none" />

            {/* Main 3D Logo */}
            <img src="/logo-3d.png" alt="IEC" className="relative z-10 h-10 w-10 sm:h-24 sm:w-24 object-contain drop-shadow-xl" />
          </div>
        </div>

        <div className="text-center mb-3.5 sm:mb-8 relative z-10">
          <h2 className="text-[17px] sm:text-[22px] font-semibold sm:font-medium tracking-tight text-gray-900 dark:text-white leading-snug px-1">
            {mode === 'register' && !pendingApproval ? 'Create Account' : 'Sign in to Industrial Evidence Chain'}
          </h2>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 relative z-10">
            <div className="text-[13px] font-medium text-red-600 dark:text-red-400 text-center" role="alert">
              {error}
            </div>
          </motion.div>
        )}

        {pendingApproval ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6 relative z-10">
            <div className="inline-flex h-12 w-12 text-emerald-500 items-center justify-center mb-2">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <h3 className="text-[17px] font-semibold text-gray-900 dark:text-white">Account Pending</h3>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
              Your request has been securely submitted. You will be able to sign in once an administrator verifies your identity and role.
            </p>
            <button
              onClick={onBack}
              className="w-[120px] mx-auto mt-4 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white text-[13px] font-semibold h-8 rounded-full transition-colors"
            >
              Close
            </button>
          </motion.div>
        ) : (
          <div className="relative z-10">
            {(mode === 'email' || mode === 'password') && (
              <form
                onSubmit={mode === 'email' ? handleEmailSubmit : handlePasswordSubmit}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <input
                    id="email"
                    type="email"
                    placeholder="Email or Account ID"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus={mode === 'email'}
                    readOnly={mode === 'password'}
                    className={`w-full h-[44px] sm:h-[52px] px-3.5 sm:px-4 rounded-xl bg-white/50 dark:bg-black/20 border text-sm sm:text-[15px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none transition-all ${mode === 'password'
                      ? 'border-transparent opacity-60'
                      : 'border-black/10 dark:border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 hover:bg-white/80 dark:hover:bg-black/30'
                      }`}
                  />
                </div>

                <AnimatePresence mode="popLayout">
                  {mode === 'password' && (
                    <motion.div
                      initial={{ opacity: 0, y: -20, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -20, height: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-4"
                    >
                      <div className="relative pt-1 sm:pt-2">
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoFocus
                          disabled={isLoading}
                          className="w-full h-[44px] sm:h-[52px] pl-3.5 sm:pl-4 pr-10 rounded-xl bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 text-sm sm:text-[15px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all hover:bg-white/80 dark:hover:bg-black/30"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-[55%] -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="popLayout">
                  {mode === 'email' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-2 py-1 sm:py-2"
                    >
                      <button type="button" className="text-xs sm:text-[13px] text-blue-600 dark:text-blue-400 font-medium text-left hover:underline self-start">
                        Forgot your email or ID?
                      </button>
                      <button type="button" onClick={() => setMode('register')} className="text-xs sm:text-[13px] text-blue-600 dark:text-blue-400 font-medium text-left hover:underline self-start">
                        Create a new IEC account
                      </button>
                      <p className="text-[11px] sm:text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5 sm:mt-2">
                        Your account protects access to verified industrial evidence and operational records.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="pt-2 sm:pt-4 flex justify-center w-full">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto min-w-[140px] px-8 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-100 disabled:opacity-50 text-sm sm:text-[15px] font-medium h-[42px] sm:h-[46px] rounded-full transition-all shadow-sm flex items-center justify-center active:scale-[0.98]"
                  >
                    {mode === 'email' ? 'Continue' : (isLoading ? 'Signing In...' : 'Sign In')}
                  </button>
                </div>
              </form>
            )}

            {mode === 'register' && (
              <motion.form
                key="register"
                custom={direction}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                onSubmit={handleRegisterSubmit}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <input
                    id="firstName"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full h-[46px] px-3 rounded-xl bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 transition-shadow"
                  />
                  <input
                    id="lastName"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full h-[46px] px-3 rounded-xl bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 transition-shadow"
                  />
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full h-[46px] px-3 rounded-xl bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 transition-shadow"
                />
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full h-[46px] pl-3 pr-10 rounded-xl bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="pt-2 pb-2">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center">
                    By continuing, you agree to the Industrial Evidence Chain Terms of Service and Privacy Policy.
                  </p>
                </div>

                <div className="flex justify-center w-full">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto min-w-[140px] px-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-50 text-[14px] font-medium h-[44px] sm:h-[46px] rounded-full transition-opacity flex items-center justify-center active:scale-[0.98]"
                  >
                    {isLoading ? 'Requesting...' : 'Request Access'}
                  </button>
                </div>
              </motion.form>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
