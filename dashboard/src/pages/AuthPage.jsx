import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, AlertCircle, ArrowRight, Store } from 'lucide-react';
import { toast } from 'react-toastify'; // Only import toast, container is in App.jsx

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  
  // 🚨 ADDED confirmPassword to state
  const [formData, setFormData] = useState({ userName: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ level: '', width: 0, color: '' });
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const checkPasswordStrength = (password) => {
    if (!password) return { level: '', width: 0, color: '' };
    
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const length = password.length;
    
    let level = 'Weak';
    let width = 33;
    let color = 'bg-red-500';
    
    if (length >= 8 && hasLetters && hasNumbers && hasSpecial) {
      level = 'Strong';
      width = 100;
      color = 'bg-green-500';
    } else if (length >= 6 && hasLetters && hasNumbers) {
      level = 'Medium';
      width = 66;
      color = 'bg-yellow-500';
    }
    
    return { level, width, color };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
    
    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Frontend validation for passwords
    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Logged in successfully!');
      } else {
        // Pass confirmPassword to the register function
        await register(formData.userName, formData.email, formData.password, formData.confirmPassword);
        toast.success('Account created successfully! Welcome to EchoStream.');
      }
      navigate('/stores');
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data || 'Authentication failed. Please try again.';
      setError(message);
      // We removed toast.error() here to prevent double-notifying the user since we render it in the red Alert box below anyway!
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-purple-600/20 border border-white/10 mb-4 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
            <Store className="text-cyan-400" size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tight">
            EchoStream
          </h2>
          <p className="text-gray-400 mt-2">
            {isLogin ? 'Welcome back.' : 'Build trust with verified reviews.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/50 flex items-start gap-3 text-red-400 text-sm animate-fade-in-down">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {!isLogin && (
            <div className="relative animate-fade-in-down">
              <User className="absolute left-4 top-3.5 text-gray-500" size={20} />
              <input type="text" name="userName" required={!isLogin} value={formData.userName} onChange={handleChange} className="w-full bg-black/40 border border-white/10 p-3 pl-12 rounded-xl text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder-gray-600" placeholder="Your Name" />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full bg-black/40 border border-white/10 p-3 pl-12 rounded-xl text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder-gray-600" placeholder="Email Address" />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input type="password" name="password" required value={formData.password} onChange={handleChange} className="w-full bg-black/40 border border-white/10 p-3 pl-12 rounded-xl text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder-gray-600" placeholder="Password" />
            
            {/* 🚨 ONLY show strength meter during Registration */}
            {!isLogin && formData.password && (
              <div className="mt-3 animate-fade-in-down">
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: `${passwordStrength.width}%` }}></div>
                </div>
                <p className={`text-xs mt-1.5 font-medium ${passwordStrength.level === 'Strong' ? 'text-green-400' : passwordStrength.level === 'Medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                  Security: {passwordStrength.level}
                </p>
              </div>
            )}
          </div>

          {/* 🚨 NEW: Confirm Password (Only during Registration) */}
          {!isLogin && (
            <div className="relative animate-fade-in-down">
              <Lock className="absolute left-4 top-3.5 text-gray-500" size={20} />
              <input type="password" name="confirmPassword" required={!isLogin} value={formData.confirmPassword} onChange={handleChange} className={`w-full bg-black/40 border p-3 pl-12 rounded-xl text-white focus:outline-none transition-all placeholder-gray-600 ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400'}`} placeholder="Confirm Password" />
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 py-4 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-6">
            {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>{isLogin ? 'Access Account' : 'Create Account'} <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); setFormData({ userName: '', email: '', password: '', confirmPassword: '' }); setPasswordStrength({ level: '', width: 0, color: '' }); }} className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span className="font-bold border-b border-transparent hover:border-cyan-400 pb-0.5">{isLogin ? 'Register' : 'Sign In'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}