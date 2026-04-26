import React, { useEffect, useState } from 'react';
import api from '../../Api';
import { AlertOctagon, CheckCircle, X, User, Star } from 'lucide-react'; // <-- Added new icons
import { toast } from 'react-toastify';

export default function AdminDisputes() {
  const[disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const[lightboxImg, setLightboxImg] = useState(null); // <-- Added Lightbox state

  useEffect(() => {
    api.get('/admin/disputes')
       .then(res => setDisputes(res.data.data ||[]))
       .catch(err => toast.error("Failed to load disputes"))
       .finally(() => setLoading(false));
  },[]);

  const resolveDispute = async (reviewId, resolution) => {
    if(!window.confirm(`Mark this review as ${resolution.toUpperCase()}?`)) return;
    try {
      await api.patch(`/admin/disputes/${reviewId}/resolve`, { resolution });
      setDisputes(disputes.filter(d => d._id !== reviewId)); 
      toast.success(`Dispute resolved. Review ${resolution}.`);
    } catch (error) { 
      toast.error("Failed to resolve dispute");
    }
  };

  if (loading) return <div className="p-10 text-red-400 animate-pulse">Loading disputes...</div>;

  return (
    <div className="p-4 md:p-10 w-full relative z-10 overflow-y-auto h-full no-scrollbar">
      <h1 className="text-3xl font-extrabold text-white mb-8 flex items-center gap-3">
        <AlertOctagon className="text-red-500"/> Dispute Queue
      </h1>
      
      <div className="space-y-6 max-w-4xl pb-10">
        {disputes.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-white/10 rounded-2xl">
            <CheckCircle size={48} className="mx-auto text-green-500/50 mb-4" />
            <h3 className="text-xl font-bold text-white">All Clear!</h3>
            <p className="text-gray-500">No pending disputes require your attention.</p>
          </div>
        ) : disputes.map(review => (
          <div key={review._id} className="bg-white/[0.02] border border-red-500/30 p-6 rounded-2xl shadow-xl relative animate-fade-in-down transition-colors hover:border-red-500/50">
            
            {/* HEADER: Product & Action Buttons */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4 border-b border-white/5 pb-4">
              <div>
                <h3 className="font-bold text-white text-xl mb-1">{review.productTitle}</h3>
                <p className="text-sm text-gray-400 font-mono">Store: <span className="text-cyan-400">{review.store?.storeName}</span></p>
                <div className="text-xs text-gray-500 mt-1">Dispute Strike: {review.disputeCount} / 3</div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button onClick={() => resolveDispute(review._id, 'approved')} className="flex-1 md:flex-none px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg text-sm font-bold border border-green-500/30 transition-colors">
                  Rule: Approve Review
                </button>
                <button onClick={() => resolveDispute(review._id, 'rejected')} className="flex-1 md:flex-none px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-bold border border-red-500/30 transition-colors">
                  Rule: Reject Review
                </button>
              </div>
            </div>

            {/* BLOCK 1: Original Customer Review */}
            <div className="bg-black/40 p-4 rounded-xl border border-white/5 relative mb-4">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gray-500 to-gray-700 rounded-l-xl"></div>
              <div className="flex items-center gap-3 mb-2 pl-2">
                <User size={14} className="text-gray-400" />
                <span className="font-bold text-gray-300 text-sm">{review.customerName}</span>
                <span className="text-yellow-400 text-xs flex items-center gap-1">
                  <Star size={12} className="fill-yellow-400"/> {review.rating}/5
                </span>
              </div>
              <p className="text-gray-400 italic pl-2 text-sm leading-relaxed">"{review.comment}"</p>
            </div>

            {/* BLOCK 2: Store Owner's Dispute Reason & Proof */}
            {review.disputedReason && (
              <div className="p-4 rounded-xl bg-red-500/10 border-l-2 border-red-500">
                <span className="text-red-400 text-xs font-bold uppercase tracking-widest block mb-2">
                  Store Owner's Dispute Claim
                </span>
                <p className="text-sm text-gray-200 leading-relaxed mb-3">
                  {review.disputedReason.reason}
                </p>
                
                {/* Proof Images */}
                {review.disputedReason.proofImages && review.disputedReason.proofImages.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-3">
                    {review.disputedReason.proofImages.map((img, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setLightboxImg(img)}
                        className="overflow-hidden rounded-lg border border-red-500/30 cursor-pointer hover:border-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all"
                      >
                        <img 
                          src={img} 
                          alt="Dispute Proof" 
                          className="w-20 h-20 object-cover hover:scale-110 transition-transform duration-300" 
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-gray-500 mt-3 font-mono">
                  Submitted on: {new Date(review.disputedReason.createdAt).toLocaleString()}
                </div>
              </div>
            )}

          </div>
        ))}
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
            <X size={24} />
          </button>
          <img 
            src={lightboxImg} 
            alt="Expanded Proof" 
            className="max-w-full max-h-[85vh] md:max-h-[90vh] object-contain rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10" 
            onClick={(e) => e.stopPropagation()} // Prevent click-through
          />
        </div>
      )}
    </div>
  );
}