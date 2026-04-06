import React, { useEffect, useState, useMemo } from 'react';
import api from '../Api';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, Package, Star, Clock, Activity, 
  ChevronRight, TrendingUp, CheckCircle, AlertOctagon 
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { Link } from 'react-router-dom';

export default function Analytics() {
  const { activeStore } = useAuth();
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Vertical Sub-Nav State
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'products'

  useEffect(() => {
    if (activeStore) fetchData();
  }, [activeStore]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch both products and reviews for this store in parallel
      const [prodRes, revRes] = await Promise.all([
        api.get(`/store/${activeStore._id}/products`),
        api.get(`/store/${activeStore._id}/reviews`)
      ]);
      setProducts(prodRes.data.data || []);
      setReviews(revRes.data ||[]); // Reviews backend returns the array directly
    } catch (error) {
      console.error("Analytics fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------
  // 🧠 DYNAMIC DATA PROCESSING (Calculated instantly in React)
  // --------------------------------------------------------

  // 1. Core KPIs
  const stats = useMemo(() => {
    const approved = reviews.filter(r => r.status === 'approved');
    const pending = reviews.filter(r => r.status === 'pending');
    
    // Calculate Average Store Rating from approved reviews
    const avgRating = approved.length > 0 
      ? (approved.reduce((sum, r) => sum + r.rating, 0) / approved.length).toFixed(1)
      : 0;

    return {
      totalProducts: products.length,
      totalReviews: reviews.length,
      approvedReviews: approved.length,
      pendingReviews: pending.length,
      avgRating,
      approvalRate: reviews.length > 0 ? Math.round((approved.length / reviews.length) * 100) : 0
    };
  }, [products, reviews]);

  // 2. 7-Day Review Volume Graph
  const reviewTrendData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(dateStr => {
      const dailyReviews = reviews.filter(r => r.createdAt?.startsWith(dateStr)).length;
      const dayName = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
      return { name: dayName, reviews: dailyReviews, fullDate: dateStr };
    });
  }, [reviews]);

  // 3. Status Distribution Doughnut Chart
  const statusData = useMemo(() => {
    const counts = { approved: 0, pending: 0, rejected: 0, dispute: 0 };
    reviews.forEach(r => {
      if (counts[r.status] !== undefined) counts[r.status]++;
    });
    return[
      { name: 'Approved', value: counts.approved, color: '#10b981' }, // Green
      { name: 'Pending', value: counts.pending, color: '#f59e0b' }, // Yellow
      { name: 'Rejected', value: counts.rejected, color: '#6b7280' }, // Gray
      { name: 'Disputed', value: counts.dispute, color: '#ef4444' }, // Red
    ].filter(d => d.value > 0);
  }, [reviews]);

  // 4. Top Performing Products
  const topProductsData = useMemo(() => {
    return[...products]
      .sort((a, b) => (b.stats?.totalReviews || 0) - (a.stats?.totalReviews || 0))
      .slice(0, 5) // Top 5 products
      .map(p => ({
        name: p.productTitle.substring(0, 15) + (p.productTitle.length > 15 ? '...' : ''),
        fullName: p.productTitle,
        reviews: p.stats?.totalReviews || 0,
        rating: p.stats?.avgRating || 0
      }));
  }, [products]);

  // Chart Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0A0F1A] border border-white/10 p-4 rounded-xl shadow-2xl">
          <p className="text-white font-bold mb-2">{payload[0].payload.fullDate || payload[0].payload.fullName || label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color || entry.fill }} className="text-sm font-medium">
              {entry.name}: {entry.value} {entry.name === 'rating' ? '⭐' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 md:p-10 lg:p-14 relative overflow-y-auto h-full z-10 w-full flex flex-col">
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
        <div className="flex flex-col items-center justify-center py-20 text-cyan-400 flex-1">
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
            
            {/* ---------------------------------------------------- */}
            {/* TAB 1: STORE OVERVIEW                                */}
            {/* ---------------------------------------------------- */}
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-fade-in-down">
                
                {/* 4 Key Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Avg Rating" value={stats.avgRating} icon={<Star className="text-yellow-400" size={20}/>} color="text-yellow-400" />
                  <StatCard title="Total Reviews" value={stats.totalReviews} icon={<MessageSquare size={20} className="text-cyan-400"/>} />
                  <StatCard title="Approval Rate" value={`${stats.approvalRate}%`} icon={<CheckCircle size={20} className="text-green-400"/>} color="text-green-400" />
                  <StatCard title="Pending" value={stats.pendingReviews} icon={<Clock size={20} className="text-orange-400"/>} color={stats.pendingReviews > 0 ? "text-orange-400" : "text-gray-400"} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Area Chart: Reviews over 7 Days */}
                  <div className="lg:col-span-2 bg-black/20 border border-white/5 p-6 rounded-xl">
                    <h3 className="text-sm font-bold text-gray-400 mb-6 flex items-center gap-2"><TrendingUp size={16} className="text-cyan-400"/> Review Volume (Last 7 Days)</h3>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={reviewTrendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                          <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="reviews" name="Reviews Received" stroke="#06b6d4" strokeWidth={3} fill="url(#colorReviews)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Doughnut Chart: Status Distribution */}
                  <div className="bg-black/20 border border-white/5 p-6 rounded-xl flex flex-col">
                    <h3 className="text-sm font-bold text-gray-400 mb-2">Review Status</h3>
                    <div className="flex-1 min-h-[200px] w-full relative flex items-center justify-center">
                      {statusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                              {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <RechartsTooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : <p className="text-gray-600 text-sm">No reviews yet.</p>}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><AlertOctagon className="text-gray-500" size={24} /></div>
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                      {statusData.map(item => (
                        <div key={item.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>{item.name} ({item.value})
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* TAB 2: PRODUCT PERFORMANCE                             */}
            {/* ---------------------------------------------------- */}
            {activeTab === 'products' && (
              <div className="animate-fade-in-down space-y-8">
                
                {/* Bar Chart: Top Products */}
                <div className="bg-black/20 border border-white/5 p-6 rounded-xl">
                  <h3 className="text-sm font-bold text-gray-400 mb-6 flex items-center gap-2"><Star size={16} className="text-purple-400"/> Most Reviewed Products</h3>
                  {topProductsData.length > 0 ? (
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topProductsData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                          <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                          <RechartsTooltip cursor={{fill: '#ffffff05'}} content={<CustomTooltip />} />
                          <Bar dataKey="reviews" name="Total Reviews" fill="#a855f7" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-10">Not enough data to display top products.</p>
                  )}
                </div>

                {/* Data Table: All Products */}
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
                      <tr><th className="p-4">Product Name</th><th className="p-4">Reviews</th><th className="p-4">Avg Rating</th><th className="p-4 text-right">Action</th></tr>
                    </thead>
                    <tbody className="text-sm">
                      {products.length === 0 ? <tr><td colSpan="4" className="p-8 text-center text-gray-500">No products found.</td></tr> : null}
                      {products.map(p => (
                        <tr key={p._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-4 font-bold text-white">{p.productTitle}</td>
                          <td className="p-4 text-gray-300">{p.stats?.totalReviews || 0}</td>
                          <td className="p-4 text-yellow-400 font-bold flex items-center gap-1 mt-3">
                            <Star size={14} className="fill-yellow-400"/> {p.stats?.avgRating?.toFixed(1) || "0.0"}
                          </td>
                          <td className="p-4 text-right">
                            <Link to="/workspace/reviews" className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all inline-flex items-center gap-1">
                              View Reviews <ChevronRight size={14} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Stat Card Component
const StatCard = ({ title, value, icon, color = "text-white" }) => (
  <div className="bg-white/[0.02] border border-white/10 p-5 rounded-2xl backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-white/20 transition-all flex flex-col justify-between">
    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all"></div>
    <div className="flex justify-between items-start mb-2">
      <p className="text-gray-400 font-bold text-sm">{title}</p>
      <div className="p-1.5 bg-black/40 rounded-lg border border-white/5">{icon}</div>
    </div>
    <h3 className={`text-3xl font-black ${color}`}>{value}</h3>
  </div>
);

// We need an extra icon import for MessageSquare that was missed above.
// (Add this to your lucide-react import at the top)
import { MessageSquare } from 'lucide-react';