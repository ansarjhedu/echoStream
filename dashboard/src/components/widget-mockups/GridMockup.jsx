import React from 'react';
import { RenderMockupStars } from '../../pages/Integration';

export default function GridMockup({ reviews }) {
  return (
    <div className="p-6" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">What Customers Say</h3>
        <button className="px-4 py-2 rounded-lg font-medium text-sm transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--p-color)', color: 'var(--bg-color)' }}>Review</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {reviews.map(r => (
          <div key={r.id} className="p-5 rounded-xl shadow-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--t-color) 4%, transparent)' }}>
            <div className="mb-3"><RenderMockupStars rating={r.rating} /></div>
            <p className="text-sm opacity-90 mb-4 line-clamp-3">"{r.comment}"</p>
            <div className="text-xs opacity-60 font-medium uppercase tracking-wider">— {r.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}