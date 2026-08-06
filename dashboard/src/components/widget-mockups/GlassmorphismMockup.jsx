import React from 'react';
import { RenderMockupStars } from './RenderMockupStars';
import MockupReviewCard from './MockupReviewCard';

/** Mirrors widget GlassmorphismLayout */
export default function GlassmorphismMockup({ reviews }) {
  return (
    <div className="p-6 md:p-10 relative" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--t-color)' }}>
      <div
        className="absolute top-0 left-0 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none"
        style={{ backgroundColor: 'var(--p-color)' }}
      />
      <div className="relative z-10">
        <div
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b"
          style={{ borderColor: 'var(--echo-border, color-mix(in srgb, var(--t-color) 15%, transparent))' }}
        >
          <div>
            <h2 className="font-extrabold tracking-tight" style={{ fontSize: 'var(--echo-title-size, 1.5rem)' }}>
              Customer Reviews
            </h2>
            <div className="flex items-center gap-3 mt-2">
              <RenderMockupStars rating={5} />
              <span className="opacity-80 text-sm">4.5 out of 5 (124 reviews)</span>
            </div>
          </div>
          <button
            type="button"
            className="mt-4 md:mt-0 min-h-[44px] px-6 py-3 rounded-full font-bold shadow-lg"
            style={{ backgroundColor: 'var(--p-color)', color: 'var(--bg-color)' }}
          >
            Write a Review
          </button>
        </div>
        <div className="max-h-[500px] overflow-y-auto no-scrollbar space-y-4 md:space-y-6 pr-1">
          {reviews.map((r) => (
            <MockupReviewCard key={r.id} variant="glass" review={r} />
          ))}
        </div>
      </div>
    </div>
  );
}
