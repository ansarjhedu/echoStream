import React, { useState } from 'react';
import { WidgetProvider, useWidget } from './context/WidgetContext';
import ReviewForm from './components/ReviewForm';
import StarRating from './components/StarRating';
import { ShieldAlert } from 'lucide-react';

function InnerWidget() {
  const { config, widgetError, loading, reviews, stats, isFormOpen, setIsFormOpen } = useWidget();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12" style={{ color: 'var(--echo-primary)' }}>
        <div className="w-10 h-10 border-4 rounded-full animate-spin mb-4" style={{ borderColor: 'var(--echo-border)', borderTopColor: 'var(--echo-primary)' }}></div>
        <p className="text-sm font-mono tracking-widest animate-pulse">LOADING REVIEWS</p>
      </div>
    );
  }

  if (widgetError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border rounded-2xl" style={{ backgroundColor: 'var(--echo-input)', borderColor: '#ef4444', color: '#ef4444' }}>
        <ShieldAlert size={48} className="mb-4" />
        <h3 className="text-xl font-bold mb-2">Widget Offline</h3>
        <p className="text-sm opacity-80">{widgetError}</p>
      </div>
    );
  }

  // --- LAYOUT RENDERING ENGINE ---
 const renderLayout = () => {
    switch (config.layout) {
      case 'classic': return <ClassicLayout />;
      case 'minimal': return <MinimalLayout />;
      case 'grid': return <GridLayout />;
      case 'carousel': return <CarouselLayout />;     // <-- NEW
      case 'brutalism': return <BrutalismLayout />;   // <-- NEW
      case 'glassmorphism': default: return <GlassmorphismLayout />;
    }
  };

  return (
    <div className="echo-widget-root w-full relative rounded-2xl overflow-hidden box-border" 
      style={{
        '--echo-primary': config.primaryColor,
        '--echo-bg': config.backgroundColor,
        '--echo-text': config.textColor,
        // MAGIC CSS: Creates a 15% opacity version of the text color for borders, perfect for dark OR light mode!
        '--echo-border': `color-mix(in srgb, ${config.textColor} 15%, transparent)`,
        '--echo-input': `color-mix(in srgb, ${config.textColor} 5%, transparent)`,
        fontFamily: config.fontFamily,
        backgroundColor: 'var(--echo-bg)',
        color: 'var(--echo-text)'
      }}
    >
      {renderLayout()}
      
      {/* Branding */}
      <div className="pt-6 pb-4 border-t text-center opacity-60 text-xs" style={{ borderColor: 'var(--echo-border)' }}>
        Powered by <strong style={{ color: 'var(--echo-primary)' }}>EchoStream</strong>
      </div>
    </div>
  );
}

// =========================================================
// 1. GLASSMORPHISM LAYOUT
// =========================================================
const GlassmorphismLayout = () => {
  const { reviews, stats, isFormOpen, setIsFormOpen } = useWidget();
  return (
    <div className="p-6 md:p-10 relative">
      {/* Glow Effects */}
      <div className="absolute top-0 left-0 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none" style={{ backgroundColor: 'var(--echo-primary)' }}></div>
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b" style={{ borderColor: 'var(--echo-border)' }}>
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Customer Reviews</h2>
            <div className="flex items-center gap-3 mt-2">
              <StarRating rating={Math.round(stats?.avgRating || 0)} />
              <span className="opacity-80 text-sm">{stats?.avgRating?.toFixed(1)} out of 5 ({stats?.totalReviews} reviews)</span>
            </div>
          </div>
          <button onClick={() => setIsFormOpen(!isFormOpen)} className="mt-4 md:mt-0 px-6 py-3 rounded-full font-bold shadow-lg transition-transform hover:scale-105" style={{ backgroundColor: 'var(--echo-primary)', color: 'var(--echo-bg)' }}>
            {isFormOpen ? 'Cancel' : 'Write a Review'}
          </button>
        </div>
        <ReviewForm />
        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
          {reviews.length === 0 ? <p className="opacity-50 italic">No reviews yet.</p> : reviews.map(r => <ReviewCard key={r._id} review={r} />)}
        </div>
      </div>
    </div>
  );
};

