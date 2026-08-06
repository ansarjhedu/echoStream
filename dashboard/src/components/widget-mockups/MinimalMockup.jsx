import React from 'react';
import { RenderMockupStars } from './RenderMockupStars';
import MockupReviewCard from './MockupReviewCard';

/** Mirrors widget MinimalLayout */
export default function MinimalMockup({ reviews }) {
  return (
    <div className="p-8 max-w-2xl mx-auto" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--t-color)' }}>
      <div className="text-center mb-10">
        <h3 className="font-light mb-3 tracking-wide" style={{ fontSize: 'var(--echo-title-size, 1.75rem)' }}>
          Reviews
        </h3>
        <div className="flex justify-center items-center gap-2 mb-4">
          <RenderMockupStars rating={5} />
          <span className="opacity-60 text-sm">(124)</span>
        </div>
        <button type="button" className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--p-color)' }}>
          Add your voice
        </button>
      </div>
      <div className="max-h-[500px] overflow-y-auto no-scrollbar space-y-2">
        {reviews.map((r) => (
          <MockupReviewCard key={r.id} variant="minimal" review={r} />
        ))}
      </div>
    </div>
  );
}
