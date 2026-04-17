import React, { useEffect, useState } from 'react';
import api from '../../Api';
import { AlertOctagon, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/disputes').then(res => setDisputes(res.data.data || [])).finally(() => setLoading(false));
  },[]);

  const resolveDispute = async (reviewId, resolution) => {
    if(!window.confirm(`Mark this review as ${resolution.toUpperCase()}?`)) return;
    try {
      await api.patch(`/admin/disputes/${reviewId}/resolve`, { resolution });
      setDisputes(disputes.filter(d => d._id !== reviewId)); 
    } catch (error) { 
      toast.error("Failed to resolve dispute");
     }
  };

  if (loading) return <div className="p-10 text-red-400">Loading disputes...</div>;

  return (
    <div className="p-4 md:p-10 w-full">
      <h1 className="text-3xl font-extrabold text-white mb-8 flex items-center gap-3">
        <AlertOctagon className="text-red-500"/> Dispute Queue
      </h1>
      
      <div className="space-y-4 max-w-4xl">
        {disputes.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-white/10 rounded-2xl">
            <CheckCircle size={48} className="mx-auto text-green-500/50 mb-4" />
            <h3 className="text-xl font-bold text-white">All Clear!</h3>
            <p className="text-gray-500">No pending disputes require your attention.</p>
          </div>
        ) : disputes.map(review => (
          <div key={review._id} className="bg-white/[0.02] border border-red-500/30 p-6 rounded-2xl shadow-lg">
            <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
              <div>
                <h3 className="font-bold text-white text-lg">Product: {review.productTitle}</h3>
                <p className="text-sm text-gray-400 font-mono">Store: <span className="text-cyan-400">{review.store?.storeName}</span></p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button onClick={() => resolveDispute(review._id, 'approved')} className="flex-1 md:flex-none px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg text-sm font-bold border border-green-500/30">Rule: Approve</button>
                <button onClick={() => resolveDispute(review._id, 'rejected')} className="flex-1 md:flex-none px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-bold border border-red-500/30">Rule: Reject</button>
              </div>
            </div>
            <div className="bg-black/40 p-4 rounded-xl border border-white/5 relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-orange-500 rounded-l-xl"></div>
              <p className="text-gray-300 italic pl-2">"{review.comment}"</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}