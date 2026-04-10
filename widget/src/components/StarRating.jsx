import React from 'react';

export default function StarRating({ rating, interactive = false, onHover, onClick }) {
  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          onClick={() => interactive && onClick && onClick(star)}
          onMouseEnter={() => interactive && onHover && onHover(star)}
          className={`w-4 h-4 md:w-5 md:h-5 shrink-0 transition-all duration-300 ${interactive ? 'cursor-pointer hover:scale-110' : ''}`}
          style={{ 
            fill: star <= rating ? 'var(--echo-primary)' : 'none', 
            color: star <= rating ? 'var(--echo-primary)' : 'var(--echo-border)',
            stroke: 'currentColor',
            strokeWidth: 2
          }}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="none" />
        </svg>
      ))}
    </div>
  );
}