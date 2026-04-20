import React, { useEffect, useState, useMemo } from 'react';
import api from '../../Api';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Activity, Server, Crown } from 'lucide-react';
import { toast } from 'react-toastify';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminOverview() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const[disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const[chartTimeframe, setChartTimeframe] = useState('7d'); // '7d' or '30d'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statRes, storeRes, userRes, dispRes] = await Promise.all([
          api.get('/admin/analytics'),
          api.get('/admin/store/list'),
          api.get('/admin/user/list'),
          api.get('/admin/disputes')
        ]);
        
        // 🚨 FIX 1: Robust payload mapping to catch 'storesWithOwner' or standard 'data'
        setAnalytics(statRes.data?.data || statRes.data || null);
        setStores(storeRes.data?.storesWithOwner || storeRes.data?.data ||[]);
        setUsers(userRes.data?.data || []);
        setDisputes(dispRes.data?.data ||[]);

      } catch (error) {
        toast.error("Admin fetch failed");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  },[]);

  // 1. 7-Day Growth Data
  const growthData7d = useMemo(() => {
    const last7Days =[...Array(7)].map((_, i) => {
      const d = new Date(); 
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    return last7Days.map(dateStr => {
      const dailyStores = stores.filter(s => s.createdAt?.startsWith(dateStr)).length;
      // Filter out 'admin' from graph so we only track real merchants
      const dailyUsers = users.filter(u => u.role === 'owner' && u.createdAt?.startsWith(dateStr)).length;
      return { 
        name: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }), 
        stores: dailyStores, 
        users: dailyUsers, 
        fullDate: dateStr 
      };
    });
  },[stores, users]);

  // 2. 30-Day Growth Data
  const growthData30d = useMemo(() => {
    const last30Days = [...Array(30)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });
    return last30Days.map(dateStr => {
      const dailyStores = stores.filter(s => s.createdAt?.startsWith(dateStr)).length;
      const dailyUsers = users.filter(u => u.role === 'owner' && u.createdAt?.startsWith(dateStr)).length;
      return { 
        name: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
        stores: dailyStores, 
        users: dailyUsers, 
        fullDate: dateStr 
      };
    });
  }, [stores, users]);

  const activeChartData = chartTimeframe === '7d' ? growthData7d : growthData30d;

  const StoreTypeData = useMemo(() => {
    const counts = { ecommerce: 0, blog: 0, portfolio: 0, other: 0 };
    stores.forEach(s => { 
      const type = s.storeType?.toLowerCase() || 'other';
      if (counts[type] !== undefined) counts[type]++; 
      else counts.other++;
    });
    return[
      { name: 'eCommerce', value: counts.ecommerce, color: '#06b6d4' },
      { name: 'Blog', value: counts.blog, color: '#a855f7' }, 
      { name: 'Portfolio', value: counts.portfolio, color: '#10b981' }, 
      { name: 'Other', value: counts.other, color: '#6b7280' }, 
    ].filter(d => d.value > 0);
  }, [stores]);

  const topOwner = useMemo(() => {
    if (!stores.length || !users.length) return null;
    const count = {};
    stores.forEach(s => count[s.owner] = (count[s.owner] || 0) + 1);
    const maxId = Object.keys(count).reduce((a, b) => count[a] > count[b] ? a : b, null);
    return users.find(u => u._id === maxId) ? { ...users.find(u => u._id === maxId), storeCount: count[maxId] } : null;
  }, [stores, users]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0A0F1A] border border-white/10 p-4 rounded-xl shadow-2xl">
          <p className="text-white font-bold mb-2">{payload[0].payload.fullDate || label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) return <div className="p-12 text-red-400 animate-pulse flex gap-2"><Activity/> Gathering Platform Telemetry...</div>;

  return (
    <div className="p-4 md:p-10 relative overflow-y-auto h-full z-10 w-full overflow-x-hidden no-scrollbar">
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-red-600/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>

      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500 tracking-tight flex items-center gap-3">
          <ShieldAlert className="text-red-500" /> Platform Overview
        </h1>
      </div>

      <div className="bg-gradient-to-br from-red-900/20 to-orange-900/10 border border-red-500/20 p-6 rounded-2xl flex items-start gap-4 mb-8 shadow-lg">
        <Crown className="text-yellow-400 shrink-0 mt-1" size={28} />
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Welcome back, {user?.userName}</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            {/* 🚨 FIX 2: Standardized Welcome Message to use the same numbers as Stat Cards */}
            EchoStream is hosting <strong>{analytics?.activeStores || 0} active widgets</strong> across <strong>{analytics?.totalUsers || 0} active owners.</strong> 
            {topOwner && ` Your top merchant is ${topOwner.userName} (${topOwner.storeCount} stores).`}
            {disputes.length > 0 ? <span className="text-red-400 ml-1"> {disputes.length} disputes need attention!</span> : ' No disputes today.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* 🚨 FIX 3: Stat cards now rely on identical backend analytic variables */}
        <StatCard title="Total Owners" value={analytics?.totalUsers || 0} />
        <StatCard title="Total Stores" value={analytics?.totalStores || 0} />
        <StatCard title="Active Integrations" value={analytics?.activeStores || 0} color="text-green-400" />
        
        {/* 🚨 FIX 4: Bound directly to disputes.length so it updates LIVE as you resolve them! */}
        <StatCard title="Pending Disputes" value={disputes.length} color="text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-black/20 border border-white/5 p-6 rounded-2xl flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h3 className="text-sm font-bold text-gray-400">New Registrations</h3>
            <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
              <button onClick={() => setChartTimeframe('7d')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${chartTimeframe === '7d' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>7 Days</button>
              <button onClick={() => setChartTimeframe('30d')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${chartTimeframe === '30d' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>30 Days</button>
            </div>
          </div>
          <div className="flex-1 min-h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorStores" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="stores" name="New Stores" stroke="#f97316" strokeWidth={3} fill="url(#colorStores)" />
                <Area type="monotone" dataKey="users" name="New Users" stroke="#ef4444" strokeWidth={3} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 🚨 FIX 5: Graph will now properly populate because the stores array is populated! */}
        <div className="bg-black/20 border border-white/5 p-6 rounded-2xl flex flex-col">
          <h3 className="text-sm font-bold text-gray-400 mb-2">Store Type Distribution</h3>
          <div className="flex-1 min-h-[200px] w-full relative flex items-center justify-center">
            {StoreTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={StoreTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                    {StoreTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-600 text-sm">No live store data.</p>}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Server className="text-gray-500" size={24} /></div>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {StoreTypeData.map(item => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>{item.name} ({item.value})
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ title, value, color = "text-white" }) => (
  <div className="bg-white/[0.02] border border-white/10 p-5 rounded-2xl backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-white/20 transition-all">
    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all"></div>
    <p className="text-gray-400 font-bold mb-1 text-sm md:text-base">{title}</p>
    <h3 className={`text-3xl md:text-4xl font-black ${color}`}>{value || 0}</h3>
  </div>
);