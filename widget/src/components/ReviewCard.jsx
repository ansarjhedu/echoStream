import React from 'react';
import { BadgeCheck } from 'lucide-react';
import StarRating from './StarRating';
import { useWidget } from '../context/WidgetContext';

const VARIANT_STYLES = {
  list: 'p-5 rounded-2xl border shadow-sm hover:shadow-md',
  classic: 'p-5 rounded-none border-0 border-b px-0 shadow-none',
  glass: 'p-5 rounded-2xl border shadow-sm backdrop-blur-md hover:shadow-md',
  grid: 'p-4 rounded-2xl border shadow-sm h-full hover:shadow-md',
  carousel: 'p-5 rounded-2xl border shadow-sm h-full hover:shadow-md',
  brutal: 'p-5 md:p-6 rounded-none border-4 border-black shadow-[-4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:translate-x-0.5',
  minimal: 'p-4 rounded-none border-0 border-b px-0 shadow-none',
};

const CLAMP = {
  list: 'line-clamp-2',
  classic: 'line-clamp-2',
  glass: 'line-clamp-2',
  carousel: 'line-clamp-2',
  brutal: 'line-clamp-2',
  minimal: 'line-clamp-2',
  grid: 'line-clamp-3',
};

const TRANSPARENT_BG = new Set(['minimal', 'classic']);

/**
 * Compact stream card. Full detail lives in ReviewDetailModal.
 * @param {'list'|'classic'|'grid'|'carousel'|'brutal'|'minimal'|'glass'} variant
 */
const ReviewCard = ({ review, variant = 'list', minimal = false }) => {
  const { openReviewDetail, isEcom } = useWidget();
  const resolvedVariant = minimal && variant === 'list' ? 'minimal' : variant;
  const shell = VARIANT_STYLES[resolvedVariant] || VARIANT_STYLES.list;
  const clamp = CLAMP[resolvedVariant] || CLAMP.list;
  const photoCount = Array.isArray(review.images) ? review.images.length : 0;

  const onActivate = () => openReviewDetail(review);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={onKeyDown}
      className={`${shell} min-h-[44px] cursor-pointer transition-all text-left outline-none focus-visible:ring-2`}
      style={{
        backgroundColor: TRANSPARENT_BG.has(resolvedVariant) ? 'transparent' : 'var(--echo-input)',
        borderColor: resolvedVariant === 'brutal' ? '#000' : 'var(--echo-border)',
        ['--tw-ring-color']: 'var(--echo-primary)',
      }}
      aria-label={`Open review by ${review.customerName}`}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0"
            style={{ backgroundColor: 'var(--echo-primary)', color: 'var(--echo-bg)' }}
          >
            {(review.customerName || '?').charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-bold truncate">{review.customerName}</h4>
              {review.isVerifiedBuyer && (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border shrink-0"
                  style={{
                    color: 'var(--echo-primary)',
                    borderColor: 'var(--echo-primary)',
                    backgroundColor: 'var(--echo-bg)',
                  }}
                >
                  <BadgeCheck size={10} /> Verified
                </span>
              )}
              {review.source === 'google' && (
                <span
                  className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border shrink-0 opacity-80"
                  style={{
                    borderColor: 'var(--echo-border)',
                    backgroundColor: 'var(--echo-bg)',
                  }}
                >
                  Google
                </span>
              )}
            </div>
            <span className="text-xs opacity-50">
              {new Date(review.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <StarRating rating={review.rating} />
      </div>

      <p className={`text-sm opacity-90 leading-relaxed ${clamp}`}>{review.comment}</p>

      {isEcom && photoCount > 0 && (
        <div className="mt-3">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border"
            style={{
              borderColor: 'var(--echo-border)',
              backgroundColor: 'var(--echo-bg)',
              color: 'var(--echo-text)',
            }}
          >
            <span aria-hidden="true">📷</span>
            {photoCount} {photoCount === 1 ? 'Photo' : 'Photos'}
          </span>
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
