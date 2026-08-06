import { Star } from 'lucide-react';

/** Shared star row for dashboard widget mockups (Design Lab / Catalog). */
export const RenderMockupStars = ({ rating }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        size={14}
        className={i <= rating ? '' : 'opacity-30'}
        style={{
          fill: i <= rating ? 'var(--p-color)' : 'none',
          color: 'var(--p-color)',
        }}
      />
    ))}
  </div>
);
