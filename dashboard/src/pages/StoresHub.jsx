import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../Api';
import { useAuth } from '../context/AuthContext';
import { 
  Store, Plus, Server, ShoppingCart, ChevronRight, 
  X, AlertCircle, Ban, CheckCircle, Trash, Clock, Lock 
} from 'lucide-react';

export default function StoresHub() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const[isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ storeName: '', storeType: 'ecommerce' }); // Removed hosting
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { user, setActiveStore } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchStores(); },[]);

  const fetchStores = async () => {
    try {
      const res = await api.get('/store/mystores');
      setStores(res.data.data ||[]);
    } catch (error) { console.error("Failed to fetch stores", error); } 
    finally { setLoading(false); }
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setSubmitLoading(true); setError('');
    try {
      const res = await api.post('/store/create', formData);
      setStores([res.data.data, ...stores]);
      setIsModalOpen(false);
      setFormData({ storeName: '', storeType: 'ecommerce' });
    } catch (err) { setError(err.response?.data || "Failed to create store"); } 
    finally { setSubmitLoading(false); }
  };

  const updateStoreApi = async (storeId, payload) => {
    try {
      const res = await api.patch(`/store/${storeId}/status`, payload);
      setStores(stores.map(s => s._id === storeId ? res.data.data : s));
    } catch (error) { alert(error.response?.data || "Failed to update store status"); }
  };

  const handleToggleStatus = (e, store) => {
    e.stopPropagation(); 
    if(!window.confirm(`Are you sure you want to ${store.status === 'live' ? 'DISABLE' : 'ACTIVATE'} this store?`)) return;
    updateStoreApi(store._id, { status: store.status === 'live' ? 'disabled' : 'live', isDeleted: false });
  };

  const handleDelete = (e, store) => {
    e.stopPropagation();
    if(!window.confirm("Soft delete this store? It will stop working and be permanently removed in 30 days.")) return;
    updateStoreApi(store._id, { status: 'deleted', isDeleted: true });
  };

  const handleLockedRestoreRequest = (e, store) => {
    e.stopPropagation();
    let reason = "marked for deletion";
    if (store.status === "suspended") reason = "suspended by a Platform Administrator";
    if (store.status === "disputed") reason = "currently locked due to an active dispute";
    alert(`🔒 RESTORE LOCKED\n\nThis store is ${reason}. \n\nYou must contact platform support to request restoration or resolve this issue.`);
  };

  const handleStoreClick = (store) => {
    if (store.isDeleted ||["suspended", "disputed"].includes(store.status)) {
      alert(`Store is currently locked (${store.isDeleted ? 'deleted' : store.status}). You cannot access the workspace.`);
      return;
    }
    setActiveStore(store);  
    navigate('/workspace/analytics/overview');  // Updated route
  };

  const getDaysLeft = (deletedAt) => {
    if (!deletedAt) return 0;
    const daysPassed = Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - daysPassed);
  };

  return (
    <div className="min-h-screen bg-[#0A0F1A] text-white p-4 md:p-12 relative overflow-y-auto selection:bg-cyan-500/30 overflow-hidden w-full">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tight mb-2">Welcome, {user?.userName}</h1>
            <p className="text-gray-400 text-sm md:text-base">{user?.role === 'admin' ? "You are logged in as a Super Admin." : "Select a store to manage its reviews and integrations."}</p>
          </div>
          {user?.role === 'admin' ? (
             <button onClick={() => navigate('/hub/admin/overview')} className="flex items-center gap-2 bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 px-6 py-3 rounded-xl font-bold transition-all">Go to Admin Portal</button>
          ) : (
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)]"><Plus size={20} /> Initialize New Store</button>
          )}
        </header>

        {loading ? (
          <div className="text-cyan-400 animate-pulse flex items-center gap-3"><Store /> Fetching your stores...</div>
        ) : stores.length === 0 ? (
          <div className="text-center bg-white/[0.02] border border-white/10 p-10 md:p-16 rounded-[2rem] backdrop-blur-xl shadow-xl animate-fade-in-down">
            <Store size={64} className="mx-auto mb-6 text-gray-600" />
            <h2 className="text-2xl font-bold mb-2">No Stores Found</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto text-sm md:text-base">You haven't initialized any stores yet. Create one to generate your unique API key and start collecting reviews.</p>
            <button onClick={() => setIsModalOpen(true)} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-8 py-3 rounded-xl font-bold transition-all">Create First Store</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {stores.map(store => {
              const isLocked = store.isDeleted || ["suspended", "disputed"].includes(store.status);
              return (
                <div key={store._id} className={`group bg-white/[0.02] border border-white/10 p-5 md:p-6 rounded-2xl backdrop-blur-xl transition-all duration-300 flex flex-col justify-between min-h-[260px] ${isLocked ? 'opacity-75 grayscale-[30%]' : 'hover:bg-white/[0.05] hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)] cursor-pointer'}`}>
                  <div onClick={() => handleStoreClick(store)}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 group-hover:border-cyan-500/50 transition-colors">
                        <ShoppingCart className="text-cyan-400 w-6 h-6" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {store.isDeleted ? (
                          <span className="px-3 py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-full border bg-red-500/10 text-red-400 border-red-500/20 flex items-center gap-1"><Clock size={12}/> {getDaysLeft(store.deletedAt)} Days Left</span>
                        ) : ["suspended", "disputed"].includes(store.status) ? (
                          <span className="px-3 py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-full border bg-orange-500/10 text-orange-400 border-orange-500/20 flex items-center gap-1"><Lock size={12}/> {store.status}</span>
                        ) : (
                          <span className={`px-3 py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-full border ${store.status === 'live' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>{store.status}</span>
                        )}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors truncate">{store.storeName}</h3>
                    <div className="flex justify-between items-center pt-2 mt-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400 capitalize">
                        <Server size={14} /> {store.storeType} {/* Updated to storeType */}
                      </div>
                      {!isLocked && <ChevronRight className="text-gray-600 group-hover:text-cyan-400 transition-colors" />}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-2 mt-auto">
                    {isLocked ? (
                      <button onClick={(e) => handleLockedRestoreRequest(e, store)} className="w-full px-4 py-2.5 rounded-lg text-xs font-bold inline-flex justify-center items-center gap-2 transition-all bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 border border-gray-500/30"><Lock size={14} /> Request Restore</button>
                    ) : (
                      <>
                        <button onClick={(e) => handleToggleStatus(e, store)} className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-bold inline-flex justify-center items-center gap-2 transition-all ${store.status === 'live' ? 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 border border-gray-500/30' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30'}`}>
                          {store.status === 'live' ? <Ban size={14}/> : <CheckCircle size={14}/>} {store.status === 'live' ? 'Disable' : 'Go Live'}
                        </button>
                        <button onClick={(e) => handleDelete(e, store)} className="px-3 py-2.5 rounded-lg text-xs font-bold inline-flex justify-center items-center gap-2 transition-all bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"><Trash size={14}/> Trash</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE STORE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0F1A] border border-white/10 p-6 md:p-8 rounded-2xl w-full max-w-md shadow-2xl relative animate-fade-in-down">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Initialize New Store</h2>
            {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 flex items-start gap-2 text-red-400 text-sm"><AlertCircle size={16} className="mt-0.5 shrink-0" /><p>{error}</p></div>}
            <form onSubmit={handleCreateStore} className="space-y-4 md:space-y-5">
              <div>
                <label className="block text-xs md:text-sm text-gray-400 mb-2">Store Name</label>
                <input type="text" required value={formData.storeName} onChange={(e) => setFormData({...formData, storeName: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 md:py-3 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-sm md:text-base" placeholder="e.g. CyberTech Gadgets" />
              </div>
              <div>
                <label className="block text-xs md:text-sm text-gray-400 mb-2">Store Type</label>
                <select value={formData.storeType} onChange={(e) => setFormData({...formData, storeType: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 md:py-3 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all appearance-none text-sm md:text-base">
                  <option value="ecommerce">eCommerce</option>
                  <option value="blog">Blog / Content</option>
                  <option value="portfolio">Portfolio</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button type="submit" disabled={submitLoading} className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 py-3 rounded-xl font-bold text-white shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all disabled:opacity-50 mt-2 text-sm md:text-base">{submitLoading ? 'Deploying...' : 'Create Store'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}