import React, { useState } from 'react';
import StarRating from './StarRating';

export default function ReviewCard({ review }) {
  const [lightboxImg, setLightboxImg] = useState(null);

  return (
    <>
      <div className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 group">
        
        {/* Header - Stacks on tiny screens, side-by-side on larger */}
        <div className="flex flex-col sm:flex-row justify-between items-start mb-3 md:mb-4 gap-2 sm:gap-0">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base md:text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                {review.customerName}
              </h4>
              
              {/* Secret Phase 3 Teaser: Verified Buyer Badge Placeholder */}
              {review.isVerified && (
                <span className="flex items-center justify-center w-4 h-4 bg-green-500/20 rounded-full text-green-400" title="Verified Buyer">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </span>
              )}
            </div>
            <span className="text-xs md:text-sm text-gray-500">
              {new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <StarRating rating={review.rating} />
        </div>
        
        <p className="text-sm md:text-base text-gray-300 leading-relaxed mb-4">{review.comment}</p>
        
        {/* Responsive Images Grid */}
        {review.images && review.images.length > 0 && (
          <div className="flex flex-wrap gap-2 md:gap-3 mb-4">
            {review.images.map((img, idx) => (
              <div 
                key={idx} 
                onClick={() => setLightboxImg(img)}
                className="overflow-hidden rounded-lg md:rounded-xl border border-white/10 cursor-pointer hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all group/img"
              >
                {/* Images grow larger automatically on bigger screens */}
                <img 
                  src={img} 
                  alt="Review Upload" 
                  className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 object-cover group-hover/img:scale-110 transition-transform duration-300" 
                />
              </div>
            ))}
          </div>
        )}

        {/* Responsive Merchant Reply */}
        {review.merchantReply && (
          <div className="mt-3 md:mt-4 p-3 md:p-4 rounded-lg md:rounded-xl bg-purple-900/20 border-l-2 border-purple-500 relative overflow-hidden">
            <div className="absolute -left-10 -top-10 w-20 h-20 bg-purple-500/20 blur-2xl rounded-full pointer-events-none"></div>
            <span className="relative font-bold text-purple-400 text-xs md:text-sm block mb-1">Store Owner</span>
            <p className="relative text-gray-300 text-xs md:text-sm">{review.merchantReply.content}</p>
          </div>
        )}
      </div>

      {/* FULL-SCREEN LIGHTBOX OVERLAY */}
      {lightboxImg && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 transition-opacity" 
          onClick={() => setLightboxImg(null)}
        >
          <button 
            className="absolute top-4 right-4 md:top-8 md:right-8 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-2 md:p-3 rounded-full transition-all"
            onClick={() => setLightboxImg(null)}
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          <img 
            src={lightboxImg} 
            alt="Expanded Review" 
            className="max-w-full max-h-[85vh] md:max-h-[90vh] object-contain rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10" 
            onClick={(e) => e.stopPropagation()} // Prevent closing if they click the image itself
          />
        </div>
      )}
    </>
  );
}