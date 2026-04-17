import React, { useEffect, useState } from 'react';
import api from '../Api';
import { useAuth } from '../context/AuthContext';
import { 
  MessageSquare, CheckCircle, XCircle, AlertOctagon, 
  ArrowLeft, Package, Star, Lock, Trash2 // Added Lock and Trash2 imports
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function Reviews() {
  const { activeStore } = useAuth(); 
  const [products, setProducts] = useState([]);
  const[selectedProduct, setSelectedProduct] = useState(null);
  
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const[replyText, setReplyText] = useState({});
  const [lightboxImg, setLightboxImg] = useState(null);

  useEffect(() => {
    if (activeStore) fetchProducts();
  }, [activeStore]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/store/${activeStore._id}/products`);
      setProducts(res.data.data ||[]);
    } catch (error) {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = async (product) => {
    setSelectedProduct(product);
    setLoading(true);
    try {
      const res = await api.get(`/store/${activeStore._id}/reviews?productId=${product._id}`);
      setReviews(res.data ||[]);
    } catch (error) {
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.patch(`/store/${activeStore._id}/updateReview/${id}/status`, { status });
      setReviews(reviews.map(r => r._id === id ? { ...r, status, disputeCount: status === 'dispute' ? (r.disputeCount || 0) + 1 : r.disputeCount } : r));
      toast.success(`Review marked as ${status}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status.");
    }
  };

  const handleReply = async (id) => {
    if (!replyText[id]) return;
    try {
      const res = await api.post(`/store/${activeStore._id}/reviews/${id}/reply`, { reply: replyText[id] });
      setReviews(reviews.map(r => r._id === id ? res.data.data : r));
      setReplyText({ ...replyText, [id]: '' });
      toast.success("Reply posted!");
    } catch (error) {
      toast.error("Failed to send reply");
    }
  };

  // Helper for deleting GUEST reviews ONLY
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this guest review?")) return;
    try {
      await api.delete(`/store/${activeStore._id}/reviews/${id}`);
      setReviews(reviews.filter(r => r._id !== id));
      toast.success("Review deleted");
    } catch (error) {
      toast.error("Failed to delete review");
    }
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      approved: "bg-green-500/10 text-green-400 border-green-500/20",
      rejected: "bg-gray-500/10 text-gray-400 border-gray-500/20",
      dispute: "bg-red-500/10 text-red-400 border-red-500/20"
    };
    return (
      <span className={`px-3 py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-full border ${styles[status] || styles.pending}`}>
        {status}
      </span>
    );
  };

  if (!selectedProduct) {
    return (
      <div className="p-4 md:p-8 relative z-10">
        <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-6 md:mb-8">
          Product Inventory
        </h1>
        
        {loading ? (
          <div className="text-cyan-400 animate-pulse flex items-center gap-2"><Package/> Syncing products...</div>
        ) : products.length === 0 ? (
          <div className="text-gray-500 text-center bg-white/5 p-10 rounded-2xl border border-white/10">
            <Package size={48} className="mx-auto mb-4 opacity-50" />
            <p>No products tracked yet for {activeStore.storeName}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {products.map(product => (
              <div key={product._id} onClick={() => handleSelectProduct(product)} className="group cursor-pointer bg-white/[0.02] border border-white/10 p-5 rounded-2xl backdrop-blur-xl hover:bg-white/[0.05] hover:border-cyan-500/50 transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                    <Package className="text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-white truncate">{product.productTitle}</h3>
                    <p className="text-xs text-gray-500 font-mono truncate">{product.productHandle}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <div className="flex items-center gap-1.5"><Star size={16} className="text-yellow-400 fill-yellow-400" /><span className="font-bold">{product.stats?.avgRating?.toFixed(1) || 0}</span></div>
                  <span className="text-sm text-gray-400"><span className="font-bold text-white">{product.stats?.totalReviews || 0}</span> Reviews</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 relative z-10">
      <button onClick={() => setSelectedProduct(null)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors mb-6 bg-white/5 px-3 py-2 rounded-lg border border-white/10 w-fit">
        <ArrowLeft size={18} /> Back to Products
      </button>

      <div className="flex flex-col sm:flex-row justify-between mb-8 bg-white/[0.02] p-5 rounded-2xl border border-white/10 backdrop-blur-md gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-extrabold text-white mb-1 line-clamp-2">{selectedProduct.productTitle}</h1>
          <p className="text-cyan-400 font-mono text-sm truncate">{selectedProduct.productHandle}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-cyan-400 animate-pulse">Loading product reviews...</div>
      ) : reviews.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No reviews found.</p>
      ) : (
        <div className="space-y-4 md:space-y-6">
          {reviews.map(review => (
            <div key={review._id} className={`bg-white/[0.02] border border-white/10 p-4 md:p-6 rounded-2xl backdrop-blur-xl relative group shadow-lg ${review.isLocked ? 'opacity-80' : ''}`}>
              <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4">
                <div className="w-full">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base md:text-lg font-bold text-white truncate">{review.customerName}</h3>
                    <StatusBadge status={review.status} />
                  </div>
                  <div className="flex items-center gap-1 text-yellow-400 mb-2">
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </div>
                </div>
                
                {/* 🚨 NEW SECURE ACTION CONTROLS */}
                <div className="flex gap-2 bg-black/40 p-1.5 rounded-lg border border-white/5 opacity-100 md:opacity-50 md:group-hover:opacity-100 transition-opacity w-full sm:w-auto justify-end">
                  
                  {review.customerEmail ? (
                    // ----------------------------------------------------
                    // FLOW A: VERIFIED BUYER (Auto-approved, Dispute Only)
                    // ----------------------------------------------------
                    review.isLocked ? (
                      <span className="px-3 py-1 text-xs font-bold text-red-400 bg-red-500/10 rounded-md border border-red-500/20 flex items-center gap-1">
                        <Lock size={14} /> Locked by Admin
                      </span>
                    ) : review.status === 'dispute' ? (
                      <span className="px-3 py-1 text-xs font-bold text-orange-400 flex items-center gap-1">
                        <AlertOctagon size={14} /> Under Admin Review
                      </span>
                    ) : review.status === 'rejected' ? (
                      <span className="px-3 py-1 text-xs font-bold text-gray-400">Rejected by Admin</span>
                    ) : (
                      <button 
                        onClick={() => handleStatusUpdate(review._id, 'dispute')} 
                        className="p-2 px-3 text-red-400 hover:bg-red-400/10 rounded-md transition-all flex items-center gap-2 text-xs font-bold" 
                        title="Dispute Review"
                      >
                        <AlertOctagon size={16} /> Dispute ({3 - (review.disputeCount || 0)} left)
                      </button>
                    )
                  ) : (
                    // ----------------------------------------------------
                    // FLOW B: GUEST USER (Full manual control)
                    // ----------------------------------------------------
                    <>
                      {review.status !== 'approved' && (
                        <button onClick={() => handleStatusUpdate(review._id, 'approved')} className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded-md" title="Approve Guest">
                          <CheckCircle size={18} />
                        </button>
                      )}
                      {review.status !== 'rejected' && (
                        <button onClick={() => handleStatusUpdate(review._id, 'rejected')} className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-md" title="Reject Guest">
                          <XCircle size={18} />
                        </button>
                      )}
                      <div className="w-px h-5 bg-white/10 self-center mx-1"></div>
                      <button onClick={() => handleDelete(review._id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-md" title="Delete Guest Review">
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}

                </div>
              </div>

              <p className="text-gray-300 text-sm md:text-base bg-black/20 p-3 md:p-4 rounded-xl border border-white/5">
                "{review.comment}"
              </p>
              
              {/* Responsive Images Grid */}
              {review.images && review.images.length > 0 && (
                <div className="flex flex-wrap gap-2 md:gap-3 mt-4 mb-4">
                  {review.images.map((img, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setLightboxImg(img)}
                      className="overflow-hidden rounded-lg md:rounded-xl border border-white/10 cursor-pointer hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all group/img"
                    >
                      <img 
                        src={img} 
                        alt="Review Upload" 
                        className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 object-cover group-hover/img:scale-110 transition-transform duration-300" 
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Merchant Reply */}
              {review.merchantReply ? (
                <div className="mt-4 p-3 md:p-4 rounded-xl bg-purple-500/10 border-l-2 border-purple-500">
                  <span className="text-purple-400 text-sm font-bold flex items-center gap-2 mb-1"><MessageSquare size={14} /> Store Reply</span>
                  <p className="text-gray-300 text-sm">{review.merchantReply.content}</p>
                </div>
              ) : (
                <div className="flex gap-2 mt-4">
                  <input type="text" placeholder="Write a public reply..." value={replyText[review._id] || ''} onChange={(e) => setReplyText({ ...replyText,[review._id]: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-cyan-400" />
                  <button onClick={() => handleReply(review._id)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold">Reply</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
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
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
}