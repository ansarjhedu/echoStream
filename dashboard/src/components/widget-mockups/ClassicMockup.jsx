import React from 'react';
import { RenderMockupStars } from '../../pages/Integration';

export default function ClassicMockup({ reviews }) {
  return (
    <div className="p-6 border border-gray-200" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-2xl font-bold m-0">4.5</h3>
            <RenderMockupStars rating={5} />
          </div>
          <div className="text-sm opacity-70">Based on 124 reviews</div>
        </div>
        <button className="px-5 py-2 border font-bold text-sm uppercase tracking-wider rounded-sm hover:opacity-80 transition-opacity" style={{ borderColor: 'var(--p-color)', color: 'var(--p-color)' }}>Write a Review</button>
      </div>
      <hr className="mb-6 opacity-20" style={{ borderColor: 'var(--t-color)' }}/>
      <div className="space-y-6">
        {reviews.map(r => (
          <div key={r.id} className="border-b pb-6 last:border-0" style={{ borderColor: 'color-mix(in srgb, var(--t-color) 15%, transparent)' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--p-color) 20%, transparent)', color: 'var(--p-color)' }}>{r.name.charAt(0)}</div>
              <div><span className="font-bold mr-2">{r.name}</span> <span className="text-xs opacity-50">{r.date}</span></div>
            </div>
            <div className="mb-2"><RenderMockupStars rating={r.rating} /></div>
            <p className="text-sm opacity-90">{r.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}