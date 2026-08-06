import React from 'react';
import { RenderMockupStars } from './RenderMockupStars';
import MockupReviewCard from './MockupReviewCard';

/** Mirrors widget ClassicLayout (distribution + CTA panel) */
export default function ClassicMockup({ reviews }) {
  const distribution = { 5: 62, 4: 24, 3: 8, 2: 4, 1: 2 };

  return (
    <div className="p-6 md:p-8" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--t-color)' }}>
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 pb-8 border-b"
        style={{ borderColor: 'var(--echo-border, color-mix(in srgb, var(--t-color) 15%, transparent))' }}
      >
        <div className="md:col-span-1">
          <h3 className="font-bold mb-4" style={{ fontSize: 'var(--echo-title-size, 1.25rem)' }}>
            Customer Reviews
          </h3>
          <div className="flex items-center gap-2 mb-2">
            <RenderMockupStars rating={5} />
            <span className="text-xl font-bold">4.5 out of 5</span>
          </div>
          <p className="opacity-60 text-sm mb-6">124 global ratings</p>
          {[5, 4, 3, 2, 1].map((num) => (
            <div key={num} className="flex items-center gap-3 mb-2 text-sm">
              <span className="w-12 text-right opacity-80 whitespace-nowrap">{num} star</span>
              <div
                className="flex-1 h-4 rounded-full overflow-hidden border"
                style={{
                  backgroundColor: 'var(--echo-input, color-mix(in srgb, var(--t-color) 5%, transparent))',
                  borderColor: 'var(--echo-border, color-mix(in srgb, var(--t-color) 15%, transparent))',
                }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${distribution[num]}%`, backgroundColor: 'var(--p-color)' }}
                />
              </div>
              <span className="w-9 opacity-60 text-right">{distribution[num]}%</span>
            </div>
          ))}
        </div>
        <div
          className="md:col-span-2 flex flex-col justify-center items-start md:pl-8 md:border-l"
          style={{ borderColor: 'var(--echo-border, color-mix(in srgb, var(--t-color) 15%, transparent))' }}
        >
          <h4 className="font-bold mb-2">Review this product</h4>
          <p className="opacity-70 text-sm mb-4">Share your thoughts with other customers</p>
          <button
            type="button"
            className="w-full md:w-auto min-h-[44px] px-8 py-2 border rounded-md font-bold"
            style={{ borderColor: 'var(--p-color)', color: 'var(--p-color)' }}
          >
            Write a customer review
          </button>
        </div>
      </div>
      <div className="max-h-[500px] overflow-y-auto no-scrollbar space-y-4 md:space-y-6 pr-1">
        {reviews.map((r) => (
          <MockupReviewCard key={r.id} variant="classic" review={r} />
        ))}
      </div>
    </div>
  );
}
