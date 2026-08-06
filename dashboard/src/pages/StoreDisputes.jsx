import React, { useEffect, useState } from 'react';
import api from '../Api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { AlertOctagon, CheckCircle, Star, User, Lock, X } from 'lucide-react';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Resolved (Live)' },
  { key: 'rejected', label: 'Rejected' },
];

const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    rejected: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    disputed: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  const labels = {
    disputed: 'Pending',
    approved: 'Resolved · Live',
    rejected: 'Rejected',
  };
  return (
    <span className={`px-3 py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-full border ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
};

export default function StoreDisputes() {
  const { activeStore } = useAuth();
  const [filter, setFilter] = useState('all');
  const [disputes, setDisputes] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [lightboxImg, setLightboxImg] = useState(null);

  useEffect(() => {
    if (!activeStore?._id) return;
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/store/${activeStore._id}/disputes`, { params: { filter } });
        if (!alive) return;
        setDisputes(res.data?.data || []);
        setSummary(res.data?.summary || { total: 0, pending: 0, approved: 0, rejected: 0 });
      } catch (error) {
        if (alive) toast.error(error.response?.data?.message || 'Failed to load disputes');
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [activeStore?._id, filter]);

  return (
    <div className="p-4 md:p-10 w-full relative z-10 overflow-y-auto h-full no-scrollbar">
      <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 mb-2 flex items-center gap-3">
        <AlertOctagon className="text-orange-400 shrink-0" /> Disputes
      </h1>
      <p className="text-gray-400 text-sm mb-8">
        File disputes from Moderation. EchoStream AI analyzes each case and posts a clear decision with reasoning.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        {[
          { label: 'Total filed', value: summary.total, color: 'text-white' },
          { label: 'Pending', value: summary.pending, color: 'text-orange-400' },
          { label: 'Resolved (live)', value: summary.approved, color: 'text-green-400' },
          { label: 'Rejected', value: summary.rejected, color: 'text-gray-400' },
        ].map((card) => (
          <div key={card.label} className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 backdrop-blur-xl">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{card.label}</p>
            <p className={`text-2xl font-black ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              filter === f.key
                ? 'bg-orange-500/15 text-orange-300 border-orange-500/40'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            {f.label}
            {f.key === 'pending' && summary.pending > 0 ? ` (${summary.pending})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-orange-400 animate-pulse">Loading disputes...</div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.02] border border-white/10 rounded-2xl">
          <CheckCircle size={48} className="mx-auto text-green-500/50 mb-4" />
          <h3 className="text-xl font-bold text-white">No disputes here</h3>
          <p className="text-gray-500 text-sm mt-2">
            {filter === 'all'
              ? 'You have not filed any disputes for this store yet.'
              : `No ${filter === 'pending' ? 'pending' : filter} disputes.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl pb-10">
          {disputes.map((review) => (
            <div
              key={review._id}
              className={`bg-white/[0.02] border p-5 md:p-6 rounded-2xl shadow-xl relative transition-colors ${
                review.status === 'disputed'
                  ? 'border-orange-500/30 hover:border-orange-500/50'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4 border-b border-white/5 pb-4">
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-lg mb-1 truncate">{review.productTitle}</h3>
                  <p className="text-xs text-gray-500">
                    Strike: {review.disputedReason?.count || 1} / 3
                    {review.disputedReason?.createdAt
                      ? ` · Filed ${new Date(review.disputedReason.createdAt).toLocaleString()}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={review.status} />
                  {review.isLocked && (
                    <span className="px-2 py-1 text-[10px] font-bold text-red-400 bg-red-500/10 rounded-md border border-red-500/20 inline-flex items-center gap-1">
                      <Lock size={12} /> Locked
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-black/40 p-4 rounded-xl border border-white/5 relative mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <User size={14} className="text-gray-400" />
                  <span className="font-bold text-gray-300 text-sm">{review.customerName}</span>
                  <span className="text-yellow-400 text-xs flex items-center gap-1">
                    <Star size={12} className="fill-yellow-400" /> {review.rating}/5
                  </span>
                </div>
                <p className="text-gray-400 italic text-sm leading-relaxed">"{review.comment}"</p>
              </div>

              {review.disputedReason?.reason && (
                <div className="p-4 rounded-xl bg-orange-500/10 border-l-2 border-orange-500 mb-4">
                  <span className="text-orange-400 text-xs font-bold uppercase tracking-widest block mb-2">
                    Your dispute claim
                  </span>
                  <p className="text-gray-300 text-sm leading-relaxed">{review.disputedReason.reason}</p>
                  {Array.isArray(review.disputedReason.proofImages) && review.disputedReason.proofImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {review.disputedReason.proofImages.map((img, idx) => (
                        <button
                          key={`${review._id}-proof-${idx}`}
                          type="button"
                          onClick={() => setLightboxImg(img)}
                          className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 hover:border-orange-400/50 transition-colors"
                        >
                          <img src={img} alt="Dispute proof" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {review.disputeResolution?.reason && (
                <div className={`p-4 rounded-xl border-l-2 ${
                  review.disputeResolution.resolvedAt
                    ? review.disputeResolution.decision === 'approve_dispute'
                      ? 'bg-green-500/10 border-green-500'
                      : 'bg-cyan-500/10 border-cyan-500'
                    : 'bg-indigo-500/10 border-indigo-500'
                }`}>
                  <span className="text-xs font-bold uppercase tracking-widest block mb-2 text-gray-300">
                    {review.disputeResolution.resolvedAt
                      ? `Resolution · ${review.disputeResolution.resolvedBy === 'ai' ? 'AI Agent' : 'Platform Admin'}`
                      : 'AI recommendation (awaiting final decision)'}
                  </span>
                  <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                    {review.disputeResolution.reason}
                  </p>
                  {review.disputeResolution.resolvedAt && (
                    <p className="text-[10px] text-gray-500 mt-2 font-mono">
                      {new Date(review.disputeResolution.resolvedAt).toLocaleString()}
                      {typeof review.disputeResolution.confidence === 'number'
                        ? ` · confidence ${(review.disputeResolution.confidence * 100).toFixed(0)}%`
                        : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
            onClick={() => setLightboxImg(null)}
          >
            <X size={28} />
          </button>
          <img
            src={lightboxImg}
            alt="Proof enlarge"
            className="max-w-full max-h-[85vh] rounded-xl border border-white/20"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
