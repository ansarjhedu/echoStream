import React from 'react';
import { useWidget } from "../../context/WidgetContext";
import StarRating from "../StarRating";
import ReviewCard from "../ReviewCard";
import ReviewForm from "../ReviewForm";
import LoadMoreButton from "../LoadMoreButton";

const ClassicLayout = () => {
  const { reviews, stats, isFormOpen, setIsFormOpen } = useWidget();
  const distribution = stats?.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  return (
    <div className="p-6 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 pb-8 border-b" style={{ borderColor: 'var(--echo-border)' }}>
        <div className="md:col-span-1">
          <h3 className="font-bold mb-4" style={{ fontSize: 'var(--echo-title-size)' }}>Customer Reviews</h3>
          <div className="flex items-center gap-2 mb-2">
            <StarRating rating={Math.round(stats?.avgRating || 0)} />
            <span className="text-xl font-bold">{stats?.avgRating?.toFixed(1)} out of 5</span>
          </div>
          <p className="opacity-60 text-sm mb-6">{stats?.totalReviews} global ratings</p>

          {[5, 4, 3, 2, 1].map((num) => {
            const count = distribution[num] || 0;
            const percent = stats?.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
            return (
              <div key={num} className="flex items-center gap-3 mb-2 text-sm">
                <span className="w-12 text-right opacity-80 whitespace-nowrap">{num} star</span>
                <div
                  className="flex-1 h-4 rounded-full overflow-hidden border"
                  style={{ backgroundColor: 'var(--echo-input)', borderColor: 'var(--echo-border)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${percent}%`, backgroundColor: 'var(--echo-primary)' }}
                  />
                </div>
                <span className="w-9 opacity-60 text-right">{Math.round(percent)}%</span>
              </div>
            );
          })}
        </div>

        <div
          className="md:col-span-2 flex flex-col justify-center items-start md:pl-8 md:border-l"
          style={{ borderColor: 'var(--echo-border)' }}
        >
          <h4 className="font-bold mb-2">Review this product</h4>
          <p className="opacity-70 text-sm mb-4">Share your thoughts with other customers</p>
          <button
            type="button"
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="w-full md:w-auto min-h-[44px] px-8 py-2 border rounded-md font-bold transition-opacity hover:opacity-80"
            style={{ borderColor: 'var(--echo-primary)', color: 'var(--echo-primary)' }}
          >
            {isFormOpen ? 'Cancel' : 'Write a customer review'}
          </button>
        </div>
      </div>

      <ReviewForm />

      <div className="max-h-[500px] overflow-y-auto no-scrollbar space-y-4 md:space-y-6 pr-1">
        {reviews.length === 0 ? (
          <p className="opacity-50">No customer reviews yet.</p>
        ) : (
          reviews.map((r) => <ReviewCard key={r._id} variant="classic" review={r} />)
        )}
      </div>

      <LoadMoreButton />
    </div>
  );
};

export default ClassicLayout;
