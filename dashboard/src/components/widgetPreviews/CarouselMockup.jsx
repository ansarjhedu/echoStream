import React, { useRef, useState, useEffect } from 'react';
import { RenderMockupStars } from '../../pages/Integration';

export default function CarouselMockup({ reviews }) {
  const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const mockupReviews =[
    ...reviews, 
    { id: 3, name: "Elena R.", rating: 5, date: "3 weeks ago", comment: "Fast shipping and amazing support team!" },
    { id: 4, name: "David K.", rating: 5, date: "1 month ago", comment: "10/10 would buy again. Fits perfectly into my workflow." }
  ];

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: 250, behavior: 'smooth' });
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isHovered]);

  const scrollPrev = () => scrollRef.current?.scrollBy({ left: -250, behavior: 'smooth' });
  const scrollNext = () => scrollRef.current?.scrollBy({ left: 250, behavior: 'smooth' });

  return (
    <div className="p-6 overflow-hidden" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Latest Reviews</h3>
        <button className="text-sm font-bold underline" style={{ color: 'var(--p-color)' }}>Write Review</button>
      </div>

      <div 
        className="relative group/carousel"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button onClick={scrollPrev} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/carousel:opacity-100 transition-opacity" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--p-color)', border: '1px solid var(--echo-border)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button onClick={scrollNext} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/carousel:opacity-100 transition-opacity" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--p-color)', border: '1px solid var(--echo-border)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6"/></svg>
        </button>

        <div ref={scrollRef} className="flex gap-4 overflow-x-auto no-scrollbar py-2 px-1 snap-x scroll-smooth">
          {mockupReviews.map(r => (
            <div key={r.id} className="p-5 rounded-2xl shrink-0 w-[240px] snap-center border shadow-sm flex flex-col justify-between" style={{ backgroundColor: 'color-mix(in srgb, var(--t-color) 2%, transparent)', borderColor: 'var(--echo-border)' }}>
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="font-bold">{r.name}</div>
                  <RenderMockupStars rating={r.rating} />
                </div>
                <p className="text-sm opacity-80 line-clamp-3 mb-2">"{r.comment}"</p>
              </div>
              <div className="text-xs opacity-50">{r.date}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}