import { useWidget } from "../../context/WidgetContext";
import StarRating from "../StarRating";
import ReviewForm from "../ReviewForm";
import ReviewCard from "../ReviewCard";
import LoadMoreButton from "../LoadMoreButton";

const GridLayout = () => {
  const { reviews, stats, isFormOpen, setIsFormOpen } = useWidget();
  return (
    <div className="p-6 md:p-8">
      <div className="flex justify-between items-center mb-8 gap-4">
        <div>
          <h3 className="font-bold" style={{ fontSize: 'var(--echo-title-size)' }}>What Customers Say</h3>
          {typeof stats?.totalReviews === 'number' && (
            <p className="text-sm opacity-60 mt-1">{stats.totalReviews} reviews</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="min-h-[44px] px-5 py-2.5 rounded-lg font-medium text-sm transition-opacity hover:opacity-90 shrink-0"
          style={{ backgroundColor: 'var(--echo-primary)', color: 'var(--echo-bg)' }}
        >
          {isFormOpen ? 'Close' : 'Add Review'}
        </button>
      </div>
      <ReviewForm />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        {reviews.length === 0 ? (
          <p className="opacity-50 italic sm:col-span-2">No reviews yet.</p>
        ) : (
          reviews.map((r) => <ReviewCard key={r._id} variant="grid" review={r} />)
        )}
      </div>
      <LoadMoreButton />
    </div>
  );
};

export default GridLayout;
