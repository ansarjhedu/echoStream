import React from 'react';
import { useWidget } from "../../context/WidgetContext";
import StarRating from "../StarRating";
import ReviewCard from "../ReviewCard";
import ReviewForm from "../ReviewForm";
import LoadMoreButton from "../LoadMoreButton";

const GlassmorphismLayout = () => {
  const { reviews, stats, isFormOpen, setIsFormOpen } = useWidget();
  return (
    <div className="p-6 md:p-10 relative">
      <div className="absolute top-0 left-0 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none" style={{ backgroundColor: 'var(--echo-primary)' }} />
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b" style={{ borderColor: 'var(--echo-border)' }}>
          <div>
            <h2 className="font-extrabold tracking-tight" style={{ fontSize: 'var(--echo-title-size)' }}>Customer Reviews</h2>
            <div className="flex items-center gap-3 mt-2">
              <StarRating rating={Math.round(stats?.avgRating || 0)} />
              <span className="opacity-80 text-sm">
                {stats?.avgRating?.toFixed(1)} out of 5 ({stats?.totalReviews} reviews)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="mt-4 md:mt-0 min-h-[44px] px-6 py-3 rounded-full font-bold shadow-lg transition-transform hover:scale-105"
            style={{ backgroundColor: 'var(--echo-primary)', color: 'var(--echo-bg)' }}
          >
            {isFormOpen ? 'Cancel' : 'Write a Review'}
          </button>
        </div>
        <ReviewForm />

        <div className="max-h-[500px] overflow-y-auto no-scrollbar space-y-4 md:space-y-6 pr-1">
          {reviews.length === 0 ? (
            <p className="opacity-50 italic">No reviews yet.</p>
          ) : (
            reviews.map((r) => <ReviewCard key={r._id} variant="glass" review={r} />)
          )}
        </div>
        <LoadMoreButton />
      </div>
    </div>
  );
};

export default GlassmorphismLayout;
