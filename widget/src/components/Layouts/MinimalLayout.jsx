import StarRating from "../StarRating";
import { useWidget } from "../../context/WidgetContext";
const MinimalLayout = () => {
  const { reviews, stats, isFormOpen, setIsFormOpen } = useWidget();
  return (
    <div className="p-8 max-w-2xl mx-auto text-center">
      <h3 className="text-3xl font-light mb-3 tracking-wide">Reviews</h3>
      <div className="flex justify-center items-center gap-3 mb-6">
        <StarRating rating={Math.round(stats?.avgRating || 0)} />
        <span className="opacity-60 text-sm">({stats?.totalReviews})</span>
      </div>
      <button onClick={() => setIsFormOpen(!isFormOpen)} className="mb-10 text-sm hover:underline font-medium uppercase tracking-widest" style={{ color: 'var(--echo-primary)' }}>
        {isFormOpen ? 'Cancel' : 'Add your voice'}
      </button>
      <ReviewForm />
      <div className="space-y-10 text-left mt-8">
        {reviews.map(r => (
          <div key={r._id}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium tracking-wide">{r.customerName}</span>
              <StarRating rating={r.rating} />
            </div>
            <p className="text-sm opacity-70 leading-relaxed font-light">"{r.comment}"</p>
            {r.merchantReply && <p className="text-xs opacity-50 mt-2 pl-4 border-l-2" style={{ borderColor: 'var(--echo-primary)' }}>Store: {r.merchantReply.content}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
export default MinimalLayout