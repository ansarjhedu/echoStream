import React, { useEffect, useState } from 'react';
import api from '../Api';
import { useAuth } from '../context/AuthContext';
import { BarChart3 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import StoreOverview from '../components/analytics/StoreOverview';
import ProductPerformance from '../components/analytics/ProductPerformance';

export default function Analytics() {
  const { activeStore } = useAuth();
  const[products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const[loading, setLoading] = useState(true);
  const location = useLocation();

  const isProductsView = location.pathname.includes('/products');

  useEffect(() => {
    if (activeStore) fetchData();
  }, [activeStore]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, revRes] = await Promise.all([
        api.get(`/store/${activeStore._id}/products`),
        api.get(`/store/${activeStore._id}/reviews`)
      ]);
      setProducts(prodRes.data.data ||[]);
      setReviews(revRes.data ||[]); 
    } catch (error) {
      console.error("Analytics fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Reduced padding to let the layout stretch wider, and added no-scrollbar
    <div className="p-4 md:p-6 lg:p-8 relative overflow-y-auto h-full z-10 w-full flex flex-col no-scrollbar">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="text-cyan-400" size={32} />
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tight">
              Store Analytics
            </h1>
          </div>
          <p className="text-gray-400">
            Actionable insights for <strong className="text-cyan-400">{activeStore?.storeName}</strong>.
          </p>
        </div>
      </div>

      {/* FULL WIDTH CONTENT AREA */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-cyan-400 flex-1">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-4"></div>
          <p className="font-mono text-sm tracking-widest animate-pulse">ANALYZING STORE DATA...</p>
        </div>
      ) : (
        <div className="flex flex-col flex-1 animate-fade-in-down min-h-0 w-full">
          
          {/* THE GRAPHS CONTAINER - NOW TAKES UP 100% WIDTH WITH NO SCROLLBAR */}
          <div className="flex-1 bg-white/[0.02] border border-white/10 p-4 md:p-6 lg:p-8 rounded-2xl backdrop-blur-xl overflow-y-auto no-scrollbar w-full shadow-2xl">
            
            {isProductsView ? (
              <ProductPerformance products={products} />
            ) : (
              <StoreOverview products={products} reviews={reviews} />
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}