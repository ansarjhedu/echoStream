import { useWidget } from "../../context/WidgetContext";
import StarRating from "../StarRating";
import ReviewForm from "../ReviewForm";
import ReviewCard from "../ReviewCard";
import LoadMoreButton from "../LoadMoreButton";
import { useState, useEffect, useRef, useCallback } from "react";

const CarouselLayout = () => {
  const { reviews, stats, isFormOpen, setIsFormOpen, activeReview, config } = useWidget();
  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const autoplay = config?.carouselAutoplay !== false;
  const showArrows = config?.carouselShowArrows !== false;
  const intervalMs = Math.min(12000, Math.max(2000, config?.carouselIntervalMs || 3500));

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPrefersReducedMotion(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  const getScrollStep = useCallback(() => {
    const track = scrollRef.current;
    if (!track) return 320;
    const firstCard = track.querySelector('[data-echo-carousel-card]');
    if (!firstCard) return 320;
    const gap = 16; // gap-4
    return firstCard.getBoundingClientRect().width + gap;
  }, []);

  const scrollPrev = () => {
    scrollRef.current?.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
  };

  const scrollNext = () => {
    scrollRef.current?.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
  };

  // Autoplay: pause on hover/touch, when detail modal is open, or reduced-motion
  useEffect(() => {
    if (!autoplay || prefersReducedMotion || isPaused || activeReview || reviews.length <= 1) {
      return undefined;
    }

    const interval = setInterval(() => {
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

    return () => clearInterval(interval);
  }, [autoplay, intervalMs, prefersReducedMotion, isPaused, activeReview, reviews.length, getScrollStep]);

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="font-bold mb-1" style={{ fontSize: 'var(--echo-title-size)' }}>Customer Reviews</h3>
          <div className="flex items-center gap-2">
            <StarRating rating={Math.round(stats?.avgRating || 0)} />
            <span className="opacity-70 text-sm">{stats?.totalReviews} reviews</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="min-h-[44px] px-5 py-2.5 rounded-full font-bold text-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--echo-primary)', color: 'var(--echo-bg)' }}
        >
          {isFormOpen ? 'Close Form' : 'Write a Review'}
        </button>
      </div>

      <ReviewForm />

      <div
        className="relative group/carousel mt-2"
        onPointerEnter={() => setIsPaused(true)}
        onPointerLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        onTouchCancel={() => setIsPaused(false)}
      >
        {showArrows && reviews.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous reviews"
              onClick={scrollPrev}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 md:-translate-x-3 z-10 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center shadow-lg md:opacity-0 md:group-hover/carousel:opacity-100 transition-opacity"
              style={{
                backgroundColor: 'var(--echo-bg)',
                color: 'var(--echo-primary)',
                border: '1px solid var(--echo-border)',
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
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 md:translate-x-3 z-10 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center shadow-lg md:opacity-0 md:group-hover/carousel:opacity-100 transition-opacity"
              style={{
                backgroundColor: 'var(--echo-bg)',
                color: 'var(--echo-primary)',
                border: '1px solid var(--echo-border)',
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
          className="flex gap-4 overflow-x-auto no-scrollbar py-2 px-1 snap-x snap-mandatory touch-pan-x scroll-smooth"
        >
          {reviews.length === 0 ? (
            <p className="opacity-50 italic pl-2">No reviews yet.</p>
          ) : (
            reviews.map((r) => (
              <div
                key={r._id}
                data-echo-carousel-card
                className="w-[min(85vw,320px)] shrink-0 snap-center"
              >
                <ReviewCard variant="carousel" review={r} />
              </div>
            ))
          )}
        </div>
      </div>

      <LoadMoreButton />
    </div>
  );
};

export default CarouselLayout;
