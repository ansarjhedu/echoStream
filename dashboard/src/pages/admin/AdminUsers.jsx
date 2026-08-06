import React, { useEffect, useState, useMemo } from 'react';
import api from '../../Api';
import { User, Trash2, Clock, RefreshCcw, AlertOctagon, LifeBuoy, Store, LayoutTemplate } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { isMasterAdmin } from '../../utils/permissionHelpers';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All users' },
  { value: 'active', label: 'Live & active' },
  { value: 'deleted', label: 'Soft deleted' },
  { value: 'top_widgets', label: 'Top by active widgets' },
];

export default function AdminUsers() {
  const { user } = useAuth();
  const master = isMasterAdmin(user);
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState('all');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const settled = await Promise.allSettled([
        api.get('/admin/user/list'),
        api.get('/admin/store/list'),
        api.get('/admin/disputes'),
        api.get('/admin/support/list'),
      ]);
      const [userRes, storeRes, dispRes, ticketRes] = settled;
      if (userRes.status === 'fulfilled') setUsers(userRes.value.data.data || []);
      else toast.error('Failed to fetch users');
      if (storeRes.status === 'fulfilled') {
        setStores(storeRes.value.data?.storesWithOwner || storeRes.value.data?.data || []);
      }
      if (dispRes.status === 'fulfilled') setDisputes(dispRes.value.data?.data || []);
      if (ticketRes.status === 'fulfilled') setTickets(ticketRes.value.data?.data || []);
    } catch {
      toast.error('Failed to fetch platform data');
    } finally {
      setLoading(false); 
    }
  };

  const enrichedUsers = useMemo(() => {
    const mappedUsers = users.map((u) => {
      const userId = String(u._id);

      const userStores = stores.filter((s) => {
        const sOwner = s.owner?._id ? String(s.owner._id) : String(s.owner);
        return sOwner === userId;
      });

      // Each live workspace = one deployable widget embed
      const activeWidgets = userStores.filter(
        (s) => s.isActive && !s.isDeleted && s.status === 'live'
      ).length;
      const totalStores = userStores.length;

      const userTicketsCount = tickets.filter((t) => {
        const tOwner = t.owner?._id ? String(t.owner._id) : String(t.owner);
        return tOwner === userId && t.status !== 'resolved';
      }).length;

      const storeIds = userStores.map((s) => String(s._id));
      const userDisputesCount = disputes.filter((d) => {
        const dStore = d.store?._id ? String(d.store._id) : String(d.store);
        return storeIds.includes(dStore) && d.status === 'disputed';
      }).length;

      return {
        ...u,
        totalStores,
        activeWidgets,
        openTickets: userTicketsCount,
        pendingDisputes: userDisputesCount,
      };
    });

    // Newest accounts first (backend also sorts createdAt:-1)
    return mappedUsers.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [users, stores, tickets, disputes]);

  const filteredUsers = useMemo(() => {
    let list = enrichedUsers.filter((u) => {
      if (userFilter === 'deleted') return u.isDeleted;
      if (userFilter === 'active') return !u.isDeleted && u.isActive;
      if (userFilter === 'top_widgets') return !u.isDeleted && u.activeWidgets > 0;
      return true; // all
    });

    if (userFilter === 'top_widgets') {
      list = [...list].sort((a, b) => {
        if (b.activeWidgets !== a.activeWidgets) return b.activeWidgets - a.activeWidgets;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    return list;
  }, [enrichedUsers, userFilter]);

  const deleteUserAction = async (userId) => {
    if (!master) return toast.error('Only the Master Super Admin can delete users.');
    if (!window.confirm('Soft-delete this user and all their stores? (30-day countdown begins)')) return;
    try {
      await api.patch(`/admin/user/${userId}`);
      setUsers(users.map((u) => (u._id === userId ? { ...u, isDeleted: true, deletedAt: Date.now() } : u)));
      toast.success('User soft-deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const restoreUserAction = async (userId) => {
    if (!master) return toast.error('Only the Master Super Admin can restore users.');
    if (!window.confirm('Restore this user and reactivate their stores?')) return;
    try {
      await api.patch(`/admin/user/${userId}/restore`);
      setUsers(users.map((u) => (u._id === userId ? { ...u, isDeleted: false, deletedAt: null } : u)));
      toast.success('User Restored!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to restore user');
    }
  };

  const getDaysLeft = (deletedAt) => {
    if (!deletedAt) return 0;
    const daysPassed = Math.floor(
      (Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, 30 - daysPassed);
  };

  if (loading) return <div className="p-10 text-red-400 animate-pulse">Loading registered users...</div>;

  return (
    <div className="p-4 md:p-10 w-full animate-fade-in-down">
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3 mb-2">
            <User className="text-red-500" /> Registered Users
          </h1>
          <p className="text-gray-400">
            Newest accounts first. Filter by status or top widget operators.
          </p>
        </div>

        <label className="flex flex-col gap-1.5 w-full sm:w-64">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Filter</span>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full appearance-none bg-[#0A0F1A] border border-white/10 hover:border-red-500/40 focus:border-red-400 rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-red-400/40 cursor-pointer transition-colors"
            style={{ colorScheme: 'dark' }}
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#0A0F1A] text-gray-100">
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-x-auto shadow-2xl custom-scrollbar">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-black/40 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-5 font-medium">User Details & Metrics</th>
              <th className="p-5 font-medium">Account Status</th>
              <th className="p-5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="3" className="p-8 text-center text-gray-500 italic">
                  No users match this filter.
                </td>
              </tr>
            ) : null}

            {filteredUsers.map((u) => (
              <tr key={u._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0 mt-1">
                      {u.profilePic ? (
                        <img
                          src={u.profilePic}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover border border-white/15"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-300 font-bold text-lg">
                          {u.userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col w-full min-w-0">
                      <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                        <span
                          className={`font-bold text-lg ${u.isDeleted ? 'text-gray-500 line-through' : 'text-white'}`}
                        >
                          {u.userName}
                        </span>
                        <span className="text-sm text-gray-500 truncate">{u.email}</span>
                        {u.role === 'admin' && (
                          <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] uppercase font-bold rounded-full">
                            Platform Admin
                          </span>
                        )}
                      </div>

                      {u.role !== 'admin' && (
                        <div className="flex items-center gap-4 md:gap-6 bg-black/20 w-fit px-4 py-2 rounded-lg border border-white/5 mt-1 flex-wrap">
                          <div className="flex items-center gap-2">
                            <LayoutTemplate size={14} className="text-gray-500" />
                            <span className="text-xs text-gray-400 hidden sm:inline">Widgets:</span>
                            <span className="text-sm font-bold text-cyan-400">{u.activeWidgets}</span>
                          </div>

                          <div className="w-px h-4 bg-white/10 hidden sm:block" />

                          <div className="flex items-center gap-2">
                            <Store size={14} className="text-gray-500" />
                            <span className="text-xs text-gray-400 hidden sm:inline">Stores:</span>
                            <span className="text-sm font-bold text-gray-300">{u.totalStores}</span>
                          </div>

                          <div className="w-px h-4 bg-white/10 hidden sm:block" />

                          <div className="flex items-center gap-2">
                            <LifeBuoy size={14} className="text-gray-500" />
                            <span className="text-xs text-gray-400 hidden sm:inline">Tickets:</span>
                            <span
                              className={`text-sm font-bold ${u.openTickets > 0 ? 'text-yellow-400' : 'text-gray-500'}`}
                            >
                              {u.openTickets}
                            </span>
                          </div>

                          <div className="w-px h-4 bg-white/10 hidden sm:block" />

                          <div className="flex items-center gap-2">
                            <AlertOctagon size={14} className="text-gray-500" />
                            <span className="text-xs text-gray-400 hidden sm:inline">Disputes:</span>
                            <span
                              className={`text-sm font-bold ${u.pendingDisputes > 0 ? 'text-red-400' : 'text-gray-500'}`}
                            >
                              {u.pendingDisputes}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                <td className="p-5 align-middle">
                  {u.isDeleted ? (
                    <div className="flex flex-col gap-1 items-start">
                      <span className="px-3 py-1 text-xs font-bold rounded-full border bg-red-500/10 text-red-400 border-red-500/20">
                        DELETED
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={12} /> {getDaysLeft(u.deletedAt)} days until purge
                      </span>
                    </div>
                  ) : (
                    <span className="px-3 py-1 text-xs font-bold rounded-full border bg-green-500/10 text-green-400 border-green-500/20">
                      ACTIVE
                    </span>
                  )}
                </td>

                <td className="p-5 text-right align-middle">
                  {!master ? (
                    <span className="text-xs text-gray-500 italic">View only</span>
                  ) : u.isDeleted ? (
                    <button
                      onClick={() => restoreUserAction(u._id)}
                      className="px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/30 rounded-lg border border-green-500/30 transition-all inline-flex items-center gap-2 text-xs font-bold"
                    >
                      <RefreshCcw size={14} /> Restore
                    </button>
                  ) : u.role !== 'admin' ? (
                    <button
                      onClick={() => deleteUserAction(u._id)}
                      className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/30 rounded-lg border border-red-500/30 transition-all inline-flex items-center gap-2 text-xs font-bold"
                    >
                      <Trash2 size={14} /> Soft Delete
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500 font-bold uppercase">Protected</span>
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
