import React from 'react';

export default function StarRating({ rating, interactive = false, onHover, onClick }) {
  return (
    // Reduced gap on mobile to save space, expands on desktop
    <div className="flex items-center gap-0.5 sm:gap-1 md:gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          onClick={() => interactive && onClick && onClick(star)}
          onMouseEnter={() => interactive && onHover && onHover(star)}
          // w-4 h-4 on tiny screens, w-5 h-5 on standard mobile, w-6 h-6 on desktop. shrink-0 prevents distortion.
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6 shrink-0 transition-all duration-300 ${
            interactive ? 'cursor-pointer hover:scale-110' : ''
          } ${
            star <= rating 
              ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] fill-current' 
              : 'text-gray-600 fill-current'
          }`}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}