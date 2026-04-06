import React, { useEffect, useState } from 'react';
import api from '../../Api';
import { Store, Ban, CheckCircle, Clock } from 'lucide-react';

export default function AdminStores() {
  const[stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const[storeFilter, setStoreFilter] = useState('all');

  useEffect(() => {
    fetchStores();
  },[]);

  const fetchStores = async () => {
    try {
      const res = await api.get('/admin/store/list');
      setStores(res.data.data ||[]);
    } catch (error) {
      console.error("Failed to fetch stores", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStoreStatus = async (storeId, currentStatus) => {
    if(!window.confirm(`Are you sure you want to ${currentStatus === 'live' ? 'SUSPEND' : 'ACTIVATE'} this store?`)) return;
    try {
      const newStatus = currentStatus === 'live' ? 'suspended' : 'live';
      await api.patch(`/admin/store/${storeId}/status`, { status: newStatus });
      setStores(stores.map(s => s._id === storeId ? { ...s, status: newStatus, isActive: newStatus === 'live' } : s));
    } catch (error) {
      alert("Failed to update store status");
    }
  };

  const getDaysLeft = (deletedAt) => {
    if (!deletedAt) return 0;
    const daysPassed = Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - daysPassed);
  };

  const filteredStores = stores.filter(s => {
    if (storeFilter === 'all') return true;
    if (storeFilter === 'deleted') return s.isDeleted;
    return s.status === storeFilter && !s.isDeleted;
  });

  if (loading) return <div className="p-10 text-red-400 animate-pulse">Loading platform stores...</div>;

  return (
    <div className="p-4 md:p-10 w-full animate-fade-in-down">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <Store className="text-red-500" /> Platform Stores
        </h1>
        
        {/* Dynamic Filter */}
        <select 
          value={storeFilter} 
          onChange={(e) => setStoreFilter(e.target.value)} 
          className="bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-400 text-sm w-full sm:w-auto cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="live">Live & Active</option>
          <option value="disabled">Owner Disabled</option>
          <option value="suspended">Admin Suspended</option>
          <option value="deleted">Soft Deleted (Trash)</option>
        </select>
      </div>

      <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-x-auto shadow-2xl">
        <table className="w-full text-left min-w-[700px]">
          <thead className="bg-black/40 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-5 font-medium">Store Data</th>
              <th className="p-5 font-medium">Platform</th>
              <th className="p-5 font-medium">Status</th>
              <th className="p-5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredStores.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-gray-500 italic">No stores match this filter.</td></tr>
            ) : null}
            
            {filteredStores.map(store => (
              <tr key={store._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-5">
                  <p className="font-bold text-white text-base">{store.storeName}</p>
                  <p className="text-xs text-gray-500 font-mono mt-1">ID: {store._id.substring(0,8)}...</p>
                </td>
                <td className="p-5">
                  <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-gray-300 capitalize">
                    {store.storeHosting}
                  </span>
                </td>
                <td className="p-5">
                  {store.isDeleted ? (
                    <span className="px-3 py-1 text-xs font-bold rounded-full border bg-gray-500/10 text-gray-400 border-gray-500/20 inline-flex items-center gap-1">
                      <Clock size={12}/> {getDaysLeft(store.deletedAt)} days left
                    </span>
                  ) : (
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border uppercase tracking-wider ${
                      store.status === 'live' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                      store.status === 'suspended' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                      'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    }`}>
                      {store.status}
                    </span>
                  )}
                </td>
                <td className="p-5 text-right">
                  {!store.isDeleted && (
                    <button 
                      onClick={() => toggleStoreStatus(store._id, store.status)} 
                      className={`px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-all ${
                        store.status === 'live' 
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30' 
                          : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30'
                      }`}
                    >
                      {store.status === 'live' ? <Ban size={14}/> : <CheckCircle size={14}/>} 
                      {store.status === 'live' ? 'Suspend Store' : 'Lift Suspension'}
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