import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RenderMockupStars } from './RenderMockupStars';
import MockupReviewCard from './MockupReviewCard';

/**
 * Mirrors widget CarouselLayout — respects Design Lab carousel toggles.
 */
export default function CarouselMockup({
  reviews,
  carouselAutoplay = true,
  carouselIntervalMs = 3500,
  carouselShowArrows = true,
}) {
  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  const mockupReviews = [
    ...reviews,
    { id: 3, name: 'Elena R.', rating: 5, date: '3 weeks ago', comment: 'Fast shipping and amazing support team!' },
    { id: 4, name: 'David K.', rating: 5, date: '1 month ago', comment: '10/10 would buy again. Fits perfectly into my workflow.' },
  ];

  const getScrollStep = useCallback(() => {
    const track = scrollRef.current;
    if (!track) return 336;
    const first = track.querySelector('[data-echo-carousel-card]');
    if (!first) return 336;
    return first.getBoundingClientRect().width + 16;
  }, []);

  useEffect(() => {
    if (!carouselAutoplay || isPaused || mockupReviews.length <= 1) return undefined;
    const intervalMs = Math.min(12000, Math.max(2000, carouselIntervalMs || 3500));
    const id = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const step = getScrollStep();
      if (scrollLeft + clientWidth >= scrollWidth - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: step, behavior: 'smooth' });
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [carouselAutoplay, carouselIntervalMs, isPaused, mockupReviews.length, getScrollStep]);

  const scrollPrev = () => scrollRef.current?.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
  const scrollNext = () => scrollRef.current?.scrollBy({ left: getScrollStep(), behavior: 'smooth' });

  return (
    <div className="p-6 md:p-8" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--t-color)' }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="font-bold mb-1" style={{ fontSize: 'var(--echo-title-size, 1.5rem)' }}>
            Customer Reviews
          </h3>
          <div className="flex items-center gap-2">
            <RenderMockupStars rating={5} />
            <span className="opacity-70 text-sm">124 reviews</span>
          </div>
        </div>
        <button
          type="button"
          className="min-h-[44px] px-5 py-2.5 rounded-full font-bold text-sm"
          style={{ backgroundColor: 'var(--p-color)', color: 'var(--bg-color)' }}
        >
          Write a Review
        </button>
      </div>

      <div
        className="relative group/carousel mt-2"
        onPointerEnter={() => setIsPaused(true)}
        onPointerLeave={() => setIsPaused(false)}
      >
        {carouselShowArrows && mockupReviews.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous reviews"
              onClick={scrollPrev}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 z-10 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center shadow-lg md:opacity-0 md:group-hover/carousel:opacity-100 transition-opacity"
              style={{
                backgroundColor: 'var(--bg-color)',
                color: 'var(--p-color)',
                border: '1px solid var(--echo-border, color-mix(in srgb, var(--t-color) 15%, transparent))',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next reviews"
              onClick={scrollNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 z-10 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center shadow-lg md:opacity-0 md:group-hover/carousel:opacity-100 transition-opacity"
              style={{
                backgroundColor: 'var(--bg-color)',
                color: 'var(--p-color)',
                border: '1px solid var(--echo-border, color-mix(in srgb, var(--t-color) 15%, transparent))',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto no-scrollbar py-2 px-1 snap-x snap-mandatory scroll-smooth touch-pan-x"
        >
          {mockupReviews.map((r) => (
            <div
              key={r.id}
              data-echo-carousel-card
              className="shrink-0 w-[min(85%,280px)] snap-center"
            >
              <MockupReviewCard variant="carousel" review={r} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
