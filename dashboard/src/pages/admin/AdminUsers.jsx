import React, { useEffect, useState } from 'react';
import api from '../../Api';
import { toast } from 'react-toastify';
import { User, Trash2, Clock, RefreshCcw } from 'lucide-react'; // <-- Added RefreshCcw icon

export default function AdminUsers() {
  const[users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const[userFilter, setUserFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
  },[]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/user/list');
      setUsers(res.data.data ||[]);
    } catch (error) {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const deleteUserAction = async (userId) => {
    if(!window.confirm("Soft-delete this user and all their stores? (30-day countdown begins)")) return;
    try {
      await api.patch(`/admin/user/${userId}`);
      setUsers(users.map(u => u._id === userId ? { ...u, isDeleted: true, deletedAt: Date.now() } : u));
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  // 🚨 NEW: Restore User Action
  const restoreUserAction = async (userId) => {
    if(!window.confirm("Restore this user and reactivate their stores?")) return;
    try {
      await api.patch(`/admin/user/${userId}/restore`);
      setUsers(users.map(u => u._id === userId ? { ...u, isDeleted: false, deletedAt: null } : u));
    } catch (error) {
      toast.error("Failed to restore user");
    }
  };

  const getDaysLeft = (deletedAt) => {
    if (!deletedAt) return 0;
    const daysPassed = Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - daysPassed);
  };

  const filteredUsers = users.filter(u => {
    if (userFilter === 'all') return true;
    if (userFilter === 'deleted') return u.isDeleted;
    if (userFilter === 'active') return !u.isDeleted && u.isActive;
    return u.status === userFilter && !u.isDeleted;
  });

  if (loading) return <div className="p-10 text-red-400 animate-pulse">Loading registered users...</div>;

  return (
    // FIX: Added overflow-hidden to prevent full page horizontal scroll
    <div className="p-4 md:p-10 w-full animate-fade-in-down overflow-hidden">
      
      {/* ALIGNED HEADER AND FILTER (Matches AdminStores.jsx) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3 mb-2">
            <User className="text-red-500" /> Registered Users
          </h1>
          <p className="text-gray-400">Manage user accounts and data retention policies.</p>
        </div>
        
        <select 
          value={userFilter} 
          onChange={(e) => setUserFilter(e.target.value)} 
          className="bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-400 text-sm w-full sm:w-auto cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="active">Live & Active</option>
          <option value="deleted">Soft Deleted (Trash)</option>
        </select>
      </div>

      <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-x-auto shadow-2xl max-w-full custom-scrollbar">
        <table className="w-full text-left min-w-[700px]">
          <thead className="bg-black/40 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-5 font-medium">User Profile</th>
              <th className="p-5 font-medium">Email</th>
              <th className="p-5 font-medium">Account Status</th>
              <th className="p-5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredUsers.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-gray-500 italic">No users match this filter.</td></tr>
            ) : null}
            
            {filteredUsers.map(u => (
              <tr key={u._id} className={`border-b border-white/5 transition-colors ${u.isDeleted ? 'bg-red-900/10' : 'hover:bg-white/5'}`}>
                <td className="p-5 flex items-center gap-3">
                  {u.profilePic ? (
                    <img src={u.profilePic} alt="avatar" className={`w-10 h-10 rounded-full object-cover border ${u.isDeleted ? 'border-red-500/50 opacity-50 grayscale' : 'border-purple-500/50'}`} />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border ${u.isDeleted ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-purple-500/20 text-purple-400 border-purple-500/50'}`}>
                      {u.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Strikethrough for deleted users */}
                  <span className={`font-bold text-base ${u.isDeleted ? 'text-gray-500 line-through' : 'text-white'}`}>{u.userName}</span>
                </td>
                <td className={`p-5 ${u.isDeleted ? 'text-gray-600' : 'text-gray-400'}`}>{u.email}</td>
                <td className="p-5">
                  {u.isDeleted ? (
                    <div className="flex flex-col gap-1 items-start">
                      <span className="px-3 py-1 text-xs font-bold rounded-full border bg-red-500/10 text-red-400 border-red-500/20">DELETED</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12}/> {getDaysLeft(u.deletedAt)} days until purge</span>
                    </div>
                  ) : (
                    <span className="px-3 py-1 text-xs font-bold rounded-full border bg-green-500/10 text-green-400 border-green-500/20">
                      ACTIVE
                    </span>
                  )}
                </td>
                <td className="p-5 text-right">
                  {u.isDeleted ? (
                    // NEW: Restore Button for deleted users!
                    <button 
                      onClick={() => restoreUserAction(u._id)} 
                      className="p-2 px-4 bg-green-500/10 text-green-400 hover:bg-green-500/30 rounded-lg border border-green-500/30 transition-all inline-flex items-center gap-2 text-xs font-bold"
                    >
                      <RefreshCcw size={14} /> Restore User
                    </button>
                  ) : (
                    // Existing: Soft Delete button for active users
                    <button 
                      onClick={() => deleteUserAction(u._id)} 
                      className="p-2 px-4 bg-red-500/10 text-red-400 hover:bg-red-500/30 rounded-lg border border-red-500/30 transition-all inline-flex items-center gap-2 text-xs font-bold"
                    >
                      <Trash2 size={14} /> Soft Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}