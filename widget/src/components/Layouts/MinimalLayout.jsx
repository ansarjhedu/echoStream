import StarRating from "../StarRating";
import { useWidget } from "../../context/WidgetContext";
import ReviewForm from "../ReviewForm";
import ReviewCard from "../ReviewCard";
import LoadMoreButton from "../LoadMoreButton";

const MinimalLayout = () => {
  const { reviews, stats, isFormOpen, setIsFormOpen } = useWidget();
  return (
    <div className="p-8 max-w-2xl mx-auto text-center">
      <h3 className="font-light mb-3 tracking-wide" style={{ fontSize: 'var(--echo-title-size)' }}>Reviews</h3>
      <div className="flex justify-center items-center gap-3 mb-6">
        <StarRating rating={Math.round(stats?.avgRating || 0)} />
        <span className="opacity-60 text-sm">({stats?.totalReviews})</span>
      </div>
      <button
        type="button"
        onClick={() => setIsFormOpen(!isFormOpen)}
        className="mb-10 min-h-[44px] text-sm hover:underline font-medium uppercase tracking-widest"
        style={{ color: 'var(--echo-primary)' }}
      >
        {isFormOpen ? 'Cancel' : 'Add your voice'}
      </button>
      <ReviewForm />

      <div className="max-h-[500px] overflow-y-auto no-scrollbar space-y-6 text-left mt-8">
        {reviews.length === 0 ? (
          <p className="opacity-50 italic text-center">No reviews yet.</p>
        ) : (
          reviews.map((r) => <ReviewCard key={r._id} variant="minimal" review={r} />)
        )}
      </div>
      <LoadMoreButton />
    </div>
  );
};

export default MinimalLayout;
