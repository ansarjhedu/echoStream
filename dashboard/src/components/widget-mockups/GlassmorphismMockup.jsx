import React from 'react';
import { RenderMockupStars } from '../../pages/Integration';

export default function GlassmorphismMockup({ reviews }) {
  return (
    <div className="p-6 relative backdrop-blur-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-color) 80%, transparent)' }}>
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
        <h3 className="text-xl font-bold">Customer Reviews</h3>
        <button className="px-4 py-2 rounded-full font-bold text-sm" style={{ backgroundColor: 'var(--p-color)', color: 'var(--bg-color)' }}>Write Review</button>
      </div>
      <div className="space-y-4">
        {reviews.map(r => (
          <div key={r.id} className="p-4 rounded-xl border border-white/10" style={{ backgroundColor: 'color-mix(in srgb, var(--t-color) 3%, transparent)' }}>
            <div className="flex justify-between mb-2">
              <div><span className="font-bold block">{r.name}</span><span className="text-xs opacity-50">{r.date}</span></div>
              <RenderMockupStars rating={r.rating} />
            </div>
            <p className="text-sm opacity-90">{r.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}