import { useWidget } from "../../context/WidgetContext";
import StarRating from "../StarRating";
import ReviewForm from "../ReviewForm";
import { useState,useEffect,useRef} from "react";
const CarouselLayout = () => {
  const { reviews, stats, isFormOpen, setIsFormOpen } = useWidget();
  const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // 🔄 Auto-Scroll Logic
  useEffect(() => {
    // Pause auto-scroll if user hovers over it, or if there aren't enough reviews
    if (isHovered || reviews.length <= 1) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        // If we reached the end of the scroll, instantly snap back to the beginning
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          // Scroll forward by roughly one card width (300px)
          scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
      }
    }, 3500); // ⏱️ Auto-scrolls every 3.5 seconds

    return () => clearInterval(interval);
  }, [isHovered, reviews.length]);

  // ⬅️ ➡️ Manual Arrow Handlers
  const scrollPrev = () => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  const scrollNext = () => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' });

  return (
    <div className="p-6 md:p-8">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-2xl font-bold mb-1">Customer Reviews</h3>
          <div className="flex items-center gap-2">
            <StarRating rating={Math.round(stats?.avgRating || 0)} />
            <span className="opacity-70 text-sm">{stats?.totalReviews} reviews</span>
          </div>
        </div>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)} 
          className="px-5 py-2.5 rounded-full font-bold text-sm transition-opacity hover:opacity-90" 
          style={{ backgroundColor: 'var(--echo-primary)', color: 'var(--echo-bg)' }}
        >
          {isFormOpen ? 'Close Form' : 'Write a Review'}
        </button>
      </div>
      
      <ReviewForm />
      
      {/* THE CAROUSEL CONTAINER */}
      <div 
        className="relative group/carousel mt-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        
        {/* Navigation Arrows (Visible on hover on desktop, always there but subtle on mobile) */}
        {reviews.length > 1 && (
          <>
            <button onClick={scrollPrev} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-4 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg md:opacity-0 md:group-hover/carousel:opacity-100 transition-opacity" style={{ backgroundColor: 'var(--echo-bg)', color: 'var(--echo-primary)', border: '1px solid var(--echo-border)' }}>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button onClick={scrollNext} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-4 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg md:opacity-0 md:group-hover/carousel:opacity-100 transition-opacity" style={{ backgroundColor: 'var(--echo-bg)', color: 'var(--echo-primary)', border: '1px solid var(--echo-border)' }}>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </>
        )}

        {/* Scrollable Track */}
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto no-scrollbar py-2 px-1 snap-x scroll-smooth">
          {reviews.length === 0 ? (
            <p className="opacity-50 italic pl-2">No reviews yet.</p>
          ) : reviews.map(r => (
            <div key={r._id} className="p-6 rounded-2xl shrink-0 w-[280px] md:w-[320px] snap-center border transition-all hover:-translate-y-1 shadow-sm hover:shadow-md flex flex-col justify-between" style={{ backgroundColor: 'var(--echo-input)', borderColor: 'var(--echo-border)' }}>
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="font-bold truncate pr-2">{r.customerName}</span>
                  <StarRating rating={r.rating} />
                </div>
                <p className="text-sm opacity-90 mb-4 line-clamp-4 leading-relaxed">"{r.comment}"</p>
              </div>
              <span className="text-xs opacity-50">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
        
      </div>
    </div>
  );
};
export default CarouselLayout