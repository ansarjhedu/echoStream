import React, { useEffect, useState } from 'react';
import api from '../../Api';
import { User, Trash2, Clock } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  },[]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/user/list');
      setUsers(res.data.data ||[]);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteUserAction = async (userId) => {
    if(!window.confirm("Soft-delete this user and all their stores? (30-day countdown begins)")) return;
    try {
      await api.delete(`/admin/user/${userId}`);
      setUsers(users.map(u => u._id === userId ? { ...u, isDeleted: true, deletedAt: Date.now() } : u));
    } catch (error) {
      alert("Failed to delete user");
    }
  };

  const getDaysLeft = (deletedAt) => {
    if (!deletedAt) return 0;
    const daysPassed = Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - daysPassed);
  };

  if (loading) return <div className="p-10 text-red-400 animate-pulse">Loading registered users...</div>;

  return (
    <div className="p-4 md:p-10 w-full animate-fade-in-down">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3 mb-2">
          <User className="text-red-500" /> Registered Users
        </h1>
        <p className="text-gray-400">Manage user accounts and data retention policies.</p>
      </div>

      <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-x-auto shadow-2xl">
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
            {users.map(u => (
              <tr key={u._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-5 flex items-center gap-3">
                  {u.profilePic ? (
                    <img src={u.profilePic} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-purple-500/50" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400 font-bold text-lg">
                      {u.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-bold text-white text-base">{u.userName}</span>
                </td>
                <td className="p-5 text-gray-400">{u.email}</td>
                <td className="p-5">
                  {u.isDeleted ? (
                    <span className="px-3 py-1 text-xs font-bold rounded-full border bg-gray-500/10 text-gray-400 border-gray-500/20 inline-flex items-center gap-1">
                      <Clock size={12}/> {getDaysLeft(u.deletedAt)} days left
                    </span>
                  ) : (
                    <span className="px-3 py-1 text-xs font-bold rounded-full border bg-green-500/10 text-green-400 border-green-500/20">
                      ACTIVE
                    </span>
                  )}
                </td>
                <td className="p-5 text-right">
                  {!u.isDeleted && (
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
            {users.length === 0 && (
              <tr><td colSpan="4" className="p-8 text-center text-gray-500">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}