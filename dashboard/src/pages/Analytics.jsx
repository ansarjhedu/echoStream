import React, { useEffect, useState } from 'react';
import api from '../Api';
import { useAuth } from '../context/AuthContext';
import { BarChart3, Package, Activity, ChevronRight } from 'lucide-react';

// Import our new clean components!
import StoreOverview from '../components/analytics/StoreOverview';
import ProductPerformance from '../components/analytics/ProductPerformance';

export default function Analytics() {
  const { activeStore } = useAuth();
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('overview'); 

  useEffect(() => {
    if (activeStore) fetchData();
  },[activeStore]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, revRes] = await Promise.all([
        api.get(`/store/${activeStore._id}/products`),
        api.get(`/store/${activeStore._id}/reviews`)
      ]);
      setProducts(prodRes.data.data || []);
      setReviews(revRes.data ||[]); 
    } catch (error) {
      console.error("Analytics fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-10 lg:p-14 relative overflow-y-auto h-full z-10 w-full flex flex-col ">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="text-cyan-400" size={32} />
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tight">
              Store Analytics
            </h1>
          </div>
          <p className="text-gray-400">Actionable insights for <strong className="text-cyan-400">{activeStore?.storeName}</strong>.</p>
        </div>
      </div>

      {/* CONTENT AREA */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-cyan-400 flex-1 overflow-hidden">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-4"></div>
          <p className="font-mono text-sm tracking-widest animate-pulse">ANALYZING STORE DATA...</p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-8 flex-1 animate-fade-in-down min-h-0">
          
          {/* VERTICAL SUB-NAVIGATION */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
            {[
              { id: 'overview', icon: <Activity size={18}/>, title: 'Store Overview' },
              { id: 'products', icon: <Package size={18}/>, title: 'Product Performance' },
            ].map(sub => (
              <button 
                key={sub.id} 
                onClick={() => setActiveTab(sub.id)}
                className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 ease-in-out ${activeTab === sub.id ? 'bg-gradient-to-r from-cyan-500/20 to-transparent border-l-4 border-cyan-500 text-white shadow-lg' : 'bg-white/[0.02] border border-transparent border-l-4 hover:border-white/10 text-gray-400 hover:text-white'}`}
              >
                <div className="flex items-center gap-3">{sub.icon} <span className="font-bold">{sub.title}</span></div>
                {activeTab === sub.id && <ChevronRight size={16} className="text-cyan-400 animate-pulse" />}
              </button>
            ))}
          </div>

          {/* DYNAMIC RIGHT CONTENT SECTION */}
          <div className="flex-1 bg-white/[0.02] border border-white/10 p-6 md:p-8 rounded-2xl backdrop-blur-xl overflow-y-auto custom-scrollbar">
            {activeTab === 'overview' && <StoreOverview products={products} reviews={reviews} />}
            {activeTab === 'products' && <ProductPerformance products={products} />}
          </div>
        </div>
      )}
    </div>
  );
}