import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, KeyRound, ArrowLeft, ArrowRight, RefreshCcw } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../Api';
import PasswordInput from '../components/PasswordInput';
import logo from '../assets/logo.png';

/**
 * Forgot password — email → OTP → new password + confirm.
 */
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // email | otp | password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const requestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/users/forgot-password', { email });
      toast.success('If that email is registered, a reset code was sent.');
      setStep('otp');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send reset code.');
    } finally {
      setLoading(false);
    }
  };

  const goToPassword = (e) => {
    e.preventDefault();
    if (otp.length < 6) return toast.error('Enter the 6-digit code.');
    setStep('password');
  };

  const submitReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/users/reset-password', {
        email,
        otp,
        password,
        confirmPassword,
      });
      toast.success('Password updated. Sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed.');
      if (err.response?.status === 400) setStep('otp');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await api.post('/users/forgot-password', { email });
      toast.success('A new reset code was sent if the email is registered.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1A] flex items-center justify-center p-4 text-white relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-white/[0.02] p-8 rounded-[2rem] border border-white/10 backdrop-blur-xl z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-white/[0.02] border border-white/10 mb-5">
            {step === 'otp' ? (
              <KeyRound className="text-purple-400" size={40} />
            ) : (
              <img src={logo} alt="EchoStream" className="h-12 w-auto object-contain" />
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
            {step === 'password' ? 'Set new password' : 'Forgot password'}
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            {step === 'email' && 'We will email a one-time code to reset your password.'}
            {step === 'otp' && <>Enter the code sent to <strong className="text-white">{email}</strong>.</>}
            {step === 'password' && 'Choose a new password, then confirm it.'}
          </p>
        </div>

        {step === 'email' && (
          <form onSubmit={requestCode} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-gray-500" size={20} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 p-3 pl-12 rounded-xl text-white focus:outline-none focus:border-cyan-400"
                placeholder="Email Address"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl font-bold disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset code'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={goToPassword} className="space-y-4">
            <input
              type="text"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-center text-3xl tracking-[1rem] font-mono text-white focus:outline-none focus:border-purple-400"
              placeholder="------"
            />
            <button
              type="submit"
              disabled={otp.length < 6}
              className="w-full min-h-[48px] bg-gradient-to-r from-purple-500 to-cyan-600 rounded-xl font-bold disabled:opacity-50"
            >
              Continue
            </button>
            <button type="button" onClick={resend} className="w-full text-sm text-gray-400 hover:text-purple-400 flex items-center justify-center gap-1">
              <RefreshCcw size={14} /> Resend code
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={submitReset} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-gray-500 z-10" size={20} />
              <PasswordInput
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                autoComplete="new-password"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-gray-500 z-10" size={20} />
              <PasswordInput
                name="confirmPassword"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                inputClassName={
                  confirmPassword && password !== confirmPassword
                    ? 'border-red-500 focus:border-red-500'
                    : ''
                }
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? 'Updating…' : <>Update password <ArrowRight size={16} /></>}
            </button>
          </form>
        )}

        <Link to="/login" className="mt-8 flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-cyan-400">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    </div>
  );
}
