import React from 'react';
import { RenderMockupStars } from './RenderMockupStars';

const VARIANT_STYLES = {
  glass: 'p-5 rounded-2xl border shadow-sm backdrop-blur-md',
  classic: 'p-5 rounded-none border-0 border-b px-0 shadow-none',
  minimal: 'p-4 rounded-none border-0 border-b px-0 shadow-none',
  grid: 'p-4 rounded-2xl border shadow-sm h-full',
  carousel: 'p-5 rounded-2xl border shadow-sm h-full',
  brutal:
    'p-5 md:p-6 rounded-none border-4 border-black shadow-[-4px_4px_0px_0px_rgba(0,0,0,1)]',
};

const CLAMP = {
  glass: 'line-clamp-2',
  classic: 'line-clamp-2',
  minimal: 'line-clamp-2',
  carousel: 'line-clamp-2',
  brutal: 'line-clamp-2',
  grid: 'line-clamp-3',
};

const TRANSPARENT = new Set(['minimal', 'classic']);

/**
 * Mirrors live widget ReviewCard chrome so Design Lab / Catalog previews match embeds.
 */
export default function MockupReviewCard({ review, variant = 'glass' }) {
  const shell = VARIANT_STYLES[variant] || VARIANT_STYLES.glass;
  const clamp = CLAMP[variant] || CLAMP.glass;
  const name = review.name || review.customerName || 'Guest';
  const dateLabel =
    review.date ||
    (review.createdAt ? new Date(review.createdAt).toLocaleDateString() : '');

  return (
    <div
      className={`${shell} text-left`}
      style={{
        backgroundColor: TRANSPARENT.has(variant)
          ? 'transparent'
          : 'var(--echo-input, color-mix(in srgb, var(--t-color) 5%, transparent))',
        borderColor:
          variant === 'brutal'
            ? '#000'
            : 'var(--echo-border, color-mix(in srgb, var(--t-color) 15%, transparent))',
      }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0"
            style={{ backgroundColor: 'var(--p-color)', color: 'var(--bg-color)' }}
          >
            {name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold truncate">{name}</h4>
            {dateLabel && <span className="text-xs opacity-50">{dateLabel}</span>}
          </div>
        </div>
        <RenderMockupStars rating={review.rating} />
      </div>
      <p className={`text-sm opacity-90 leading-relaxed ${clamp}`}>{review.comment}</p>
    </div>
  );
}
