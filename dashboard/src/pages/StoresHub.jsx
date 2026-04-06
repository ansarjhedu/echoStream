import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../Api';
import { useAuth } from '../context/AuthContext';
import { Store, Plus, Server, ShoppingCart, ChevronRight, X, AlertCircle,LogOut } from 'lucide-react';

export default function StoresHub() {
  const [stores, setStores] = useState([]);
  const[loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ storeName: '', storeType: 'ecommerce', storeHosting: 'shopify' });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { user, setActiveStore ,logout} = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStores();
  },[]);

  const fetchStores = async () => {
    try {
      const res = await api.get('/store/mystores');
      setStores(res.data.data ||[]);
    } catch (error) {
      console.error("Failed to fetch stores", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    try {
      const res = await api.post('/store/create', formData);
      setStores([res.data.data, ...stores]);
      setIsModalOpen(false);
      setFormData({ storeName: '', storeType: 'ecommerce' });
    } catch (err) {
      setError(err.response?.data || "Failed to create store");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleStoreClick = (store) => {
    setActiveStore(store);  // Set the active store in context
    navigate('/workspace/analytics');  // Navigate to workspace
  };

  return (
    <div className="min-h-screen bg-[#0A0F1A] text-white p-4 md:p-12 relative overflow-y-auto selection:bg-cyan-500/30 overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tight mb-2">
              Welcome, {user?.userName}
            </h1>
            <p className="text-gray-400 text-sm md:text-base">
              {user?.role === 'admin' ? "You are logged in as a Super Admin." : "Select a store to manage its reviews and integrations."}
            </p>
          </div>
          
          {user?.role === 'admin' ? (
             <button onClick={() => navigate('/hub/admin')} className="flex items-center gap-2 bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 px-6 py-3 rounded-xl font-bold transition-all">
               Go to Admin Portal
             </button>
          ) : (
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              <Plus size={20} /> Initialize New Store
            </button>
          )}
        </header>
        {loading ? (
          <div className="text-cyan-400 animate-pulse flex items-center gap-3"><Store /> Fetching your stores...</div>
        ) : stores.length === 0 ? (
          <div className="text-center bg-white/[0.02] border border-white/10 p-10 md:p-16 rounded-[2rem] backdrop-blur-xl shadow-xl">
            <Store size={64} className="mx-auto mb-6 text-gray-600" />
            <h2 className="text-2xl font-bold mb-2">No Stores Found</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto text-sm md:text-base">You haven't initialized any stores yet. Create one to generate your unique API key and start collecting reviews.</p>
            <button onClick={() => setIsModalOpen(true)} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-8 py-3 rounded-xl font-bold transition-all">
              Create First Store
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {stores.map(store => (
              <div 
                key={store._id} 
                onClick={() => handleStoreClick(store)}
                className="group cursor-pointer bg-white/[0.02] border border-white/10 p-5 md:p-6 rounded-2xl backdrop-blur-xl hover:bg-white/[0.05] hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)] transition-all duration-300 flex flex-col justify-between h-48"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 group-hover:border-cyan-500/50 transition-colors">
                      <ShoppingCart className="text-cyan-400 w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <span className={`px-3 py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-full border ${store.isActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {store.status}
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                    {store.storeName}
                  </h3>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs md:text-sm text-gray-400 capitalize">
                    <Server size={14} /> {store.storeType}
                  </div>
                  <ChevronRight className="text-gray-600 group-hover:text-cyan-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE STORE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0F1A] border border-white/10 p-6 md:p-8 rounded-2xl w-full max-w-md shadow-2xl relative animate-fade-in-down">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Initialize New Store</h2>
            
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 flex items-start gap-2 text-red-400 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

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

              
              <button type="submit" disabled={submitLoading} className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 py-3 rounded-xl font-bold text-white shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all disabled:opacity-50 mt-2 text-sm md:text-base">
                {submitLoading ? 'Deploying...' : 'Create Store'}
              </button>
            </form>
          </div>
        </div>
      )}
     
    </div>
  );
}