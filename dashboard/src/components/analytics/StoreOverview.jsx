import React, { useMemo } from 'react';
import { Star, MessageSquare, CheckCircle, Clock, TrendingUp, AlertOctagon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StatCard from '../StatCard';

export default function StoreOverview({ products, reviews }) {
  
  const stats = useMemo(() => {
    const approved = reviews.filter(r => r.status === 'approved');
    const pending = reviews.filter(r => r.status === 'pending');
    const avgRating = approved.length > 0 
      ? (approved.reduce((sum, r) => sum + r.rating, 0) / approved.length).toFixed(1) : 0;

    return {
      totalProducts: products.length,
      totalReviews: reviews.length,
      approvedReviews: approved.length,
      pendingReviews: pending.length,
      avgRating,
      approvalRate: reviews.length > 0 ? Math.round((approved.length / reviews.length) * 100) : 0
    };
  }, [products, reviews]);

  const reviewTrendData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    return last7Days.map(dateStr => ({
      name: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }), 
      reviews: reviews.filter(r => r.createdAt?.startsWith(dateStr)).length, 
      fullDate: dateStr 
    }));
  }, [reviews]);

  const statusData = useMemo(() => {
    const counts = { approved: 0, pending: 0, rejected: 0, dispute: 0 };
    reviews.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
    return[
      { name: 'Approved', value: counts.approved, color: '#10b981' },
      { name: 'Pending', value: counts.pending, color: '#f59e0b' },
      { name: 'Rejected', value: counts.rejected, color: '#6b7280' },
      { name: 'Disputed', value: counts.dispute, color: '#ef4444' },
    ].filter(d => d.value > 0);
  }, [reviews]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0A0F1A] border border-white/10 p-4 rounded-xl shadow-2xl">
          <p className="text-white font-bold mb-2">{payload[0].payload.fullDate || label}</p>
          {payload.map((entry, index) => <p key={index} style={{ color: entry.color || entry.fill }} className="text-sm font-medium">{entry.name}: {entry.value}</p>)}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in-down">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Avg Rating" value={stats.avgRating} icon={<Star className="text-yellow-400" size={20}/>} color="text-yellow-400" />
        <StatCard title="Total Reviews" value={stats.totalReviews} icon={<MessageSquare size={20} className="text-cyan-400"/>} />
        <StatCard title="Approval Rate" value={`${stats.approvalRate}%`} icon={<CheckCircle size={20} className="text-green-400"/>} color="text-green-400" />
        <StatCard title="Pending" value={stats.pendingReviews} icon={<Clock size={20} className="text-orange-400"/>} color={stats.pendingReviews > 0 ? "text-orange-400" : "text-gray-400"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
  );
}