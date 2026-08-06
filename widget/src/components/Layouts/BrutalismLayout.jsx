import React from 'react';
import { useWidget } from "../../context/WidgetContext";
import StarRating from "../StarRating";
import ReviewForm from "../ReviewForm";
import ReviewCard from "../ReviewCard";
import LoadMoreButton from "../LoadMoreButton";

const BrutalismLayout = () => {
  const { reviews, stats, isFormOpen, setIsFormOpen } = useWidget();
  return (
    <div className="p-6 md:p-8 border-4 border-black" style={{ backgroundColor: 'var(--echo-bg)', color: 'var(--echo-text)' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b-4 border-black pb-6 gap-4">
        <div>
          <h3 className="font-black uppercase tracking-widest mb-2" style={{ fontSize: 'var(--echo-title-size)' }}>Reviews</h3>
          <div
            className="flex items-center gap-3 border-2 border-black px-3 py-1 w-fit"
            style={{ backgroundColor: 'var(--echo-input)' }}
          >
            <span className="font-black text-lg">{stats?.avgRating?.toFixed(1)}</span>
            <StarRating rating={Math.round(stats?.avgRating || 0)} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="min-h-[44px] px-6 py-3 border-4 border-black font-black uppercase tracking-widest transition-transform hover:-translate-y-1 hover:translate-x-1 active:translate-y-0 active:translate-x-0"
          style={{
            backgroundColor: 'var(--echo-primary)',
            color: '#000',
            boxShadow: '-4px 4px 0px 0px #000',
          }}
        >
          {isFormOpen ? 'Cancel' : 'Leave Review'}
        </button>
      </div>

      <ReviewForm />

      <div className="max-h-[500px] overflow-y-auto no-scrollbar space-y-6 mt-8 p-1">
        {reviews.length === 0 ? (
          <p className="font-bold border-2 border-black p-4 text-center">NO REVIEWS YET.</p>
        ) : (
          reviews.map((r) => <ReviewCard key={r._id} variant="brutal" review={r} />)
        )}
      </div>
      <LoadMoreButton />
    </div>
  );
};

export default BrutalismLayout;
