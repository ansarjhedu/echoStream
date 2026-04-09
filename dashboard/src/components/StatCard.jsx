import React from 'react';

export default function StatCard({ title, value, icon, color = "text-white", trend, trendDown }) {
  return (
    <div className="bg-white/[0.02] border border-white/10 p-5 rounded-2xl backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-white/20 transition-all flex flex-col justify-between">
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all"></div>
      <div className="flex justify-between items-start mb-2">
        <p className="text-gray-400 font-bold text-sm">{title}</p>
        {icon && <div className="p-1.5 bg-black/40 rounded-lg border border-white/5">{icon}</div>}
      </div>
      <div className="flex items-end justify-between">
        <h3 className={`text-3xl font-black ${color}`}>{value || 0}</h3>
        {trend && (
          <span className={`text-xs font-bold px-2 py-1 rounded-md mb-1 ${trendDown ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}