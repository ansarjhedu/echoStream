import React, { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, UserCheck, ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { getPostLoginPath } from '../utils/permissionHelpers';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';
  const tokenFromUrl = searchParams.get('token') || '';
  const { acceptInvite, user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    userName: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const isValidInvite = useMemo(
    () => Boolean(emailFromUrl && tokenFromUrl),
    [emailFromUrl, tokenFromUrl]
  );

  if (user) {
    return <Navigate to={getPostLoginPath(user)} replace />;
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidInvite) {
      return toast.error('Invalid invitation link. Missing email or token.');
    }
    if (!formData.userName.trim()) {
      return toast.error('Please enter your name');
    }
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (formData.password.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }

    setLoading(true);
    try {
      const data = await acceptInvite({
        email: emailFromUrl,
        token: tokenFromUrl,
        userName: formData.userName.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });
      toast.success('Welcome to the team!');
      navigate(getPostLoginPath(data.user || user));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept invitation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1A] flex items-center justify-center p-4 text-white relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/[0.02] p-8 rounded-[2rem] border border-white/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-white/[0.02] border border-white/10 mb-5 shadow-[0_0_30px_rgba(168,85,247,0.15)] backdrop-blur-md">
            <UserCheck className="text-purple-400" size={48} />
          </div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tight">
            Accept Invitation
          </h2>
          <p className="text-gray-400 mt-2">Set your password to join the team.</p>
        </div>

        {!isValidInvite ? (
          <div className="text-center space-y-4">
            <p className="text-red-400 text-sm">This invitation link is invalid or incomplete.</p>
            <Link to="/login" className="text-cyan-400 hover:underline text-sm">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-gray-500" size={20} />
              <input
                type="email"
                readOnly
                value={emailFromUrl}
                className="w-full bg-black/40 border border-white/10 p-3 pl-12 rounded-xl text-gray-300 cursor-not-allowed opacity-80"
              />
            </div>

            <div className="relative">
              <User className="absolute left-4 top-3.5 text-gray-500" size={20} />
              <input
                type="text"
                name="userName"
                required
                value={formData.userName}
                onChange={handleChange}
                className="w-full bg-black/40 border border-white/10 p-3 pl-12 rounded-xl text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder-gray-600"
                placeholder="Your Name"
              />
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
                  Accept &amp; Enter Workspace <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link to="/login" className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">
            Already have an account? <span className="font-bold">Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
