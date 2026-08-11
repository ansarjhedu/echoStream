import React, { useState, useMemo } from 'react';
import { Star, MessageSquare, CheckCircle, TrendingUp, AlertOctagon, BadgeCheck, Users, Eye, History } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StatCard from '../StatCard';

function dayKey(d) {
  return d.toISOString().split('T')[0];
}

function buildTrend(reviews, days) {
  const keys = [...Array(days)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return dayKey(d);
  });
  return keys.map((dateStr) => {
    const dayReviews = reviews.filter((r) => r.createdAt?.startsWith(dateStr));
    return {
      name:
        days <= 7
          ? new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' })
          : new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      reviews: dayReviews.length,
      verified: dayReviews.filter((r) => r.isVerifiedBuyer).length,
      guest: dayReviews.filter((r) => !r.isVerifiedBuyer).length,
      fullDate: dateStr,
    };
  });
}

export default function StoreOverview({ products, reviews, campaignSummary, widgetStats, activity = [] }) {
  const [chartTimeframe, setChartTimeframe] = useState('7d');

  const stats = useMemo(() => {
    const approved = reviews.filter((r) => r.status === 'approved');
    const disputed = reviews.filter((r) => r.status === 'disputed');
    const verified = reviews.filter((r) => r.isVerifiedBuyer);
    const guest = reviews.filter((r) => !r.isVerifiedBuyer);

    const avgRating =
      approved.length > 0
        ? (approved.reduce((sum, r) => sum + r.rating, 0) / approved.length).toFixed(1)
        : 0;

    return {
      totalProducts: products.length,
      totalReviews: reviews.length,
      approvedReviews: approved.length,
      disputedReviews: disputed.length,
      avgRating,
      approvalRate: reviews.length > 0 ? Math.round((approved.length / reviews.length) * 100) : 0,
      verifiedCount: verified.length,
      guestCount: guest.length,
      verifiedRate: reviews.length > 0 ? Math.round((verified.length / reviews.length) * 100) : 0,
    };
  }, [products, reviews]);

  const topProducts = useMemo(
    () =>
      [...products]
        .sort((a, b) => (b.stats?.totalReviews || 0) - (a.stats?.totalReviews || 0))
        .slice(0, 5),
    [products]
  );

  const reviewTrendData7d = useMemo(() => buildTrend(reviews, 7), [reviews]);
  const reviewTrendData30d = useMemo(() => buildTrend(reviews, 30), [reviews]);
  const activeChartData = chartTimeframe === '7d' ? reviewTrendData7d : reviewTrendData30d;

  const statusData = useMemo(() => {
    const counts = { approved: 0, pending: 0, rejected: 0, disputed: 0 };
    reviews.forEach((r) => {
      if (counts[r.status] !== undefined) counts[r.status]++;
    });
    return [
      { name: 'Approved', value: counts.approved, color: '#10b981' },
      { name: 'Pending', value: counts.pending, color: '#f59e0b' },
      { name: 'Rejected', value: counts.rejected, color: '#6b7280' },
      { name: 'Disputed', value: counts.disputed, color: '#ef4444' },
    ].filter((d) => d.value > 0);
  }, [reviews]);

  const trustData = useMemo(
    () =>
      [
        { name: 'Verified buyers', value: stats.verifiedCount, color: '#22d3ee' },
        { name: 'Guest reviews', value: stats.guestCount, color: '#a855f7' },
      ].filter((d) => d.value > 0),
    [stats.verifiedCount, stats.guestCount]
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0A0F1A] border border-white/10 p-4 rounded-xl shadow-2xl">
          <p className="text-white font-bold mb-2">{payload[0].payload.fullDate || label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color || entry.fill }} className="text-sm font-medium">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in-down">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Avg Rating" value={stats.avgRating} icon={<Star className="text-yellow-400" size={20} />} color="text-yellow-400" />
        <StatCard title="Total Reviews" value={stats.totalReviews} icon={<MessageSquare size={20} className="text-cyan-400" />} />
        <StatCard
          title="Verified buyers"
          value={`${stats.verifiedRate}%`}
          icon={<BadgeCheck size={20} className="text-emerald-400" />}
          color="text-emerald-400"
        />
        <StatCard
          title="Disputed Reviews"
          value={stats.disputedReviews}
          icon={<AlertOctagon size={20} className={stats.disputedReviews > 0 ? 'text-red-400' : 'text-gray-400'} />}
          color={stats.disputedReviews > 0 ? 'text-red-400' : 'text-white'}
        />
      </div>

      {campaignSummary && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 md:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-cyan-400/80 font-bold">Campaign ROI snapshot</p>
            <p className="text-sm text-gray-300 mt-1">
              {campaignSummary.totalSent} sent · {campaignSummary.totalFailed} failed ·{' '}
              {campaignSummary.deliveryRate || 0}% delivery across {campaignSummary.campaigns} campaigns
            </p>
            {campaignSummary.lastCampaign && (
              <p className="text-xs text-gray-500 mt-1 truncate">
                Last: {campaignSummary.lastCampaign.subject}
              </p>
            )}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <Users size={14} /> Unsubscribed skipped: {campaignSummary.totalSuppressed || 0}
          </div>
        </div>
      )}

      {widgetStats && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 md:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <Eye className="text-cyan-400 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">Published layout</p>
              <p className="text-sm text-white mt-1">
                {widgetStats.publishedLayout || '—'} · {widgetStats.impressions || 0} impressions
              </p>
            </div>
          </div>
          {widgetStats.trustPageUrl ? (
            <a
              href={widgetStats.trustPageUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
            >
              Open trust page →
            </a>
          ) : null}
        </div>
      )}

      {activity.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
          <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2 mb-4">
            <History size={16} className="text-cyan-400" /> Team activity
          </h3>
          <ul className="space-y-2 max-h-56 overflow-y-auto">
            {activity.slice(0, 12).map((row) => (
              <li key={row.id} className="text-xs text-gray-400 flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-white/5 pb-2">
                <span>
                  <span className="text-gray-200 font-medium">
                    {row.actor?.userName || row.actor?.email || 'System'}
                  </span>
                  {' · '}
                  {row.action}
                </span>
                <span className="text-gray-600">{new Date(row.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-black/20 border border-white/5 p-6 rounded-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2">
              <TrendingUp size={16} className="text-cyan-400" /> Review volume · verified vs guest
            </h3>
            <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setChartTimeframe('7d')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${chartTimeframe === '7d' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setChartTimeframe('30d')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${chartTimeframe === '30d' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              >
                30 Days
              </button>
            </div>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGuest" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="verified" name="Verified" stroke="#22d3ee" strokeWidth={2} fill="url(#colorVerified)" stackId="1" />
                <Area type="monotone" dataKey="guest" name="Guest" stroke="#a855f7" strokeWidth={2} fill="url(#colorGuest)" stackId="1" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-black/20 border border-white/5 p-6 rounded-xl flex flex-col">
          <h3 className="text-sm font-bold text-gray-400 mb-2">Trust mix</h3>
          <div className="flex-1 min-h-[200px] w-full relative flex items-center justify-center">
            {trustData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={trustData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                    {trustData.map((entry, index) => (
                      <Cell key={`trust-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-600 text-sm">No reviews yet.</p>
            )}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <CheckCircle className="text-gray-500" size={24} />
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {trustData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name} ({item.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-black/20 border border-white/5 p-6 rounded-xl">
          <h3 className="text-sm font-bold text-gray-400 mb-4">Top products by review volume</h3>
          {topProducts.length === 0 || !(topProducts[0]?.stats?.totalReviews > 0) ? (
            <p className="text-gray-600 text-sm">No product reviews yet.</p>
          ) : (
            <ul className="space-y-3">
              {topProducts.map((p) => (
                <li key={p._id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-white font-medium truncate">{p.productTitle}</span>
                  <span className="text-gray-400 shrink-0">
                    {p.stats?.totalReviews || 0} · ★ {(p.stats?.avgRating || 0).toFixed?.(1) || p.stats?.avgRating || '0.0'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-black/20 border border-white/5 p-6 rounded-xl flex flex-col">
          <h3 className="text-sm font-bold text-gray-400 mb-2">Review Status</h3>
          <div className="flex-1 min-h-[180px] w-full relative flex items-center justify-center">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value" stroke="none">
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-600 text-sm">No reviews yet.</p>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name} ({item.value})
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