// =========================================================
// 2. CLASSIC LAYOUT (Amazon Style)
// =========================================================
const ClassicLayout = () => {
  const { reviews, stats, isFormOpen, setIsFormOpen } = useWidget();
  const distribution = stats?.distribution || { 5:0, 4:0, 3:0, 2:0, 1:0 };

  return (
    <div className="p-6 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 pb-8 border-b" style={{ borderColor: 'var(--echo-border)' }}>
        {/* Left Stats */}
        <div className="md:col-span-1">
          <h3 className="text-xl font-bold mb-4">Customer Reviews</h3>
          <div className="flex items-center gap-2 mb-2">
            <StarRating rating={Math.round(stats?.avgRating || 0)} />
            <span className="text-xl font-bold">{stats?.avgRating?.toFixed(1)} out of 5</span>
          </div>
          <p className="opacity-60 text-sm mb-6">{stats?.totalReviews} global ratings</p>
          
          {/* Progress Bars */}
          {[5,4,3,2,1].map(num => {
            const count = distribution[num] || 0;
            const percent = stats?.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
            return (
              <div key={num} className="flex items-center gap-3 mb-2 text-sm">
                <span className="w-12 text-right opacity-80">{num} star</span>
                <div className="flex-1 h-4 rounded-full overflow-hidden border" style={{ backgroundColor: 'var(--echo-input)', borderColor: 'var(--echo-border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: 'var(--echo-primary)' }}></div>
                </div>
                <span className="w-8 opacity-60 text-right">{Math.round(percent)}%</span>
              </div>
            );
          })}
        </div>
        
        {/* Right CTA */}
        <div className="md:col-span-2 flex flex-col justify-center items-start md:pl-8 md:border-l" style={{ borderColor: 'var(--echo-border)' }}>
          <h4 className="font-bold mb-2">Review this product</h4>
          <p className="opacity-70 text-sm mb-4">Share your thoughts with other customers</p>
          <button onClick={() => setIsFormOpen(!isFormOpen)} className="w-full md:w-auto px-8 py-2 border rounded-md font-bold transition-opacity hover:opacity-80" style={{ borderColor: 'var(--echo-primary)', color: 'var(--echo-text)' }}>
            {isFormOpen ? 'Cancel' : 'Write a customer review'}
          </button>
        </div>
      </div>
      <ReviewForm />
      <div className="space-y-6">
        {reviews.length === 0 ? <p className="opacity-50">No customer reviews yet.</p> : reviews.map(r => <ReviewCard key={r._id} review={r} minimal />)}
      </div>
    </div>
  );
};

// =========================================================
// 3. MINIMAL LAYOUT
// =========================================================
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

// =========================================================
// 4. GRID LAYOUT
// =========================================================
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

// =========================================================
// UNIVERSAL REVIEW CARD (Used by Glass & Classic)
// =========================================================
const ReviewCard = ({ review, minimal = false }) => {
  const[lightboxImg, setLightboxImg] = useState(null);

  return (
    <>
      <div className={`p-5 rounded-2xl border transition-all hover:shadow-md ${minimal ? 'bg-transparent border-b border-t-0 border-x-0 rounded-none px-0' : 'shadow-sm'}`} style={{ backgroundColor: minimal ? 'transparent' : 'var(--echo-input)', borderColor: 'var(--echo-border)' }}>
        <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: 'var(--echo-primary)', color: 'var(--echo-bg)' }}>
              {review.customerName.charAt(0)}
            </div>
            <div>
              <h4 className="font-bold">{review.customerName}</h4>
              <span className="text-xs opacity-50">{new Date(review.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <StarRating rating={review.rating} />
        </div>
        
        <p className="text-sm opacity-90 leading-relaxed mb-4">{review.comment}</p>
        
        {review.images && review.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {review.images.map((img, idx) => (
              <img key={idx} src={img} alt="Upload" onClick={() => setLightboxImg(img)} className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:scale-105 transition-transform" style={{ borderColor: 'var(--echo-border)' }} />
            ))}
          </div>
        )}

        {review.merchantReply && (
          <div className="mt-4 p-4 rounded-xl border-l-4" style={{ backgroundColor: 'var(--echo-bg)', borderColor: 'var(--echo-primary)' }}>
            <span className="font-bold text-xs block mb-1 opacity-60 uppercase tracking-widest">Store Reply</span>
            <p className="text-sm opacity-90">{review.merchantReply.content}</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} className="max-w-full max-h-[90vh] object-contain rounded-lg border border-white/20" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
};

// =========================================================
// 5. CAROUSEL LAYOUT (Swipeable)
// =========================================================
const CarouselLayout = () => {
  const { reviews, stats, isFormOpen, setIsFormOpen } = useWidget();
  const scrollRef = React.useRef(null);
  const [isHovered, setIsHovered] = React.useState(false);

  // 🔄 Auto-Scroll Logic
  React.useEffect(() => {
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

// =========================================================
// 6. NEO-BRUTALISM LAYOUT (Bold & Edgy)
// =========================================================
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

      <div className="space-y-8 mt-8">
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
// =========================================================
// MAIN EXPORT WRAPPER
// =========================================================
export default function WidgetWrapper({ apiKey, productHandle, productTitle, customerName, customerEmail }) {
  return (
    <WidgetProvider apiKey={apiKey} productHandle={productHandle} productTitle={productTitle} customerName={customerName} customerEmail={customerEmail}>
      <InnerWidget />
    </WidgetProvider>
  );
}