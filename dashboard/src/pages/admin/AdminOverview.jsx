import React, { useEffect, useState, useMemo } from 'react';
import api from '../../Api';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Activity, Server, Crown, Users,LifeBuoy } from 'lucide-react';
import { toast } from 'react-toastify';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminOverview() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [tickets, setTickets] = useState([]); 
  const [loading, setLoading] = useState(true);
  const[chartTimeframe, setChartTimeframe] = useState('7d'); 
  const [pieView, setPieView] = useState('hosting'); 

  useEffect(() => {
    const fetchData = async () => {
      try {
        const settled = await Promise.allSettled([
          api.get('/admin/analytics'),
          api.get('/admin/store/list'),
          api.get('/admin/user/list'),
          api.get('/admin/disputes'),
          api.get('/admin/support/list')
        ]);
        const [statRes, storeRes, userRes, dispRes, ticketRes] = settled;

        if (statRes.status === 'fulfilled') {
          setAnalytics(statRes.value.data?.data || statRes.value.data || null);
        }
        if (storeRes.status === 'fulfilled') {
          setStores(storeRes.value.data?.storesWithOwner || storeRes.value.data?.data || []);
        }
        if (userRes.status === 'fulfilled') setUsers(userRes.value.data?.data || []);
        if (dispRes.status === 'fulfilled') setDisputes(dispRes.value.data?.data || []);
        if (ticketRes.status === 'fulfilled') setTickets(ticketRes.value.data?.data || []);

        if (settled.every((r) => r.status === 'rejected')) {
          toast.error("Admin fetch failed");
        }
      } catch (error) {
        toast.error("Admin fetch failed");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  },[]);

  // ... (Keep the growthData7d and growthData30d exactly as they were) ...
  const growthData7d = useMemo(() => {
    const last7Days =[...Array(7)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    return last7Days.map(dateStr => {
      const dailyStores = stores.filter(s => s.createdAt?.startsWith(dateStr)).length;
      const dailyUsers = users.filter(u => u.role === 'owner' && u.createdAt?.startsWith(dateStr)).length;
      return { name: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }), stores: dailyStores, users: dailyUsers, fullDate: dateStr };
    });
  },[stores, users]);

  const growthData30d = useMemo(() => {
    const last30Days = [...Array(30)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });
    return last30Days.map(dateStr => {
      const dailyStores = stores.filter(s => s.createdAt?.startsWith(dateStr)).length;
      const dailyUsers = users.filter(u => u.role === 'owner' && u.createdAt?.startsWith(dateStr)).length;
      return { name: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), stores: dailyStores, users: dailyUsers, fullDate: dateStr };
    });
  }, [stores, users]);

  const activeChartData = chartTimeframe === '7d' ? growthData7d : growthData30d;

  const StoreTypeData = useMemo(() => {
    const counts = { ecommerce: 0, blog: 0, portfolio: 0, other: 0 };
    stores.forEach(s => { 
      const type = s.storeType?.toLowerCase() || 'other';
      if (counts[type] !== undefined) counts[type]++; else counts.other++;
    });
    return[
      { name: 'eCommerce', value: counts.ecommerce, color: '#06b6d4' },
      { name: 'Blog', value: counts.blog, color: '#a855f7' }, 
      { name: 'Portfolio', value: counts.portfolio, color: '#10b981' }, 
      { name: 'Other', value: counts.other, color: '#6b7280' }, 
    ].filter(d => d.value > 0);
  }, [stores]);

  const TicketStatusData = useMemo(() => {
    const counts = { open: 0, in_progress: 0, resolved: 0 };
    tickets.forEach(t => { 
      const status = t.status?.toLowerCase() || 'open';
      if (counts[status] !== undefined) counts[status]++; 
    });
    return[
      { name: 'Open', value: counts.open, color: '#ef4444' }, 
      { name: 'In Progress', value: counts.in_progress, color: '#f59e0b' }, 
      { name: 'Resolved', value: counts.resolved, color: '#10b981' }, 
    ].filter(d => d.value > 0);
  }, [tickets]);

  const activePieData = pieView === 'hosting' ? StoreTypeData : TicketStatusData;

  // 🚨 NEW: Calculate TOP 10 Merchants instead of just 1
   const topMerchants = useMemo(() => {
    if (!stores.length || !users.length) return[];
    const stats = {};
    
    // 1. Safely extract and count stores
    stores.forEach(s => {
      // Force it to a string, whether it's an ObjectId, populated object, or string
      const ownerId = s.owner?._id ? String(s.owner._id) : String(s.owner);
      
      if (!stats[ownerId]) stats[ownerId] = { total: 0, active: 0 };
      stats[ownerId].total += 1;
      if (s.isActive) stats[ownerId].active += 1;
    });

    // 2. Map the stats to the actual users
    return users
      .filter(u => u.role !== 'admin' && !u.isDeleted) // Exclude admins and deleted users
      .map(u => {
        const userId = String(u._id);
        return {
          ...u,
          totalStores: stats[userId]?.total || 0,
          activeStores: stats[userId]?.active || 0
        };
      })
      .filter(u => u.totalStores > 0) // Only show users who ACTUALLY have stores
      .sort((a, b) => b.totalStores - a.totalStores) // Sort largest to smallest
      .slice(0, 10); // Grab top 10
  },[stores, users]);
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0A0F1A] border border-white/10 p-4 rounded-xl shadow-2xl z-50">
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
  // Pending Disputes: status === disputed && not soft-deleted
  const pendingDisputesCount = disputes.filter(
    (d) => d.status === 'disputed' && !d.isDeleted
  ).length;
  // Open Support Tickets: status !== resolved
  const openTicketsCount = tickets.filter((t) => t.status !== 'resolved').length;

  return (
    <div className="p-4 md:p-10 relative overflow-y-auto h-full z-10 w-full overflow-x-hidden no-scrollbar">
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-red-600/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>

      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500 tracking-tight flex items-center gap-3">
          <ShieldAlert className="text-red-500" /> Platform Overview
        </h1>
      </div>

      {/* FULL WIDTH WELCOME BANNER */}
      <div className="bg-gradient-to-br from-red-900/20 to-orange-900/10 border border-red-500/20 p-6 md:p-8 rounded-2xl flex items-start gap-4 mb-8 shadow-lg">
        <Activity className="text-red-400 shrink-0 mt-1" size={32} />
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Welcome back, {user?.userName}</h3>
          <p className="text-gray-300 text-sm md:text-base leading-relaxed">
            EchoStream is hosting <strong>{analytics?.activeStores || 0} active widgets</strong> across <strong>{analytics?.totalUsers || 0} active owners.</strong> 
            {pendingDisputesCount > 0 ? <span className="text-red-400 ml-1 font-bold"> {pendingDisputesCount} disputes need attention!</span> : ' No disputes today.'}
            {openTicketsCount > 0 ? <span className="text-yellow-400 ml-1 font-bold"> You have {openTicketsCount} open support tickets!</span> : ' No open support tickets.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard title="Total Owners" value={analytics?.totalUsers || 0} />
        <StatCard title="Total Stores" value={analytics?.totalStores || 0} />
        <StatCard title="Active Widgets" value={analytics?.activeStores || 0} color="text-green-400" />
        <StatCard title="Pending Disputes" value={pendingDisputesCount} color="text-red-400" />
        <StatCard title="Open Tickets" value={openTicketsCount} color="text-yellow-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
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
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} minTickGap={20} padding={{ right: 20 }} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="stores" name="New Stores" stroke="#f97316" strokeWidth={3} fill="url(#colorStores)" />
                <Area type="monotone" dataKey="users" name="New Users" stroke="#ef4444" strokeWidth={3} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-black/20 border border-white/5 p-6 rounded-2xl flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <h3 className="text-sm font-bold text-gray-400">Distribution</h3>
            <div className="flex bg-black/40 rounded-lg p-1 border border-white/10 w-full sm:w-auto">
              <button onClick={() => setPieView('hosting')} className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${pieView === 'hosting' ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:text-gray-300'}`}><Server size={12}/> Stores</button>
              <button onClick={() => setPieView('tickets')} className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${pieView === 'tickets' ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:text-gray-300'}`}><LifeBuoy size={12}/> Tickets</button>
            </div>
          </div>
          <div className="flex-1 min-h-[200px] w-full relative flex items-center justify-center">
            {activePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={activePieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                    {activePieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-600 text-sm">No data available.</p>}
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {activePieData.map(item => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>{item.name} ({item.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 🚨 NEW: THE TOP 10 LEADERBOARD */}
      <div className="bg-black/20 border border-white/5 p-6 md:p-8 rounded-2xl mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Crown className="text-yellow-400" size={24} />
          <h3 className="text-xl font-bold text-white">Top 10 Power Users</h3>
        </div>
        
        {topMerchants.length === 0 ? (
          <p className="text-gray-500 italic">No store data available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {topMerchants.map((merchant, index) => {
              // Styling for Top 3
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;
              
              const badgeColors = isFirst ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]' :
                                  isSecond ? 'bg-gray-300/20 text-gray-300 border-gray-300/50' :
                                  isThird ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' :
                                  'bg-white/5 text-gray-400 border-white/10';

              return (
                <div key={merchant._id} className="flex items-center gap-4 bg-white/[0.02] p-4 rounded-xl border border-white/5 hover:bg-white/[0.05] transition-all">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black border ${badgeColors}`}>
                    #{index + 1}
                  </div>
                  
                  {merchant.profilePic ? (
                    <img src={merchant.profilePic} className="w-10 h-10 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                      {merchant.userName.charAt(0)}
                    </div>
                  )}

                  <div className="flex-1 overflow-hidden">
                    <p className="font-bold text-white truncate">{merchant.userName}</p>
                    <p className="text-xs text-gray-400">{merchant.activeStores} Active Widgets ({merchant.totalStores} Total)</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

const StatCard = ({ title, value, color = "text-white" }) => (
  <div className="bg-white/[0.02] border border-white/10 p-5 rounded-2xl backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-white/20 transition-all flex flex-col justify-between">
    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all"></div>
    <p className="text-gray-400 font-bold mb-1 text-xs md:text-sm z-10 relative">{title}</p>
    <h3 className={`text-2xl md:text-3xl font-black z-10 relative ${color}`}>{value || 0}</h3>
  </div>
);