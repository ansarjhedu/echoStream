import React, { useMemo } from 'react';
import { Star, ChevronRight, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from 'recharts';
import { Link } from 'react-router-dom';

export default function ProductPerformance({ products }) {
  const topProductsData = useMemo(
    () =>
      [...products]
        .sort((a, b) => (b.stats?.totalReviews || 0) - (a.stats?.totalReviews || 0))
        .slice(0, 8)
        .map((p) => ({
          name: p.productTitle.substring(0, 15) + (p.productTitle.length > 15 ? '...' : ''),
          fullName: p.productTitle,
          reviews: p.stats?.totalReviews || 0,
          rating: Number(p.stats?.avgRating || 0),
        })),
    [products]
  );

  const scatterData = useMemo(
    () =>
      products
        .filter((p) => (p.stats?.totalReviews || 0) > 0)
        .map((p) => ({
          x: Number(p.stats?.avgRating || 0),
          y: p.stats?.totalReviews || 0,
          z: Math.max(40, (p.stats?.totalReviews || 0) * 12),
          name: p.productTitle,
        })),
    [products]
  );

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const row = payload[0].payload;
      return (
        <div className="bg-[#0A0F1A] border border-white/10 p-4 rounded-xl shadow-2xl">
          <p className="text-white font-bold mb-2">{row.fullName || row.name}</p>
          {row.reviews != null && (
            <p className="text-sm text-cyan-300">Reviews: {row.reviews}</p>
          )}
          {row.rating != null && (
            <p className="text-sm text-yellow-400">Avg rating: {row.rating.toFixed?.(1) || row.rating}</p>
          )}
          {row.x != null && (
            <>
              <p className="text-sm text-yellow-400">Rating: {row.x}</p>
              <p className="text-sm text-cyan-300">Reviews: {row.y}</p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-fade-in-down space-y-8 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-black/20 border border-white/5 p-4 md:p-6 rounded-2xl w-full">
          <h3 className="text-sm font-bold text-gray-400 mb-6 flex items-center gap-2">
            <Star size={16} className="text-purple-400" /> Most reviewed products
          </h3>
          {topProductsData.length > 0 && topProductsData[0].reviews > 0 ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip cursor={{ fill: '#ffffff05' }} content={<CustomTooltip />} />
                  <Bar dataKey="reviews" name="Total Reviews" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-10">Not enough data to display top products.</p>
          )}
        </div>

        <div className="bg-black/20 border border-white/5 p-4 md:p-6 rounded-2xl w-full">
          <h3 className="text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
            <BarChart3 size={16} className="text-cyan-400" /> Rating vs volume
          </h3>
          <p className="text-xs text-gray-500 mb-4">Bubble size scales with review count — find high-volume / low-rating products fast.</p>
          {scatterData.length > 0 ? (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Rating"
                    domain={[1, 5]}
                    stroke="#6b7280"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis type="number" dataKey="y" name="Reviews" stroke="#6b7280" fontSize={11} tickLine={false} allowDecimals={false} />
                  <ZAxis type="number" dataKey="z" range={[40, 280]} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Scatter data={scatterData} fill="#22d3ee">
                    {scatterData.map((entry, i) => (
                      <Cell key={i} fill={entry.x >= 4 ? '#10b981' : entry.x >= 3 ? '#eab308' : '#ef4444'} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-10">Products need reviews before this chart appears.</p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/20 no-scrollbar w-full">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-4 md:p-5">Product Name</th>
              <th className="p-4 md:p-5">Reviews</th>
              <th className="p-4 md:p-5">Avg Rating</th>
              <th className="p-4 md:p-5">Health</th>
              <th className="p-4 md:p-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {products.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500">
                  No products found.
                </td>
              </tr>
            ) : null}
            {products.map((p) => {
              const rating = Number(p.stats?.avgRating || 0);
              const health =
                (p.stats?.totalReviews || 0) === 0
                  ? { label: 'No data', className: 'text-gray-500' }
                  : rating >= 4
                    ? { label: 'Strong', className: 'text-emerald-400' }
                    : rating >= 3
                      ? { label: 'Watch', className: 'text-amber-400' }
                      : { label: 'At risk', className: 'text-red-400' };
              return (
                <tr key={p._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 md:p-5 font-bold text-white">{p.productTitle}</td>
                  <td className="p-4 md:p-5 text-gray-300">{p.stats?.totalReviews || 0}</td>
                  <td className="p-4 md:p-5 text-yellow-400 font-bold">
                    <span className="inline-flex items-center gap-1">
                      <Star size={14} className="fill-yellow-400" /> {rating.toFixed(1) || '0.0'}
                    </span>
                  </td>
                  <td className={`p-4 md:p-5 text-xs font-bold uppercase tracking-wider ${health.className}`}>
                    {health.label}
                  </td>
                  <td className="p-4 md:p-5 text-right">
                    <Link
                      to="/workspace/reviews"
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all inline-flex items-center gap-1"
                    >
                      View Reviews <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
