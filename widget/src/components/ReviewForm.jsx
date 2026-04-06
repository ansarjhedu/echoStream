import React, { useState } from 'react';
import { useWidget } from '../context/WidgetContext';
import StarRating from './StarRating';

export default function ReviewForm() {
  const { isFormOpen, submitReview, setIsFormOpen, customerName, customerEmail } = useWidget();
  
  
  // Notice we pre-fill the name if the client's site provides it!
  const [formState, setFormState] = useState({ name: customerName || '', rating: 5, comment: '', images: null });
  const [hoverRating, setHoverRating] = useState(0);
  const [status, setStatus] = useState({ loading: false, message: '', error: false });

  if (!isFormOpen) return null;

  // SECURITY LOCK: If the client website didn't inject an email, block the form!
  if (!customerEmail) {
    return (
      <div className="mb-6 md:mb-10 p-6 md:p-8 rounded-xl md:rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl animate-fade-in-down text-center">
        <div className="w-16 h-16 mx-auto bg-purple-500/10 rounded-full flex items-center justify-center mb-4 border border-purple-500/20">
          <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Login Required</h3>
        <p className="text-gray-400 text-sm md:text-base mb-6">You must be logged into your store account to leave a verified review.</p>
        <button onClick={() => setIsFormOpen(false)} className="px-6 py-2 rounded-lg font-bold text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
          Close
        </button>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, message: '', error: false });

    const formData = new FormData();
    formData.append('customerName', formState.name);
    formData.append('rating', formState.rating);
    formData.append('comment', formState.comment);
    
    if (formState.images) {
      for (let i = 0; i < Math.min(formState.images.length, 3); i++) {
        formData.append('images', formState.images[i]);
      }
    }

    try {
  
      await submitReview(formData);
      setStatus({ loading: false, message: 'Review submitted securely! 🚀', error: false });
      setFormState({ name: customerName, rating: 5, comment: '', images: null });
      setTimeout(() => setIsFormOpen(false), 3000);
    } catch (err) {
      setStatus({ loading: false, message: err.message, error: true });
    }
  };

  const inputClasses = "w-full bg-black/40 border border-white/10 rounded-lg px-3 py-3 md:px-4 md:py-3 text-sm md:text-base text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all";

  return (
    <div className="mb-6 md:mb-10 p-4 md:p-6 rounded-xl md:rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl animate-fade-in-down w-full overflow-hidden box-border">
      <h3 className="text-base md:text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="w-1.5 md:w-2 h-5 md:h-6 bg-cyan-400 rounded-full drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
        Share Your Experience
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5 w-full">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 w-full">
          {/* Identity Locked Badge */}
          <div className="w-full flex items-center gap-3 bg-cyan-900/20 border border-cyan-500/30 rounded-lg px-3 py-3 md:px-4 md:py-3 overflow-hidden">
            <svg className="w-5 h-5 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span className="text-cyan-100 text-sm md:text-base truncate">
              Reviewing as <strong className="text-cyan-400 ml-1">{customerName}</strong>
            </span>
          </div>

          <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-center md:justify-between bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 md:px-4 md:py-3 overflow-hidden gap-1.5 md:gap-0">
            <span className="text-gray-400 text-sm md:text-base whitespace-nowrap">Rating:</span>
            <div className="flex items-center justify-start md:justify-end w-full md:max-w-[65%] overflow-hidden">
              <StarRating interactive rating={hoverRating || formState.rating} onHover={setHoverRating} onClick={(val) => setFormState({ ...formState, rating: val })} />
            </div>
          </div>
        </div>

        <textarea required rows="3" placeholder="What did you think about this product?" className={inputClasses}
          value={formState.comment} onChange={(e) => setFormState({ ...formState, comment: e.target.value })}
        />

        <div className="w-full max-w-full overflow-hidden">
          <label className="block text-xs md:text-sm text-gray-400 mb-2">Attach Images (Max 3)</label>
          <input type="file" multiple accept="image/*" 
            className="w-full max-w-full text-xs md:text-sm text-gray-400 file:mr-2 md:file:mr-4 file:py-1.5 md:file:py-2 file:px-3 md:file:px-4 file:rounded-full file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20 cursor-pointer transition-all overflow-hidden text-ellipsis whitespace-nowrap"
            onChange={(e) => setFormState({ ...formState, images: e.target.files })}
          />
        </div>

        <button type="submit" disabled={status.loading}
          className="w-full py-3 rounded-lg font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all duration-300 disabled:opacity-50 text-sm md:text-base"
        >
          {status.loading ? 'Transmitting...' : 'Submit Secure Review'}
        </button>
        
        {status.message && (
          <p className={`text-center font-medium text-sm md:text-base break-words ${status.error ? 'text-red-400' : 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]'}`}>
            {status.message}
          </p>
        )}
      </form>
    </div>
  );
}