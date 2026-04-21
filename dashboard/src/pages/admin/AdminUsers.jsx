import React, { useEffect, useState, useMemo } from 'react';
import api from '../../Api';
import { User, Trash2, Clock, RefreshCcw, Crown, AlertOctagon, LifeBuoy, Store } from 'lucide-react';
import { toast } from 'react-toastify';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState('all');

  useEffect(() => {
    fetchAllData();
  },[]);

  const fetchAllData = async () => {
    try {
      const [userRes, storeRes, dispRes, ticketRes] = await Promise.all([
        api.get('/admin/user/list'),
        api.get('/admin/store/list'),
        api.get('/admin/disputes'),
        api.get('/admin/support/list')
      ]);
      setUsers(userRes.data.data ||[]);
      setStores(storeRes.data?.storesWithOwner || storeRes.data?.data ||[]);
      setDisputes(dispRes.data?.data || []);
      setTickets(ticketRes.data?.data ||[]);
    } catch (error) {
      toast.error("Failed to fetch platform data");
    } finally {
      setLoading(false);
    }
  };

  // 🧠 ENRICH USERS WITH METRICS & RANKS
  const enrichedUsers = useMemo(() => {
    // 1. Calculate store counts to find the top users
    const storeCounts = {};
    stores.forEach(s => { storeCounts[s.owner] = (storeCounts[s.owner] || 0) + 1; });
    
    // Sort all owners to determine top 3 ranks
    const rankedOwners = Object.keys(storeCounts).sort((a, b) => storeCounts[b] - storeCounts[a]);
    const top3 = rankedOwners.slice(0, 3);

    return users.map(u => {
      const userStores = stores.filter(s => s.owner === u._id);
      const activeStoresCount = userStores.filter(s => s.isActive).length;
      
      const userTicketsCount = tickets.filter(t => t.owner === u._id && t.status !== 'resolved').length;
      
      // Check if disputes belong to this user's stores
      const storeIds = userStores.map(s => s._id);
      const userDisputesCount = disputes.filter(d => storeIds.includes(d.store?._id || d.store)).length;

      // Assign Rank (1, 2, 3, or null)
      let rank = null;
      if (top3.includes(u._id) && storeCounts[u._id] > 0) {
        rank = top3.indexOf(u._id) + 1;
      }

      return {
        ...u,
        totalStores: userStores.length,
        activeStores: activeStoresCount,
        openTickets: userTicketsCount,
        pendingDisputes: userDisputesCount,
        rank
      };
    });
  }, [users, stores, tickets, disputes]);

  const deleteUserAction = async (userId) => {
    if(!window.confirm("Soft-delete this user and all their stores? (30-day countdown begins)")) return;
    try {
      await api.delete(`/admin/user/${userId}`);
      setUsers(users.map(u => u._id === userId ? { ...u, isDeleted: true, deletedAt: Date.now() } : u));
      toast.success("User soft-deleted");
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const restoreUserAction = async (userId) => {
    if(!window.confirm("Restore this user and reactivate their stores?")) return;
    try {
      await api.patch(`/admin/user/${userId}/restore`);
      setUsers(users.map(u => u._id === userId ? { ...u, isDeleted: false, deletedAt: null } : u));
      toast.success("User Restored!");
    } catch (error) {
      toast.error("Failed to restore user");
    }
  };

  const getDaysLeft = (deletedAt) => {
    if (!deletedAt) return 0;
    const daysPassed = Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - daysPassed);
  };

  const filteredUsers = enrichedUsers.filter(u => {
    if (userFilter === 'all') return true;
    if (userFilter === 'deleted') return u.isDeleted;
    if (userFilter === 'active') return !u.isDeleted && u.isActive;
    return u.status === userFilter && !u.isDeleted;
  });

  if (loading) return <div className="p-10 text-red-400 animate-pulse">Loading registered users...</div>;

  return (
    <div className="p-4 md:p-10 w-full animate-fade-in-down">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3 mb-2">
          <User className="text-red-500" /> Registered Users
        </h1>
        <p className="text-gray-400">Manage user accounts, monitor workload, and handle retention.</p>
      </div>
      
      <select 
        value={userFilter} 
        onChange={(e) => setUserFilter(e.target.value)} 
        className="bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-400 text-sm w-full sm:w-auto cursor-pointer mb-6"
      >
        <option value="all">All Statuses</option>
        <option value="active">Live & Active</option>
        <option value="deleted">Soft Deleted (Trash)</option>
      </select>

      <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-x-auto shadow-2xl custom-scrollbar">
        <table className="w-full text-left min-w-[900px]">
          <thead className="bg-black/40 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-5 font-medium">User Profile</th>
              <th className="p-5 font-medium">Platform Metrics</th>
              <th className="p-5 font-medium">Account Status</th>
              <th className="p-5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredUsers.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-gray-500 italic">No users match this filter.</td></tr>
            ) : null}
            
            {filteredUsers.map(u => (
              <tr key={u._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                
                {/* 1. PROFILE CELL */}
                <td className="p-5 flex items-center gap-4">
                  <div className="relative">
                    {u.profilePic ? (
                      <img src={u.profilePic} alt="avatar" className="w-12 h-12 rounded-full object-cover border border-purple-500/50" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400 font-bold text-lg">
                        {u.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Crown Badge for Top 3 */}
                    {u.rank && (
                      <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center border shadow-lg ${u.rank === 1 ? 'bg-yellow-500 text-black border-yellow-300' : u.rank === 2 ? 'bg-gray-300 text-black border-white' : 'bg-orange-500 text-black border-orange-300'}`}>
                        <Crown size={12} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className={`font-bold text-base ${u.isDeleted ? 'text-gray-500 line-through' : 'text-white'}`}>{u.userName}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                </td>
                
                {/* 2. METRICS CELL (The "High Maintenance" Check) */}
                <td className="p-5">
                  <div className="flex gap-4">
                    <div className="flex flex-col">
                      <span className="text-gray-500 text-[10px] uppercase font-bold flex items-center gap-1"><Store size={10}/> Stores</span>
                      <span className="font-bold text-cyan-400">{u.activeStores} Active <span className="text-gray-600 text-xs font-normal">/ {u.totalStores}</span></span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500 text-[10px] uppercase font-bold flex items-center gap-1"><LifeBuoy size={10}/> Tickets</span>
                      <span className={`font-bold ${u.openTickets > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>{u.openTickets} Open</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500 text-[10px] uppercase font-bold flex items-center gap-1"><AlertOctagon size={10}/> Disputes</span>
                      <span className={`font-bold ${u.pendingDisputes > 0 ? 'text-red-400' : 'text-gray-500'}`}>{u.pendingDisputes} Pending</span>
                    </div>
                  </div>
                </td>

                {/* 3. STATUS CELL */}
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

                {/* 4. ACTIONS CELL */}
                <td className="p-5 text-right">
                  {u.isDeleted ? (
                    <button onClick={() => restoreUserAction(u._id)} className="px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/30 rounded-lg border border-green-500/30 transition-all inline-flex items-center gap-2 text-xs font-bold">
                      <RefreshCcw size={14} /> Restore User
                    </button>
                  ) : u.role !== 'admin' && ( // Protect Admins from being deleted here!
                    <button onClick={() => deleteUserAction(u._id)} className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/30 rounded-lg border border-red-500/30 transition-all inline-flex items-center gap-2 text-xs font-bold">
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