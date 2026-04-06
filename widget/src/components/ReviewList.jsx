import React from 'react';
import { useWidget } from '../context/WidgetContext';
import ReviewCard from './ReviewCard';

export default function ReviewList() {
  const { reviews, loading } = useWidget();

  if (loading) return (
    <div className="flex justify-center items-center py-8 md:py-12">
      <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
    </div>
  );

  if (reviews.length === 0) return (
    <div className="text-center py-8 md:py-12 text-gray-500">
      <div className="text-4xl md:text-6xl mb-3 md:mb-4 opacity-50">✨</div>
      <p className="text-sm md:text-base">No reviews yet. Be the pioneer.</p>
    </div>
  );

  return (
    // Fixed: Now uses 400px height on mobile, 600px on desktop to force the custom scrollbar!
    <div className="space-y-4 md:space-y-6 max-h-[400px] md:max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
      {reviews.map((rev) => <ReviewCard key={rev._id} review={rev} />)}
    </div>
  );
}