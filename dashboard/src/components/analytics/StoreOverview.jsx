import React, { useState, useMemo } from 'react';
import {
  Star,
  MessageSquare,
  CheckCircle,
  TrendingUp,
  AlertOctagon,
  BadgeCheck,
  Users,
  Eye,
  History,
  Link2,
  Layout,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import StatCard from '../StatCard';
import { buildTrustPageUrl } from '../../utils/planGates';

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

  const ratingDist = useMemo(() => {
    const buckets = [1, 2, 3, 4, 5].map((n) => ({
      name: `${n}★`,
      rating: n,
      count: reviews.filter((r) => Number(r.rating) === n).length,
    }));
    return buckets;
  }, [reviews]);

  const layoutImpressions = useMemo(() => {
    const by = widgetStats?.byLayout || {};
    return Object.entries(by)
      .map(([name, value]) => ({ name, impressions: Number(value) || 0 }))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 6);
  }, [widgetStats]);

  const campaignBars = useMemo(() => {
    if (!campaignSummary) return [];
    return [
      { name: 'Sent', value: campaignSummary.totalSent || 0, fill: '#22d3ee' },
      { name: 'Failed', value: campaignSummary.totalFailed || 0, fill: '#ef4444' },
      { name: 'Skipped', value: campaignSummary.totalSuppressed || 0, fill: '#f59e0b' },
    ];
  }, [campaignSummary]);

  const approvalRadial = useMemo(
    () => [{ name: 'Approval', value: stats.approvalRate, fill: '#10b981' }],
    [stats.approvalRate]
  );

  const topProducts = useMemo(
    () =>
      [...products]
        .sort((a, b) => (b.stats?.totalReviews || 0) - (a.stats?.totalReviews || 0))
        .slice(0, 5)
        .map((p) => ({
          name: (p.productTitle || 'Product').slice(0, 18),
          fullName: p.productTitle,
          reviews: p.stats?.totalReviews || 0,
          rating: Number(p.stats?.avgRating || 0),
        })),
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

  const trustUrl =
    buildTrustPageUrl(widgetStats?.publicSlug) || widgetStats?.trustPageUrl || null;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0A0F1A] border border-white/10 p-4 rounded-xl shadow-2xl">
          <p className="text-white font-bold mb-2">{payload[0].payload.fullDate || payload[0].payload.fullName || label}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex flex-col">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Approval rate</p>
          <div className="h-[140px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="100%"
                data={approvalRadial}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#ffffff10' }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-white">{stats.approvalRate}%</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h3 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2">
            <Star size={16} className="text-yellow-400" /> Rating distribution
          </h3>
          <div className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingDist} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Reviews" fill="#eab308" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {campaignSummary ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
            <p className="text-xs uppercase tracking-wider text-cyan-400/80 font-bold">Campaign delivery</p>
            <p className="text-sm text-gray-300 mt-1 mb-4">
              {campaignSummary.deliveryRate || 0}% delivery across {campaignSummary.campaigns} campaigns
            </p>
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignBars} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                  <XAxis type="number" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} width={56} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Emails" radius={[0, 6, 6, 0]}>
                    {campaignBars.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex flex-col justify-center gap-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-bold">
              <Users size={14} className="text-cyan-400" /> Snapshot
            </div>
            <p className="text-3xl font-extrabold text-white">{campaignSummary.totalSent || 0}</p>
            <p className="text-sm text-gray-400">emails delivered successfully</p>
            {campaignSummary.lastCampaign ? (
              <p className="text-xs text-gray-500 truncate mt-2">Last: {campaignSummary.lastCampaign.subject}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {widgetStats ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <Eye className="text-cyan-400 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">Widget impressions</p>
                <p className="text-sm text-white mt-1">
                  Layout <span className="text-cyan-300 font-semibold">{widgetStats.publishedLayout || '—'}</span>
                  {' · '}
                  <span className="font-bold">{widgetStats.impressions || 0}</span> loads on your site
                </p>
                <p className="text-xs text-gray-500 mt-2 max-w-xl">
                  Your public trust page is an EchoStream shareable showcase (not your storefront widget). Share it
                  with customers so they can browse verified social proof hosted by us.
                </p>
              </div>
            </div>
            {trustUrl ? (
              <a
                href={trustUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 shrink-0 min-h-10 px-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10"
              >
                <Link2 size={14} /> Open public trust page
              </a>
            ) : null}
          </div>
          {layoutImpressions.length > 0 ? (
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={layoutImpressions} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="impressions" name="Impressions" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-gray-600 flex items-center gap-2">
              <Layout size={14} /> Impressions appear after the published widget loads on your site.
            </p>
          )}
        </div>
      ) : null}

      {activity.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
          <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2 mb-4">
            <History size={16} className="text-cyan-400" /> Team activity
          </h3>
          <ul className="space-y-2 max-h-56 overflow-y-auto">
            {activity.slice(0, 12).map((row) => (
              <li
                key={row.id}
                className="text-xs text-gray-400 flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-white/5 pb-2"
              >
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
        <div className="lg:col-span-2 bg-black/20 border border-white/5 p-6 rounded-2xl">
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

        <div className="bg-black/20 border border-white/5 p-6 rounded-2xl flex flex-col">
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
        <div className="bg-black/20 border border-white/5 p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-gray-400 mb-4">Top products by volume</h3>
          {topProducts.length === 0 || !(topProducts[0]?.reviews > 0) ? (
            <p className="text-gray-600 text-sm">No product reviews yet.</p>
          ) : (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                  <XAxis type="number" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} width={90} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="reviews" name="Reviews" fill="#a855f7" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-black/20 border border-white/5 p-6 rounded-2xl flex flex-col">
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
