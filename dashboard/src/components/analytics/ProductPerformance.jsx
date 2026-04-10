import React, { useMemo } from 'react';
import { Star, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

export default function ProductPerformance({ products }) {
  
  const topProductsData = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.stats?.totalReviews || 0) - (a.stats?.totalReviews || 0))
      .slice(0, 5) 
      .map(p => ({
        name: p.productTitle.substring(0, 15) + (p.productTitle.length > 15 ? '...' : ''),
        fullName: p.productTitle,
        reviews: p.stats?.totalReviews || 0,
        rating: p.stats?.avgRating || 0
      }));
  }, [products]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0A0F1A] border border-white/10 p-4 rounded-xl shadow-2xl">
          <p className="text-white font-bold mb-2">{payload[0].payload.fullName}</p>
          <p style={{ color: payload[0].fill }} className="text-sm font-medium">Total Reviews: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-fade-in-down space-y-8 w-full">
      {/* Bar Chart: Top Products */}
      <div className="bg-black/20 border border-white/5 p-4 md:p-6 rounded-xl w-full">
        <h3 className="text-sm font-bold text-gray-400 mb-6 flex items-center gap-2"><Star size={16} className="text-purple-400"/> Most Reviewed Products</h3>
        {topProductsData.length > 0 && topProductsData[0].reviews > 0 ? (
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

      {/* Data Table: All Products - CHANGED custom-scrollbar to no-scrollbar */}
      <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20 no-scrollbar w-full">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-4 md:p-5">Product Name</th>
              <th className="p-4 md:p-5">Reviews</th>
              <th className="p-4 md:p-5">Avg Rating</th>
              <th className="p-4 md:p-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {products.length === 0 ? <tr><td colSpan="4" className="p-8 text-center text-gray-500">No products found.</td></tr> : null}
            {products.map(p => (
              <tr key={p._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4 md:p-5 font-bold text-white">{p.productTitle}</td>
                <td className="p-4 md:p-5 text-gray-300">{p.stats?.totalReviews || 0}</td>
                <td className="p-4 md:p-5 text-yellow-400 font-bold flex items-center gap-1 mt-3">
                  <Star size={14} className="fill-yellow-400"/> {p.stats?.avgRating?.toFixed(1) || "0.0"}
                </td>
                <td className="p-4 md:p-5 text-right">
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
  );
}