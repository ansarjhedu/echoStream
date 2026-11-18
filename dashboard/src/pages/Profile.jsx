import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../Api';
import { toast } from 'react-toastify';
import { User, Mail, Lock, Camera, Trash2 } from 'lucide-react';
import PaymentCardVisual from '../components/ui/PaymentCardVisual';
import UserAvatar from '../components/UserAvatar';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    userName: user?.userName || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    profilePic: null,
  });
  const [previewImage, setPreviewImage] = useState(user?.profilePic || null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if (user?.role !== 'owner') return undefined;
    let cancelled = false;
    api.get('/users/billing')
      .then((res) => {
        if (!cancelled) setSubscription(res.data?.data || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, profilePic: file });
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match!');
    }

    setLoading(true);
    const submitData = new FormData();
    submitData.append('userName', formData.userName);
    submitData.append('email', formData.email);
    if (formData.password) {
      submitData.append('password', formData.password);
      submitData.append('confirmPassword', formData.confirmPassword);
    }
    if (formData.profilePic) submitData.append('profilePic', formData.profilePic);

    try {
      const res = await api.put('/users/update', submitData);
      const next = res.data?.data;
      if (next) {
        setUser((prev) => ({ ...(prev || {}), ...next }));
        setPreviewImage(next.profilePic || previewImage);
        setFormData((prev) => ({ ...prev, profilePic: null, password: '', confirmPassword: '' }));
      }
      toast.success('Profile updated.');
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm.trim().toLowerCase() !== 'delete') {
      return toast.error('Type DELETE to confirm.');
    }
    if (
      !window.confirm(
        'This soft-deletes your account and all stores. You have 30 days to contact support for restore. Continue?'
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await api.delete('/users/account', { data: { confirm: 'delete' } });
      toast.success('Account scheduled for deletion.');
      await logout();
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete account.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 md:p-12 relative overflow-y-auto h-full">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10 space-y-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500 tracking-tight">
          Profile Settings
        </h1>

        {user?.role === 'owner' && (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 md:p-8">
            <div className="flex items-end justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/80 font-bold">Subscription</p>
                <p className="text-lg font-bold text-white mt-1 capitalize">
                  {subscription?.entitlements?.catalog?.name || subscription?.billedPlanId || user?.plan || 'Free'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/hub/billing')}
                className="min-h-10 px-3 rounded-xl border border-cyan-400/30 text-cyan-300 text-xs font-bold"
              >
                Manage billing
              </button>
            </div>
            <PaymentCardVisual
              brand={subscription?.paymentMethod?.brand || user?.paymentMethodBrand}
              last4={subscription?.paymentMethod?.last4 || user?.paymentMethodLast4}
              expMonth={subscription?.paymentMethod?.expMonth || user?.paymentMethodExpMonth}
              expYear={subscription?.paymentMethod?.expYear || user?.paymentMethodExpYear}
              holder={user?.userName}
            />
          </div>
        )}

        <div className="bg-white/[0.02] border border-white/10 p-6 md:p-10 rounded-[2rem] backdrop-blur-xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center mb-8">
              <div className="relative group cursor-pointer">
                <div className="w-28 h-28 rounded-full bg-black/50 border-2 border-white/10 overflow-hidden flex items-center justify-center relative shadow-[0_0_20px_rgba(34,211,238,0.1)]">
                  <UserAvatar src={previewImage} name={formData.userName || user?.userName} className="w-full h-full object-cover text-2xl" />
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
                  <input
                    type="text"
                    required
                    value={formData.userName}
                    onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 p-3 pl-12 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 text-gray-500" size={20} />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 p-3 pl-12 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  New Password <span className="text-gray-600">(Leave blank to keep current)</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 text-gray-500" size={20} />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 p-3 pl-12 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all placeholder-gray-600"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 py-4 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all disabled:opacity-50 mt-4"
            >
              {loading ? 'Saving Changes...' : 'Save Profile Settings'}
            </button>
          </form>
        </div>

        {user?.role === 'owner' ? (
          <div className="rounded-[2rem] border border-red-500/25 bg-red-500/[0.04] p-6 md:p-8">
            <div className="flex items-start gap-3 mb-4">
              <Trash2 className="text-red-400 shrink-0 mt-0.5" size={20} />
              <div>
                <h2 className="text-lg font-bold text-white">Delete account</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Soft-deletes your owner account, team seats, and stores. Data is purged after 30 days unless
                  support restores it. Billing is managed separately under Billing.
                </p>
              </div>
            </div>
            {!showDelete ? (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="min-h-11 px-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-sm font-bold hover:bg-red-500/20"
              >
                I want to delete my account
              </button>
            ) : (
              <div className="space-y-3">
                <label className="flex flex-col gap-1.5 text-xs text-gray-500">
                  Type DELETE to confirm
                  <input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    className="min-h-11 rounded-xl bg-black/40 border border-red-500/30 px-3 text-sm text-white"
                    placeholder="DELETE"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDeleteAccount}
                    className="min-h-11 px-4 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Delete my account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDelete(false);
                      setDeleteConfirm('');
                    }}
                    className="min-h-11 px-4 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
