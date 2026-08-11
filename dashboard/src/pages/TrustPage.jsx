import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, ExternalLink, Shield } from 'lucide-react';

const backendBase = (import.meta.env.VITE_BACKEND_URL || 'https://echo-stream-pi.vercel.app/api')
  .trim()
  .replace(/^['"]|['"]$/g, '')
  .replace(/\/$/, '');

function Stars({ rating }) {
  const n = Math.round(Number(rating) || 0);
  return (
    <span className="inline-flex gap-0.5 text-amber-400" aria-label={`${n} stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} className={i <= n ? 'fill-amber-400' : 'text-white/20'} />
      ))}
    </span>
  );
}

/**
 * Public shareable trust page — no auth.
 */
export default function TrustPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${backendBase}/public/trust/${encodeURIComponent(slug)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Not found');
        if (alive) setData(json.data);
      } catch (err) {
        if (alive) setError(err.message || 'Failed to load');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const bg = data?.widgetConfig?.backgroundColor || '#0A0F1A';
  const text = data?.widgetConfig?.textColor || '#ffffff';
  const accent = data?.widgetConfig?.primaryColor || '#22d3ee';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0F1A] text-cyan-400">
        Loading trust page…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0F1A] text-gray-400 gap-3 p-6">
        <p>{error || 'Trust page not found.'}</p>
        <Link to="/" className="text-cyan-400 text-sm">
          EchoStream home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: bg, color: text, fontFamily: data.widgetConfig?.fontFamily || 'system-ui' }}>
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: `radial-gradient(ellipse at top, ${accent}33, transparent 55%)`,
        }}
      />
      <main className="relative max-w-3xl mx-auto px-5 py-12 md:py-16">
        <p className="text-xs uppercase tracking-[0.25em] opacity-70 mb-3">Customer trust</p>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: accent }}>
          {data.storeName}
        </h1>
        <p className="mt-3 text-sm opacity-80 max-w-xl">
          Verified social proof hosted by EchoStream
          {data.websiteUrl ? (
            <>
              {' · '}
              <a href={data.websiteUrl} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">
                Visit site <ExternalLink size={12} />
              </a>
            </>
          ) : null}
        </p>

        <div className="mt-8 flex flex-wrap items-end gap-6">
          <div>
            <p className="text-5xl font-black" style={{ color: accent }}>
              {data.stats?.avgRating || 0}
            </p>
            <Stars rating={data.stats?.avgRating} />
          </div>
          <p className="text-sm opacity-70 pb-1">{data.stats?.totalReviews || 0} approved reviews</p>
        </div>

        <ul className="mt-10 space-y-4">
          {(data.reviews || []).map((r) => (
            <li
              key={r._id}
              className="rounded-2xl border p-4 md:p-5"
              style={{ borderColor: `${accent}33`, background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="font-semibold">{r.customerName || 'Customer'}</p>
                <Stars rating={r.rating} />
              </div>
              {r.productTitle ? <p className="text-xs opacity-50 mb-2">{r.productTitle}</p> : null}
              <p className="text-sm leading-relaxed opacity-90">{r.comment}</p>
              {r.isVerifiedBuyer ? (
                <p className="mt-2 text-[11px] inline-flex items-center gap-1 opacity-60">
                  <Shield size={11} /> Verified buyer
                </p>
              ) : null}
            </li>
          ))}
          {(data.reviews || []).length === 0 && (
            <li className="text-sm opacity-60">No approved reviews yet.</li>
          )}
        </ul>

        <p className="mt-14 text-center text-xs opacity-50">
          Powered by{' '}
          <Link to="/" className="underline" style={{ color: accent }}>
            EchoStream
          </Link>
        </p>
      </main>
    </div>
  );
}
