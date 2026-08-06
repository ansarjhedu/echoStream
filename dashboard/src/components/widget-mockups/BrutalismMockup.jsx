import React from 'react';
import { RenderMockupStars } from './RenderMockupStars';
import MockupReviewCard from './MockupReviewCard';

/** Mirrors widget BrutalismLayout */
export default function BrutalismMockup({ reviews }) {
  return (
    <div
      className="p-6 md:p-8 border-4 border-black"
      style={{ backgroundColor: 'var(--bg-color)', color: 'var(--t-color)' }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h3 className="font-black uppercase tracking-widest mb-2" style={{ fontSize: 'var(--echo-title-size, 1.75rem)' }}>
            Reviews
          </h3>
          <div
            className="inline-flex items-center gap-2 px-3 py-1 border-2 border-black text-sm font-bold"
            style={{ backgroundColor: 'var(--echo-input, color-mix(in srgb, var(--t-color) 5%, transparent))' }}
          >
            <RenderMockupStars rating={5} />
            <span>4.5 / 5</span>
          </div>
        </div>
        <button
          type="button"
          className="min-h-[44px] px-5 py-2 font-black uppercase tracking-wider border-4 border-black"
          style={{
            backgroundColor: 'var(--p-color)',
            color: 'var(--bg-color)',
            boxShadow: '4px 4px 0 0 #000',
          }}
        >
          Leave Review
        </button>
      </div>
      <div className="max-h-[500px] overflow-y-auto no-scrollbar space-y-4">
        {reviews.map((r) => (
          <MockupReviewCard key={r.id} variant="brutal" review={r} />
        ))}
      </div>
    </div>
  );
}
