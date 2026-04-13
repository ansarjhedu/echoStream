import { useWidget } from "../../context/WidgetContext";
import StarRating from "../StarRating";
const GridLayout = () => {
  const { reviews, stats, isFormOpen, setIsFormOpen } = useWidget();
  return (
    <div className="p-6 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-2xl font-bold">What Customers Say</h3>
        <button onClick={() => setIsFormOpen(!isFormOpen)} className="px-5 py-2.5 rounded-lg font-medium text-sm transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--echo-primary)', color: 'var(--echo-bg)' }}>
          {isFormOpen ? 'Close' : 'Add Review'}
        </button>
      </div>
      <ReviewForm />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.map(r => (
          <div key={r._id} className="p-6 rounded-xl border shadow-sm flex flex-col justify-between" style={{ backgroundColor: 'var(--echo-input)', borderColor: 'var(--echo-border)' }}>
            <div>
              <div className="mb-4"><StarRating rating={r.rating} /></div>
              <p className="text-sm opacity-90 mb-6 leading-relaxed">"{r.comment}"</p>
            </div>
            <div className="text-xs opacity-60 font-medium uppercase tracking-wider">— {r.customerName}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default GridLayout