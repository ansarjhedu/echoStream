import React, { useEffect, useState } from 'react';
import api from '../Api';
import { useAuth } from '../context/AuthContext';
import { 
  MessageSquare, CheckCircle, XCircle, AlertOctagon, 
  ArrowLeft, Package, Star, Lock, Trash2, X, Sparkles // <-- Added Sparkles icon!
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function Reviews() {
  const { activeStore } = useAuth(); 
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [lightboxImg, setLightboxImg] = useState(null);

  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeData, setDisputeData] = useState({ reviewId: null, content: '', images: null });
  const [disputeLoading, setDisputeLoading] = useState(false);

  // 🚨 NEW: AI Loading State
  const [aiLoading, setAiLoading] = useState(null);

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
      setReviews(reviews.map(r => r._id === id ? { ...r, status } : r));
      toast.success(`Review marked as ${status}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status.");
    }
  };

  const submitDispute = async (e) => {
    e.preventDefault();
    if (!disputeData.content) return toast.error("Please provide a reason for the dispute.");
    
    setDisputeLoading(true);
    const payload = new FormData();
    payload.append('status', 'disputed'); 
    payload.append('content', disputeData.content);
    
    if (disputeData.images) {
      for (let i = 0; i < Math.min(disputeData.images.length, 3); i++) {
        payload.append('images', disputeData.images[i]);
      }
    }

    try {
      const res = await api.patch(`/store/${activeStore._id}/updateReview/${disputeData.reviewId}/status`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setReviews(reviews.map(r => r._id === disputeData.reviewId ? res.data.data : r));
      setDisputeModalOpen(false);
      setDisputeData({ reviewId: null, content: '', images: null });
      toast.success("Dispute submitted to Admin successfully.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit dispute.");
    } finally {
      setDisputeLoading(false);
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

  // 🚨 NEW: Handle AI Generation
  const handleAiGenerate = async (review) => {
    setAiLoading(review._id);
    try {
      const res = await api.post(`/store/${activeStore._id}/ai/generate-reply`, {
        text: review.comment,
        type: "review",
        customerName: review.customerName,
        rating: review.rating
      });
      
      // Inject the AI's response directly into the text box for the merchant to edit
      setReplyText(prev => ({ ...prev, [review._id]: res.data.data }));
      toast.success("AI generated a response!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to connect to AI.");
    } finally {
      setAiLoading(null);
    }
  };

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
      disputed: "bg-red-500/10 text-red-400 border-red-500/20" 
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
    <div className="p-4 md:p-8 relative z-10 h-full overflow-y-auto no-scrollbar">
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
                
                {/* ACTION CONTROLS */}
                <div className="flex gap-2 bg-black/40 p-1.5 rounded-lg border border-white/5 opacity-100 md:opacity-50 md:group-hover:opacity-100 transition-opacity w-full sm:w-auto justify-end">
                  
                  {review.customerEmail ? (
                    review.isLocked ? (
                      <span className="px-3 py-1 text-xs font-bold text-red-400 bg-red-500/10 rounded-md border border-red-500/20 flex items-center gap-1">
                        <Lock size={14} /> Locked by Admin
                      </span>
                    ) : review.status === 'disputed' ? (
                      <span className="px-3 py-1 text-xs font-bold text-orange-400 flex items-center gap-1">
                        <AlertOctagon size={14} /> Under Admin Review
                      </span>
                    ) : review.status === 'rejected' ? (
                      <span className="px-3 py-1 text-xs font-bold text-gray-400">Rejected by Admin</span>
                    ) : (
                      <button onClick={() => { setDisputeData({ reviewId: review._id, content: '', images: null }); setDisputeModalOpen(true); }} className="p-2 px-3 text-red-400 hover:bg-red-400/10 rounded-md transition-all flex items-center gap-2 text-xs font-bold" title="Dispute Review">
                        <AlertOctagon size={16} /> Dispute ({3 - (review.disputeCount || 0)} left)
                      </button>
                    )
                  ) : (
                    <>
                      {review.status !== 'approved' && (
                        <button onClick={() => handleStatusUpdate(review._id, 'approved')} className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded-md" title="Approve Guest">
                          <CheckCircle size={18} />
                        </button>
                      )}
                      {review.status !== 'rejected' && review.status !== 'disputed' && (
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
                    <div key={idx} onClick={() => setLightboxImg(img)} className="overflow-hidden rounded-lg md:rounded-xl border border-white/10 cursor-pointer hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all group/img">
                      <img src={img} alt="Review Upload" className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 object-cover group-hover/img:scale-110 transition-transform duration-300" />
                    </div>
                  ))}
                </div>
              )}

              {/* 🚨 UPDATED: MERCHANT REPLY WITH AI BUTTON */}
              {review.merchantReply ? (
                <div className="mt-4 p-3 md:p-4 rounded-xl bg-purple-500/10 border-l-2 border-purple-500">
                  <span className="text-purple-400 text-sm font-bold flex items-center gap-2 mb-1"><MessageSquare size={14} /> Store Reply</span>
                  <p className="text-gray-300 text-sm">{review.merchantReply.content}</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <textarea 
                    rows="2"
                    placeholder="Write a public reply..." 
                    value={replyText[review._id] || ''} 
                    onChange={(e) => setReplyText({ ...replyText,[review._id]: e.target.value })} 
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-cyan-400 custom-scrollbar resize-none text-sm" 
                  />
                  <div className="flex sm:flex-col gap-2">
                    <button 
                      onClick={() => handleAiGenerate(review)} 
                      disabled={aiLoading === review._id}
                      className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 rounded-lg font-bold text-xs flex-1 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {aiLoading === review._id ? 'Thinking...' : <><Sparkles size={14}/> AI Reply</>}
                    </button>
                    <button 
                      onClick={() => handleReply(review._id)} 
                      disabled={!replyText[review._id]}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-xs flex-1 disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* DISPUTE MODAL */}
      {disputeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0F1A] border border-red-500/30 p-6 md:p-8 rounded-2xl w-full max-w-md shadow-2xl relative animate-fade-in-down">
            <button onClick={() => setDisputeModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <AlertOctagon className="text-red-500" /> Dispute Review
            </h2>
            <p className="text-gray-400 text-sm mb-6">Please provide a valid reason and proof for the Super Admin to review.</p>

            <form onSubmit={submitDispute} className="space-y-4">
              <div>
                <label className="block text-xs md:text-sm text-gray-400 mb-2">Dispute Reason</label>
                <textarea required rows="4" value={disputeData.content} onChange={(e) => setDisputeData({...disputeData, content: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition-all text-sm resize-none custom-scrollbar" placeholder="e.g. This user is using profanity / never bought the item..." />
              </div>

              <div>
                <label className="block text-xs md:text-sm text-gray-400 mb-2">Attach Proof (Max 3 Images)</label>
                <input type="file" multiple accept="image/*" onChange={(e) => setDisputeData({...disputeData, images: e.target.files})} className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-red-500/10 file:text-red-400 hover:file:bg-red-500/20 cursor-pointer transition-all" />
              </div>

              <button type="submit" disabled={disputeLoading} className="w-full bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-400 hover:to-orange-500 py-3 rounded-xl font-bold text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all disabled:opacity-50 mt-2 text-sm">
                {disputeLoading ? 'Submitting to Admin...' : 'Submit Dispute'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FULL-SCREEN LIGHTBOX OVERLAY */}
      {lightboxImg && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 transition-opacity" onClick={() => setLightboxImg(null)}>
          <button className="absolute top-4 right-4 md:top-8 md:right-8 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-2 md:p-3 rounded-full transition-all" onClick={() => setLightboxImg(null)}>
            <X size={24}/>
          </button>
          <img src={lightboxImg} alt="Expanded Review" className="max-w-full max-h-[85vh] md:max-h-[90vh] object-contain rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}