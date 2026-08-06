import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, KeyRound, ArrowRight, UserCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../Api';

export default function StaffSetup() {
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'otp') {
      setFormData({ ...formData, otp: value.replace(/[^0-9]/g, '').slice(0, 6) });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (formData.password.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }
    if (formData.otp.length !== 6) {
      return toast.error('Please enter the 6-digit OTP from your invitation email');
    }

    setLoading(true);
    try {
      await api.post('/users/staff-setup', {
        email: formData.email,
        otp: formData.otp,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });
      toast.success('Setup complete! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Staff setup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1A] flex items-center justify-center p-4 text-white relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/[0.02] p-8 rounded-[2rem] border border-white/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 relative">
        <div className="text-center mb-8 animate-fade-in-down">
          <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-white/[0.02] border border-white/10 mb-5 shadow-[0_0_30px_rgba(168,85,247,0.15)] backdrop-blur-md">
            <UserCheck className="text-purple-400" size={48} />
          </div>

          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tight">
            EchoStream
          </h2>
          <p className="text-gray-400 mt-2">Complete your staff account setup.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-down">
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
            <KeyRound className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input
              type="text"
              name="otp"
              maxLength="6"
              required
              value={formData.otp}
              onChange={handleChange}
              className="w-full bg-black/40 border border-white/10 p-3 pl-12 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all placeholder-gray-600 tracking-[0.5rem] font-mono text-center"
              placeholder="------"
            />
            <p className="text-xs text-gray-500 mt-2 text-center">Enter the 6-digit OTP from your invitation email</p>
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-black/40 border border-white/10 p-3 pl-12 rounded-xl text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder-gray-600"
              placeholder="New Password"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input
              type="password"
              name="confirmPassword"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full bg-black/40 border p-3 pl-12 rounded-xl text-white focus:outline-none transition-all placeholder-gray-600 ${
                formData.confirmPassword && formData.password !== formData.confirmPassword
                  ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                  : 'border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400'
              }`}
              placeholder="Confirm Password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 py-4 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                Complete Setup <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/login" className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">
            Already set up? <span className="font-bold border-b border-transparent hover:border-cyan-400 pb-0.5">Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
