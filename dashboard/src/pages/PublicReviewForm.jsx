import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Send } from 'lucide-react';
import { resolveBackendBase } from '../backendBase';
import { personNameError } from '../utils/personName';

const backendBase = resolveBackendBase();

/**
 * Hosted review form — shoppers land here from review-request emails.
 * Submits via public review API using the store API key in the URL.
 */
export default function PublicReviewForm() {
  const { apiKey, productHandle } = useParams();
  const handle = decodeURIComponent(productHandle || 'site');

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [productTitle, setProductTitle] = useState(handle.replace(/-/g, ' '));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const titleLabel = useMemo(
    () => productTitle || handle,
    [productTitle, handle]
  );

  const submit = async (e) => {
    e.preventDefault();
    const nameError = personNameError(customerName);
    if (nameError) {
      setError(nameError);
      return;
    }
    setError('');
    setBusy(true);
    try {
      const body = new FormData();
      body.append('productHandle', handle);
      body.append('productTitle', titleLabel);
      body.append('customerName', customerName.trim());
      body.append('customerEmail', customerEmail.trim());
      body.append('rating', String(rating));
      body.append('comment', comment.trim());

      const res = await fetch(`${backendBase}/public/reviews/add`, {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
        body,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Could not submit review.');
      setDone(true);
    } catch (err) {
      setError(err.message || 'Submit failed.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#0A0F1A] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold text-cyan-400">Thank you</h1>
          <p className="text-gray-400 text-sm">Your review was submitted successfully.</p>
          <Link to="/" className="text-xs text-gray-500 underline">
            EchoStream
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1A] text-white flex items-center justify-center p-5">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4 shadow-2xl"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-400/80 mb-2">Leave a review</p>
          <h1 className="text-xl font-bold">How was {titleLabel}?</h1>
        </div>

        <label className="block text-xs text-gray-500">
          Your name
          <input
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1.5 w-full min-h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-gray-500">
          Email
          <input
            required
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="mt-1.5 w-full min-h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-gray-500">
          Product title
          <input
            value={productTitle}
            onChange={(e) => setProductTitle(e.target.value)}
            className="mt-1.5 w-full min-h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-sm text-white"
          />
        </label>
        <div>
          <p className="text-xs text-gray-500 mb-2">Rating</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className="p-1"
                aria-label={`${n} stars`}
              >
                <Star
                  size={22}
                  className={n <= rating ? 'fill-amber-400 text-amber-400' : 'text-white/25'}
                />
              </button>
            ))}
          </div>
        </div>
        <label className="block text-xs text-gray-500">
          Comment
          <textarea
            required
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mt-1.5 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm text-white resize-y"
          />
        </label>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full min-h-12 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-black disabled:opacity-50"
        >
          <Send size={16} />
          {busy ? 'Submitting…' : 'Submit review'}
        </button>
      </form>
    </div>
  );
}
