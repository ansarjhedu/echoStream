import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../Api';
import { User, Mail, Lock, Camera, AlertCircle, CheckCircle } from 'lucide-react';

export default function Profile() {
  const { user, login } = useAuth(); // We'll re-use login trick to update context if needed, or just force reload.
  
  const[formData, setFormData] = useState({
    userName: user?.userName || '',
    email: user?.email || '',
    password: '',
    profilePic: null
  });
  
  const [previewImage, setPreviewImage] = useState(user?.profilePic || null);
  const [loading, setLoading] = useState(false);
  const[status, setStatus] = useState({ type: '', message: '' });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, profilePic: file });
      setPreviewImage(URL.createObjectURL(file)); // Show preview instantly
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    const submitData = new FormData();
    submitData.append('userName', formData.userName);
    submitData.append('email', formData.email);
    if (formData.password) submitData.append('password', formData.password);
    if (formData.profilePic) submitData.append('profilePic', formData.profilePic);

    try {
      // Hitting your backend update route
      await api.put('/users/update', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setStatus({ type: 'success', message: 'Profile updated successfully! Refreshing...' });
      // Reload page to re-fetch safe user data from context
      setTimeout(() => window.location.reload(), 1500); 
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-12 relative overflow-y-auto h-full">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-2xl mx-auto relative z-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500 tracking-tight mb-8">
          Profile Settings
        </h1>

        <div className="bg-white/[0.02] border border-white/10 p-6 md:p-10 rounded-[2rem] backdrop-blur-xl shadow-2xl">
          
          {status.message && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-bold ${status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
              {status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
              {status.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Profile Picture Upload */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative group cursor-pointer">
                <div className="w-28 h-28 rounded-full bg-black/50 border-2 border-white/10 overflow-hidden flex items-center justify-center relative shadow-[0_0_20px_rgba(34,211,238,0.1)]">
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} className="text-gray-500" />
                  )}
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white" size={24} />
                  </div>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <p className="text-sm text-gray-400 mt-3">Click to update avatar</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Display Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 text-gray-500" size={20} />
                  <input type="text" required value={formData.userName} onChange={(e) => setFormData({...formData, userName: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 pl-12 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 text-gray-500" size={20} />
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 pl-12 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">New Password <span className="text-gray-600">(Leave blank to keep current)</span></label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 text-gray-500" size={20} />
                  <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 pl-12 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all placeholder-gray-600" placeholder="••••••••" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 py-4 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all disabled:opacity-50 mt-4">
              {loading ? 'Saving Changes...' : 'Save Profile Settings'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}