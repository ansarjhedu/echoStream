
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
export default ReviewCard