import React from 'react';
import { RenderMockupStars } from '../../pages/Integration';

export default function BrutalismMockup({ reviews }) {
  return (
    <div className="p-8 border-4 border-black" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
        <h3 className="text-2xl font-black uppercase tracking-widest">Reviews</h3>
        <button className="px-6 py-2 border-2 border-black font-black uppercase tracking-wider hover:-translate-y-1 hover:translate-x-1 transition-transform" style={{ backgroundColor: 'var(--p-color)', color: '#000', boxShadow: '-4px 4px 0px 0px #000' }}>Review</button>
      </div>
      <div className="space-y-6">
        {reviews.map(r => (
          <div key={r.id} className="p-5 border-2 border-black transition-transform hover:-translate-y-1 hover:translate-x-1" style={{ backgroundColor: '#fff', color: '#000', boxShadow: '-6px 6px 0px 0px #000' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-black text-lg">{r.name}</span>
              <RenderMockupStars rating={r.rating} />
            </div>
            <p className="font-medium">"{r.comment}"</p>
          </div>
        ))}
      </div>
    </div>
  );
}