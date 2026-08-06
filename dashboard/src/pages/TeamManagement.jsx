import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import api from '../Api';
import { toast } from 'react-toastify';
import { UserPlus, Mail, User, Shield, Trash2, Users, RefreshCcw, Pencil, X } from 'lucide-react';
import {
  ROLE_PRESETS,
  PLATFORM_ROLE_PRESETS,
  STORE_PERM_GROUPS,
  PLATFORM_PERM_GROUPS,
  getDaysLeft,
  isMasterAdmin,
} from '../utils/permissionHelpers';

const STORE_ROLE_OPTIONS = [
  { value: 'administrator', label: 'Administrator' },
  { value: 'editor', label: 'Editor' },
  { value: 'support', label: 'Support Representative' },
  { value: 'custom', label: 'Custom' },
];

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'pending', label: 'Pending' },
  { key: 'revoked', label: 'Revoked/Deleted' },
];

/**
 * @param {'store'|'platform'} variant
 */
export default function TeamManagement({ variant = 'store' }) {
  const { user } = useAuth();
  const isPlatform = variant === 'platform';
  const presets = isPlatform ? PLATFORM_ROLE_PRESETS : ROLE_PRESETS;
  const permGroups = isPlatform ? PLATFORM_PERM_GROUPS : STORE_PERM_GROUPS;
  const emptyForm = { userName: '', email: '', storeRole: 'support', permissions: [...presets.support] };

  const [formData, setFormData] = useState(emptyForm);
  const [staff, setStaff] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ storeRole: 'support', permissions: [] });
  const [editSaving, setEditSaving] = useState(false);

  const isCustom = formData.storeRole === 'custom';
  const editIsCustom = editForm.storeRole === 'custom';
  const canAccess = isPlatform ? isMasterAdmin(user) : user?.role === 'owner';
  const apiBase = isPlatform ? '/admin/team' : '/users';

  const fetchStaff = async (status = statusFilter) => {
    setListLoading(true);
    try {
      const url = isPlatform ? `${apiBase}?status=${status}` : `/users/staff?status=${status}`;
      const res = await api.get(url);
      setStaff(res.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load staff');
      setStaff([]);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess) fetchStaff(statusFilter);
    else setListLoading(false);
  }, [statusFilter, variant, canAccess]);

  if (!canAccess) {
    return <Navigate to={isPlatform ? '/hub/admin/overview' : '/hub/stores'} replace />;
  }

  const applyRoleToForm = (role, setter, current) => {
    if (role === 'custom') {
      setter({ ...current, storeRole: role });
      return;
    }
    setter({ ...current, storeRole: role, permissions: [...(presets[role] || [])] });
  };

  const togglePermission = (setter, current, perm, locked) => {
    if (locked) return;
    const next = current.permissions.includes(perm)
      ? current.permissions.filter((p) => p !== perm)
      : [...current.permissions, perm];
    setter({ ...current, permissions: next });
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!formData.userName || !formData.email) return toast.error('Name and email are required');
    if (formData.storeRole === 'custom' && formData.permissions.length === 0) {
      return toast.error('Select at least one permission for Custom role');
    }
    setLoading(true);
    try {
      const endpoint = isPlatform ? '/admin/team/invite' : '/users/invite-staff';
      await api.post(endpoint, formData);
      toast.success('Invitation sent!');
      setFormData({ ...emptyForm, permissions: [...presets.support] });
      fetchStaff(statusFilter);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to invite staff');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (id) => {
    setActionId(id);
    try {
      const endpoint = isPlatform ? `/admin/team/${id}/resend-invite` : `/users/staff/${id}/resend-invite`;
      await api.post(endpoint);
      toast.success('Invitation resent');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend');
    } finally {
      setActionId(null);
    }
  };

  const handleRevoke = async (id) => {
    setActionId(id);
    try {
      const endpoint = isPlatform ? `/admin/team/${id}` : `/users/staff/${id}`;
      await api.delete(endpoint);
      toast.success('Access revoked');
      fetchStaff(statusFilter);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to revoke');
    } finally {
      setActionId(null);
    }
  };

  const openEditModal = (member) => {
    setEditTarget(member);
    setEditForm({
      storeRole: member.storeRole || 'custom',
      permissions: [...(member.permissions || [])],
    });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    if (editForm.storeRole === 'custom' && editForm.permissions.length === 0) {
      return toast.error('Select at least one permission');
    }
    setEditSaving(true);
    try {
      const endpoint = isPlatform
        ? `/admin/team/${editTarget._id}/permissions`
        : `/users/staff/${editTarget._id}/permissions`;
      await api.patch(endpoint, editForm);
      toast.success('Permissions updated. Staff must sign in again.');
      setEditTarget(null);
      fetchStaff(statusFilter);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update');
    } finally {
      setEditSaving(false);
    }
  };

  const statusBadge = (member) => {
    if (member.isDeleted) {
      return <span className="text-xs px-2 py-1 rounded-full border bg-red-500/10 text-red-400 border-red-500/30">Revoked</span>;
    }
    if (member.isVerified) {
      return <span className="text-xs px-2 py-1 rounded-full border bg-green-500/10 text-green-400 border-green-500/30">Accepted</span>;
    }
    return <span className="text-xs px-2 py-1 rounded-full border bg-yellow-500/10 text-yellow-400 border-yellow-500/30">Pending</span>;
  };

  const PermissionMatrix = ({ values, locked, onToggle }) => (
    <div className="space-y-4">
      {permGroups.map((group) => (
        <div key={group.title}>
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">{group.title}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {group.keys.map((perm) => {
              const checked = values.includes(perm);
              return (
                <label
                  key={perm}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm capitalize transition-all ${
                    locked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    checked
                      ? isPlatform
                        ? 'bg-red-500/10 border-red-500/40 text-red-300'
                        : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                      : 'bg-black/40 border-white/10 text-gray-400'
                  }`}
                >
                  <input type="checkbox" checked={checked} disabled={locked} onChange={() => onToggle(perm)} className={isPlatform ? 'accent-red-400' : 'accent-cyan-400'} />
                  {perm.replace(/_/g, ' ')}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const accentFrom = isPlatform ? 'from-red-400' : 'from-purple-400';
  const accentTo = isPlatform ? 'to-orange-500' : 'to-cyan-500';
  const btnGrad = isPlatform
    ? 'from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400'
    : 'from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400';

  return (
    <div className="p-4 md:p-10 relative overflow-y-auto h-full z-10 w-full overflow-x-hidden no-scrollbar">
      <div className={`absolute top-[-10%] left-[-10%] w-96 h-96 ${isPlatform ? 'bg-red-600/15' : 'bg-purple-600/20'} blur-[120px] rounded-full pointer-events-none`} />

      <div className="w-full relative z-10 space-y-8">
        <header>
          <h1 className={`text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${accentFrom} ${accentTo} tracking-tight`}>
            {isPlatform ? 'Platform Team' : 'Team Management'}
          </h1>
          <p className="text-gray-400 mt-2 text-sm md:text-base">
            {isPlatform
              ? 'Invite scoped Platform Admin staff. Master Super Admin retains unrestricted god-mode.'
              : 'Invite store staff and control granular workspace permissions.'}
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
          {/* Invite — 1 col */}
          <div className="xl:col-span-1 bg-white/[0.02] border border-white/10 p-6 md:p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl h-fit">
            <div className="flex items-center gap-3 mb-6">
              <UserPlus className={isPlatform ? 'text-red-400' : 'text-cyan-400'} size={22} />
              <h2 className="text-lg font-bold text-white">Invite Member</h2>
            </div>

            <form onSubmit={handleInvite} className="space-y-5">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 text-gray-500" size={18} />
                  <input type="text" required value={formData.userName} onChange={(e) => setFormData({ ...formData, userName: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 pl-11 rounded-xl text-white focus:outline-none focus:border-purple-400 text-sm" placeholder="Full name" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 text-gray-500" size={18} />
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 pl-11 rounded-xl text-white focus:outline-none focus:border-purple-400 text-sm" placeholder="email@company.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Role</label>
                <select value={formData.storeRole} onChange={(e) => applyRoleToForm(e.target.value, setFormData, formData)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white focus:outline-none focus:border-purple-400 text-sm">
                  {STORE_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#0A0F1A]">{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-3 flex items-center gap-2">
                  <Shield size={14} className={isPlatform ? 'text-red-400' : 'text-purple-400'} /> Permissions
                  {!isCustom && <span className="text-xs text-gray-600">(preset locked)</span>}
                </label>
                <PermissionMatrix values={formData.permissions} locked={!isCustom} onToggle={(p) => togglePermission(setFormData, formData, p, !isCustom)} />
              </div>
              <button type="submit" disabled={loading} className={`w-full bg-gradient-to-r ${btnGrad} py-3.5 rounded-xl font-bold text-white transition-all disabled:opacity-50 text-sm`}>
                {loading ? 'Sending...' : 'Send Invitation'}
              </button>
            </form>
          </div>

          {/* Directory — 2 cols */}
          <div className="xl:col-span-2 bg-white/[0.02] border border-white/10 p-6 md:p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <Users className={isPlatform ? 'text-orange-400' : 'text-purple-400'} size={22} />
                <h2 className="text-lg font-bold text-white">Staff Directory</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      statusFilter === tab.key
                        ? isPlatform
                          ? 'bg-red-500/20 border-red-500/40 text-red-300'
                          : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {listLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-cyan-400">
                <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                <p className="animate-pulse tracking-widest font-mono text-sm">LOADING TEAM</p>
              </div>
            ) : staff.length === 0 ? (
              <p className="text-gray-500 text-center py-16">No staff members in this filter.</p>
            ) : (
              <div className="w-full max-w-full overflow-x-auto no-scrollbar">
                <table className="w-full text-left min-w-[800px]">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 text-sm">
                      <th className="pb-3 pr-4 font-medium">Name</th>
                      <th className="pb-3 pr-4 font-medium">Email</th>
                      <th className="pb-3 pr-4 font-medium">Role</th>
                      <th className="pb-3 pr-4 font-medium">Permissions</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((member) => (
                      <tr key={member._id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-4 pr-4 text-white font-medium">{member.userName}</td>
                        <td className="py-4 pr-4 text-gray-400 text-sm">{member.email}</td>
                        <td className="py-4 pr-4 text-sm capitalize">{member.storeRole}</td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {(member.permissions || []).map((p) => (
                              <span key={p} className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${isPlatform ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'}`}>
                                {p.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-col gap-1">
                            {statusBadge(member)}
                            {member.isDeleted && member.deletedAt && (
                              <span className="text-[10px] text-gray-500">Purge in {getDaysLeft(member.deletedAt)}d</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <div className="inline-flex flex-wrap justify-end gap-2">
                            {!member.isDeleted && !member.isVerified && (
                              <button type="button" onClick={() => handleResend(member._id)} disabled={actionId === member._id} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-cyan-400 hover:bg-cyan-400/10 text-sm disabled:opacity-50">
                                <RefreshCcw size={14} /> Resend
                              </button>
                            )}
                            {!member.isDeleted && member.isVerified && (
                              <>
                                <button type="button" onClick={() => openEditModal(member)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-purple-300 hover:bg-purple-400/10 text-sm">
                                  <Pencil size={14} /> Edit
                                </button>
                                <button type="button" onClick={() => handleRevoke(member._id)} disabled={actionId === member._id} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-400/10 text-sm disabled:opacity-50">
                                  <Trash2 size={14} /> Revoke
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0A0F1A] border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button type="button" onClick={() => setEditTarget(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20} /></button>
            <h3 className="text-xl font-bold text-white mb-1">Edit Permissions</h3>
            <p className="text-sm text-gray-400 mb-6">{editTarget.userName} · {editTarget.email}</p>
            <form onSubmit={handleEditSave} className="space-y-5">
              <select value={editForm.storeRole} onChange={(e) => applyRoleToForm(e.target.value, setEditForm, editForm)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white">
                {STORE_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#0A0F1A]">{opt.label}</option>
                ))}
              </select>
              <PermissionMatrix values={editForm.permissions} locked={!editIsCustom} onToggle={(p) => togglePermission(setEditForm, editForm, p, !editIsCustom)} />
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditTarget(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300">Cancel</button>
                <button type="submit" disabled={editSaving} className={`flex-1 py-3 rounded-xl font-bold bg-gradient-to-r ${btnGrad} text-white disabled:opacity-50`}>
                  {editSaving ? 'Saving...' : 'Save & Force Re-login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
