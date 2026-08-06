import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, ArrowRight, KeyRound, RefreshCcw } from 'lucide-react';
import { toast } from 'react-toastify';
import { setSignupIntent } from '../utils/permissionHelpers';
import { navigateAfterAuth } from '../utils/navigateAfterAuth';
import PasswordInput from '../components/PasswordInput';
import GoogleSignInButton from '../components/GoogleSignInButton';
import logo from '../assets/logo.png';

export default function AuthPage() {
  const [step, setStep] = useState('auth'); // 'auth' | 'otp' | 'login-otp'
  const [otpMode, setOtpMode] = useState('signup'); // 'signup' | 'login'
  const [isLogin, setIsLogin] = useState(true);

  const [formData, setFormData] = useState({ userName: '', email: '', password: '', confirmPassword: '' });
  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ level: '', width: 0, color: '' });

  const { login, register, verifyOtp, resendOtp, requestLoginOtp, verifyLoginOtp, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const intent = searchParams.get('intent');
    if (intent === 'presence' || intent === 'commerce') {
      setSignupIntent(intent);
    }
    if (searchParams.get('mode') === 'signup') {
      setIsLogin(false);
    }
  }, [searchParams]);

  const checkPasswordStrength = (password) => {
    if (!password) return { level: '', width: 0, color: '' };
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const length = password.length;

    if (length >= 8 && hasLetters && hasNumbers && hasSpecial) return { level: 'Strong', width: 100, color: 'bg-green-500' };
    if (length >= 6 && hasLetters && hasNumbers) return { level: 'Medium', width: 66, color: 'bg-yellow-500' };
    return { level: 'Weak', width: 33, color: 'bg-red-500' };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'password') setPasswordStrength(checkPasswordStrength(value));
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!isLogin && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const loggedInUser = await login(formData.email, formData.password);
        toast.success('Logged in successfully!');
        await navigateAfterAuth(loggedInUser, navigate);
      } else {
        await register(formData.userName, formData.email, formData.password, formData.confirmPassword);
        toast.success('Verification code sent to your email!');
        setOtpMode('signup');
        setStep('otp');
      }
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.unverifiedEmail) {
        toast.warning(err.response.data.message);
        setFormData({ ...formData, email: err.response.data.unverifiedEmail });
        setOtpMode('signup');
        setStep('otp');
      } else {
        toast.error(err.response?.data?.message || err.response?.data || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const startLoginOtp = async (e) => {
    e.preventDefault();
    if (!formData.email) return toast.error('Enter your email first.');
    setLoading(true);
    try {
      await requestLoginOtp(formData.email);
      toast.success('If that email is registered, a login code was sent.');
      setOtpMode('login');
      setOtp('');
      setStep('otp');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send login code.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (otpMode === 'login') {
        const loggedInUser = await verifyLoginOtp(formData.email, otp);
        toast.success('Logged in with OTP.');
        await navigateAfterAuth(loggedInUser, navigate);
      } else {
        const verifiedUser = await verifyOtp(formData.email, otp);
        toast.success('Email verified successfully! Welcome to EchoStream.');
        await navigateAfterAuth(verifiedUser, navigate);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      if (otpMode === 'login') {
        await requestLoginOtp(formData.email);
      } else {
        await resendOtp(formData.email);
      }
      toast.success('A new code has been sent to your email.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend code.');
    }
  };

  const handleGoogleCredential = async (credential) => {
    setLoading(true);
    try {
      const { user: loggedInUser, isNewUser } = await loginWithGoogle(credential);
      toast.success(isNewUser ? 'Welcome to EchoStream!' : 'Signed in with Google.');
      await navigateAfterAuth(loggedInUser, navigate);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1A] flex items-center justify-center p-4 text-white relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-white/[0.02] p-8 rounded-[2rem] border border-white/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 relative">
        <div className="text-center mb-8 animate-fade-in-down">
          {step === 'otp' ? (
            <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-white/[0.02] border border-white/10 mb-5 shadow-[0_0_30px_rgba(168,85,247,0.15)] backdrop-blur-md">
              <KeyRound className="text-purple-400" size={48} />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-white/[0.02] border border-white/10 mb-5 shadow-[0_0_30px_rgba(34,211,238,0.15)] backdrop-blur-md">
              <img src={logo} alt="EchoStream" className="h-14 w-auto object-contain drop-shadow-[0_0_20px_rgba(34,211,238,0.6)] transition-transform hover:scale-105 duration-500" />
            </div>
          )}

          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tight">
            EchoStream
          </h2>
          <p className="text-gray-400 mt-2">
            {step === 'otp'
              ? otpMode === 'login'
                ? 'Enter your login code.'
                : 'Verify your identity.'
              : isLogin
                ? 'Welcome back.'
                : 'Build trust with verified reviews.'}
          </p>
        </div>

        {step === 'auth' && (
          <div className="animate-fade-in-down">
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {!isLogin && (
                <div className="relative animate-fade-in-down">
                  <User className="absolute left-4 top-3.5 text-gray-500" size={20} />
                  <input
                    type="text"
                    name="userName"
                    required={!isLogin}
                    value={formData.userName}
                    onChange={handleChange}
                    className="w-full bg-black/40 border border-white/10 p-3 pl-12 rounded-xl text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder-gray-600"
                    placeholder="Your Name"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-gray-500" size={20} />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-black/40 border border-white/10 p-3 pl-12 rounded-xl text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder-gray-600"
                  placeholder="Email Address"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-gray-500 z-10" size={20} />
                <PasswordInput
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />

                {!isLogin && formData.password && (
                  <div className="mt-3 animate-fade-in-down">
                    <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.width}%` }}
                      />
                    </div>
                    <p
                      className={`text-xs mt-1.5 font-medium ${
                        passwordStrength.level === 'Strong'
                          ? 'text-green-400'
                          : passwordStrength.level === 'Medium'
                            ? 'text-yellow-400'
                            : 'text-red-400'
                      }`}
                    >
                      Security: {passwordStrength.level}
                    </p>
                  </div>
                )}
              </div>

              {!isLogin && (
                <div className="relative animate-fade-in-down">
                  <Lock className="absolute left-4 top-3.5 text-gray-500 z-10" size={20} />
                  <PasswordInput
                    name="confirmPassword"
                    required={!isLogin}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm Password"
                    autoComplete="new-password"
                    inputClassName={
                      formData.confirmPassword && formData.password !== formData.confirmPassword
                        ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        : ''
                    }
                  />
                </div>
              )}

              {isLogin && (
                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-xs text-cyan-400/90 hover:text-cyan-300">
                    Forgot password?
                  </Link>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 py-4 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Access Account' : 'Create Account'} <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {isLogin && (
              <button
                type="button"
                onClick={startLoginOtp}
                disabled={loading}
                className="mt-4 w-full min-h-[44px] rounded-xl border border-white/10 text-sm font-bold text-gray-300 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50"
              >
                Login with OTP instead
              </button>
            )}

            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <GoogleSignInButton onCredential={handleGoogleCredential} disabled={loading} />

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setFormData({ userName: '', email: '', password: '', confirmPassword: '' });
                  setPasswordStrength({ level: '', width: 0, color: '' });
                }}
                className="text-gray-400 hover:text-cyan-400 transition-colors text-sm"
              >
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <span className="font-bold border-b border-transparent hover:border-cyan-400 pb-0.5">
                  {isLogin ? 'Register' : 'Sign In'}
                </span>
              </button>
            </div>
          </div>
        )}

        {step === 'otp' && (
          <div className="animate-fade-in-down">
            <p className="text-center text-sm text-gray-400 mb-6">
              We&apos;ve sent a 6-digit code to <strong className="text-white">{formData.email}</strong>. Please enter it below.
            </p>

            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  maxLength="6"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white focus:outline-none focus:border-purple-400 transition-all text-center text-3xl tracking-[1rem] font-mono"
                  placeholder="------"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full bg-gradient-to-r from-purple-500 to-cyan-600 hover:from-purple-400 hover:to-cyan-500 py-4 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : otpMode === 'login' ? (
                  'Verify & Login'
                ) : (
                  'Verify & Enter'
                )}
              </button>
            </form>

            <div className="mt-8 text-center flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-gray-400 hover:text-purple-400 transition-colors text-sm flex items-center gap-1"
              >
                <RefreshCcw size={14} /> Didn&apos;t receive a code? Resend
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('auth');
                  setOtp('');
                }}
                className="text-gray-500 hover:text-white transition-colors text-xs underline"
              >
                Back to {otpMode === 'login' ? 'password login' : 'email form'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
