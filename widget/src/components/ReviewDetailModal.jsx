import React, { useEffect, useState } from 'react';
import { X, BadgeCheck } from 'lucide-react';
import { useWidget } from '../context/WidgetContext';
import StarRating from './StarRating';

export default function ReviewDetailModal() {
  const { activeReview, closeReviewDetail, isEcom } = useWidget();
  const [zoomImg, setZoomImg] = useState(null);

  useEffect(() => {
    if (!activeReview) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (zoomImg) setZoomImg(null);
        else closeReviewDetail();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [activeReview, closeReviewDetail, zoomImg]);

  useEffect(() => {
    if (!activeReview) setZoomImg(null);
  }, [activeReview]);

  if (!activeReview) return null;

  const images = Array.isArray(activeReview.images) ? activeReview.images : [];
  const dateLabel = new Date(activeReview.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <div
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4"
        onClick={closeReviewDetail}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="echo-review-detail-title"
          className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar rounded-t-2xl sm:rounded-2xl border shadow-2xl animate-fade-in-down"
          style={{
            backgroundColor: 'var(--echo-bg)',
            color: 'var(--echo-text)',
            borderColor: 'var(--echo-border)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-b backdrop-blur-md"
            style={{ backgroundColor: 'var(--echo-bg)', borderColor: 'var(--echo-border)' }}
          >
            <h3 id="echo-review-detail-title" className="font-bold text-base truncate pr-2">
              Review details
            </h3>
            <button
              type="button"
              aria-label="Close review details"
              onClick={closeReviewDetail}
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full border transition-opacity hover:opacity-80"
              style={{ borderColor: 'var(--echo-border)', color: 'var(--echo-text)' }}
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold shrink-0"
                style={{ backgroundColor: 'var(--echo-primary)', color: 'var(--echo-bg)' }}
              >
                {(activeReview.customerName || '?').charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-bold text-lg">{activeReview.customerName}</h4>
                  {activeReview.isVerifiedBuyer && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border"
                      style={{
                        color: 'var(--echo-primary)',
                        borderColor: 'var(--echo-primary)',
                        backgroundColor: 'var(--echo-input)',
                      }}
                    >
                      <BadgeCheck size={12} /> Verified Buyer
                    </span>
                  )}
                </div>
                <p className="text-xs opacity-50 mt-1">{dateLabel}</p>
              </div>
            </div>

            <StarRating rating={activeReview.rating} />

            <p className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap">
              {activeReview.comment}
            </p>

            {isEcom && images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {images.map((img, idx) => (
                  <button
                    key={`${activeReview._id || 'rev'}-img-${idx}`}
                    type="button"
                    onClick={() => setZoomImg(img)}
                    className="relative aspect-square rounded-xl overflow-hidden border min-h-[44px] focus:outline-none focus:ring-2"
                    style={{ borderColor: 'var(--echo-border)', ['--tw-ring-color']: 'var(--echo-primary)' }}
                  >
                    <img src={img} alt={`Review photo ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {isEcom && activeReview.merchantReply?.content && (
              <div
                className="p-4 rounded-xl border-l-4"
                style={{ backgroundColor: 'var(--echo-input)', borderColor: 'var(--echo-primary)' }}
              >
                <span className="font-bold text-xs block mb-1 opacity-60 uppercase tracking-widest">
                  Store Reply
                </span>
                <p className="text-sm opacity-90 whitespace-pre-wrap">
                  {activeReview.merchantReply.content}
                </p>
                {activeReview.merchantReply.createdAt && (
                  <p className="text-[10px] opacity-40 mt-2">
                    {new Date(activeReview.merchantReply.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {zoomImg && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomImg(null)}
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close image zoom"
            className="absolute top-4 right-4 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setZoomImg(null)}
          >
            <X size={22} />
          </button>
          <img
            src={zoomImg}
            alt="Expanded review photo"
            className="max-w-full max-h-[85vh] object-contain rounded-lg border border-white/20"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
