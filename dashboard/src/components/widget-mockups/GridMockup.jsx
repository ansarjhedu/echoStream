import React from 'react';
import MockupReviewCard from './MockupReviewCard';

/** Mirrors widget GridLayout */
export default function GridMockup({ reviews }) {
  return (
    <div className="p-6" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--t-color)' }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold" style={{ fontSize: 'var(--echo-title-size, 1.5rem)' }}>
            What Customers Say
          </h3>
          <p className="text-sm opacity-60 mt-1">124 reviews</p>
        </div>
        <button
          type="button"
          className="min-h-[44px] px-4 py-2 rounded-lg font-bold text-sm"
          style={{ backgroundColor: 'var(--p-color)', color: 'var(--bg-color)' }}
        >
          Add Review
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reviews.map((r) => (
          <MockupReviewCard key={r.id} variant="grid" review={r} />
        ))}
      </div>
    </div>
  );
}
