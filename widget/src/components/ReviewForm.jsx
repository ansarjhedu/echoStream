import React, { useState } from 'react';
import { useWidget } from '../context/WidgetContext';
import StarRating from './StarRating';

export default function ReviewForm() {
  const { isFormOpen, submitReview, setIsFormOpen, customerName, customerEmail } = useWidget();
  const [formState, setFormState] = useState({ customerName: customerName || '', rating: 5, comment: '', images: null });
  const [hoverRating, setHoverRating] = useState(0);
  const [status, setStatus] = useState({ loading: false, message: '', error: false });

  if (!isFormOpen) return null;

  if (!customerEmail) {
    return (
      <div className="mb-8 p-8 rounded-2xl text-center border" style={{ backgroundColor: 'var(--echo-input)', borderColor: 'var(--echo-border)' }}>
        <h3 className="text-xl font-bold mb-2">Login Required</h3>
        <p className="opacity-70 mb-6">You must be logged into your store account to leave a verified review.</p>
        <button onClick={() => setIsFormOpen(false)} className="px-6 py-2 rounded-lg font-bold transition-all border" style={{ borderColor: 'var(--echo-border)' }}>
          Close
        </button>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, message: '', error: false });
    const formData = new FormData();
    formData.append('customerName', formState.customerName);
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
      setFormState({ customerName: customerName, rating: 5, comment: '', images: null,  });
      setTimeout(() => setIsFormOpen(false), 3000);
    } catch (err) {
      setStatus({ loading: false, message: err.message, error: true });
    }
  };

  const inputStyle = { backgroundColor: 'var(--echo-input)', borderColor: 'var(--echo-border)', color: 'var(--echo-text)' };

  return (
    <div className="mb-10 p-6 rounded-2xl border shadow-lg animate-fade-in-down" style={{ backgroundColor: 'var(--echo-bg)', borderColor: 'var(--echo-border)' }}>
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">Share Your Experience</h3>
      
      <form onSubmit={handleSubmit} className="space-y-5 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
          <div className="w-full flex items-center gap-3 rounded-lg px-4 py-3 border" style={inputStyle}>
            <span className="opacity-70 text-sm truncate">Reviewing as <strong style={{ color: 'var(--echo-primary)' }}>{customerName}</strong></span>
          </div>

          <div className="w-full flex justify-between items-center rounded-lg px-4 py-3 border" style={inputStyle}>
            <span className="opacity-70 text-sm">Rating:</span>
            <StarRating interactive rating={hoverRating || formState.rating} onHover={setHoverRating} onClick={(val) => setFormState({ ...formState, rating: val })} />
          </div>
        </div>

        <textarea required rows="3" placeholder="What did you think about this product?" className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none transition-all border" style={inputStyle}
          value={formState.comment} onChange={(e) => setFormState({ ...formState, comment: e.target.value })}
        />

        <div className="w-full max-w-full overflow-hidden">
          <label className="block text-sm opacity-70 mb-2">Attach Images (Max 3)</label>
          <input type="file" multiple accept="image/*" className="w-full text-sm cursor-pointer" onChange={(e) => setFormState({ ...formState, images: e.target.files })} />
        </div>

        <button type="submit" disabled={status.loading} className="w-full py-3 rounded-lg font-bold shadow-lg transition-all disabled:opacity-50" style={{ backgroundColor: 'var(--echo-primary)', color: 'var(--echo-bg)' }}>
          {status.loading ? 'Transmitting...' : 'Submit Secure Review'}
        </button>
        
        {status.message && (
          <p className="text-center font-medium text-sm" style={{ color: status.error ? '#ef4444' : 'var(--echo-primary)' }}>
            {status.message}
          </p>
        )}
      </form>
    </div>
  );
}