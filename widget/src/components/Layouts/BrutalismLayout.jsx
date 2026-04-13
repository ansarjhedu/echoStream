import { useWidget } from "../../context/WidgetContext";
import StarRating from "../StarRating";
import ReviewForm from "../ReviewForm";
const BrutalismLayout = () => {
  const { reviews, stats, isFormOpen, setIsFormOpen } = useWidget();
  return (
    <div className="p-6 md:p-8 border-4 border-black" style={{ backgroundColor: 'var(--echo-bg)', color: 'var(--echo-text)' }}>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b-4 border-black pb-6 gap-4">
        <div>
          <h3 className="text-3xl md:text-4xl font-black uppercase tracking-widest mb-2">Reviews</h3>
          <div className="flex items-center gap-3 border-2 border-black px-3 py-1 w-fit" style={{ backgroundColor: 'var(--echo-input)' }}>
            <span className="font-black text-lg">{stats?.avgRating?.toFixed(1)}</span>
            <StarRating rating={Math.round(stats?.avgRating || 0)} />
          </div>
        </div>
        <button onClick={() => setIsFormOpen(!isFormOpen)} className="px-6 py-3 border-4 border-black font-black uppercase tracking-widest transition-transform hover:-translate-y-1 hover:translate-x-1 active:translate-y-0 active:translate-x-0" style={{ backgroundColor: 'var(--echo-primary)', color: '#000', boxShadow: '-4px 4px 0px 0px #000' }}>
          {isFormOpen ? 'CANCEL' : 'LEAVE REVIEW'}
        </button>
      </div>

      <ReviewForm />

      <div className="space-y-8 mt-8 ">
        {reviews.length === 0 ? <p className="font-bold border-2 border-black p-4 text-center">NO REVIEWS YET.</p> : reviews.map(r => (
          <div key={r._id} className="p-5 md:p-6 border-4 border-black transition-transform hover:-translate-y-1 hover:translate-x-1 flex flex-col md:flex-row gap-4 md:gap-8" style={{ backgroundColor: 'var(--echo-input)', boxShadow: '-6px 6px 0px 0px #000' }}>
            
            <div className="shrink-0 md:w-1/4 border-b-2 md:border-b-0 md:border-r-2 border-black pb-4 md:pb-0 md:pr-4">
              <div className="font-black text-xl mb-1 uppercase break-words">{r.customerName}</div>
              <div className="mb-2"><StarRating rating={r.rating} /></div>
              <div className="text-xs font-bold opacity-60 uppercase">{new Date(r.createdAt).toLocaleDateString()}</div>
            </div>
            
            <div className="flex-1">
              <p className="font-medium text-lg leading-relaxed">"{r.comment}"</p>
              
              {r.merchantReply && (
                <div className="mt-4 p-4 border-2 border-black bg-white text-black">
                  <span className="font-black uppercase text-sm block mb-1">STORE RESPONSE:</span>
                  <p className="font-medium">"{r.merchantReply.content}"</p>
                </div>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};
export default BrutalismLayout