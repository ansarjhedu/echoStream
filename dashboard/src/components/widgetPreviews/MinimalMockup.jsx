import React from 'react';
import { RenderMockupStars } from '../../pages/Integration';

export default function MinimalMockup({ reviews }) {
  return (
    <div className="p-8 max-w-lg mx-auto text-center" style={{ backgroundColor: 'var(--bg-color)' }}>
      <h3 className="text-2xl font-light mb-2 tracking-wide">Reviews</h3>
      <div className="flex justify-center mb-6"><RenderMockupStars rating={5} /></div>
      <button className="mb-8 text-sm hover:underline" style={{ color: 'var(--p-color)' }}>Add your voice</button>
      <div className="space-y-8 text-left">
        {reviews.map(r => (
          <div key={r.id}>
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium tracking-wide">{r.name}</span>
              <RenderMockupStars rating={r.rating} />
            </div>
            <p className="text-sm opacity-70 leading-relaxed font-light">"{r.comment}"</p>
          </div>
        ))}
      </div>
    </div>
  );
}