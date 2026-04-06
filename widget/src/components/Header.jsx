import React from 'react';
import { useWidget } from '../context/WidgetContext';
import StarRating from './StarRating';

export default function Header() {
  // Use stats from context (which we updated earlier to pull from DB)
  const { productTitle, stats, isFormOpen, setIsFormOpen } = useWidget();

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 pb-4 md:pb-6 border-b border-white/10 gap-4 md:gap-0">
      
      {/* Title & Stats */}
      <div className="w-full md:w-auto text-center md:text-left">
        <h2 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tight leading-tight">
          {productTitle}
        </h2>
        
        <div className="flex items-center justify-center md:justify-start gap-2 md:gap-4 mt-2">
          <StarRating rating={Math.round(stats?.avgRating || 0)} />
          <span className="text-sm md:text-base text-gray-300 font-medium">
            {(stats?.avgRating || 0).toFixed(1)} <span className="hidden sm:inline">out of 5</span> 
            <span className="text-gray-500 ml-1">({stats?.totalReviews || 0} reviews)</span>
          </span>
        </div>
      </div>
      
      {/* Call to Action Button */}
      <button 
        onClick={() => setIsFormOpen(!isFormOpen)}
        className="w-full md:w-auto px-5 md:px-6 py-3 rounded-xl md:rounded-full font-bold text-white bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all duration-300 text-sm md:text-base"
      >
        {isFormOpen ? 'Cancel' : 'Write a Review'}
      </button>
    </div>
  );
}