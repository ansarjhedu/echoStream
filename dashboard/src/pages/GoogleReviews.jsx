import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Globe2, Link2, RefreshCw, Unplug, Star, ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../Api';
import { useAuth } from '../context/AuthContext';
import { canManageWidgets, isPresenceType } from '../utils/permissionHelpers';

/**
 * Connect Google Business Profile reviews → import into Design Lab product stream.
 */
export default function GoogleReviews() {
  const { activeStore, setActiveStore, user } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [placeId, setPlaceId] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [minRating, setMinRating] = useState(1);

  const presence = isPresenceType(activeStore?.storeType);

  useEffect(() => {
    if (!activeStore?._id) return undefined;
    let alive = true;
    (async () => {
      try {
        const res = await api.get(`/store/${activeStore._id}/google-reviews`);
        if (!alive) return;
        const data = res.data.data;
        setStatus(data);
        setPlaceId(data.googleReviews?.placeId || '');
        setBusinessName(data.googleReviews?.businessName || '');
        setMinRating(data.googleReviews?.minRating || 1);
      } catch {
        toast.error('Failed to load Google Reviews status.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [activeStore?._id]);

  if (!activeStore) {
    return <Navigate to={presence ? '/hub/presence' : '/hub/stores'} replace />;
  }
  if (!canManageWidgets(user)) {
    return <Navigate to="/workspace/analytics/overview" replace />;
  }

  const handleConnect = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post(`/store/${activeStore._id}/google-reviews/connect`, {
        placeId,
        businessName,
        minRating,
      });
      const googleReviews = res.data.data;
      setStatus((prev) => ({ ...prev, googleReviews }));
      setActiveStore({ ...activeStore, googleReviews });
      toast.success(res.data.message || 'Connected.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Connect failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleFilterSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch(`/store/${activeStore._id}/google-reviews/filters`, { minRating });
      const googleReviews = res.data.data;
      setStatus((prev) => ({ ...prev, googleReviews }));
      setActiveStore({ ...activeStore, googleReviews });
      toast.success('Rating filter saved.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update filter.');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post(`/store/${activeStore._id}/google-reviews/sync`);
      const data = res.data.data;
      setStatus((prev) => ({
        ...prev,
        googleReviews: data.googleReviews,
        googleReviewCount: (prev?.googleReviewCount || 0) + (data.imported || 0),
        productHandle: data.productHandle,
      }));
      setActiveStore({ ...activeStore, googleReviews: data.googleReviews });
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setSaving(true);
    try {
      const res = await api.delete(`/store/${activeStore._id}/google-reviews`);
      setStatus((prev) => ({ ...prev, googleReviews: res.data.data }));
      setActiveStore({ ...activeStore, googleReviews: res.data.data });
      setPlaceId('');
      toast.success('Disconnected.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Disconnect failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-cyan-400 animate-pulse">Loading Google Reviews…</div>;
  }

  const connected = Boolean(status?.googleReviews?.connected);
  const embedHandle =
    status?.productHandle ||
    (presence
      ? String(activeStore.storeType || 'portfolio').toLowerCase()
      : 'google-reviews');

  return (
    <div className="p-4 md:p-8 lg:p-10 relative overflow-y-auto h-full z-10 w-full no-scrollbar">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-400/80 font-bold mb-2">
          {presence ? 'Presence' : 'Commerce'} · {activeStore.storeName}
        </p>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tight flex items-center gap-3 mb-2">
          <Globe2 className="text-cyan-400 shrink-0" /> Google Reviews
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Each user pastes <strong className="text-gray-300 font-medium">their own</strong> Google Place ID for
          the business they want to sync. Find it in{' '}
          <a
            href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
            target="_blank"
            rel="noreferrer"
            className="text-cyan-400 hover:underline"
          >
            Google’s Place ID Finder
          </a>
          {' '}or Google Maps → share your listing → the ID looks like <code className="text-cyan-400/90">ChIJ…</code>.
          Then set a minimum star filter, sync, and publish via Design Lab using product handle{' '}
          <code className="text-cyan-400/90">{embedHandle}</code>.
        </p>

        {!status?.placesApiConfigured && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
            Server needs <code className="font-mono text-xs">GOOGLE_PLACES_API_KEY</code> to sync live reviews.
            You can still save a Place ID and filters now.
          </div>
        )}

        <form
          onSubmit={handleConnect}
          className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-4 mb-6 backdrop-blur-xl"
        >
          <div>
            <label className="block text-xs text-gray-400 mb-1">Google Place ID</label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                required
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value)}
                placeholder="ChIJ…"
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Business name (optional)</label>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-400"
              placeholder="Displayed after sync if Google returns a name"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[44px] rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-purple-600 text-white disabled:opacity-50"
          >
            {connected ? 'Update connection' : 'Connect Place ID'}
          </button>
        </form>

        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 mb-6 backdrop-blur-xl">
          <h2 className="text-white font-bold mb-3 flex items-center gap-2">
            <Star size={16} className="text-amber-400" /> Minimum rating to show
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Google reviews below this star count are skipped on import and hidden on the public widget.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMinRating(n)}
                className={`min-h-[40px] px-4 rounded-xl text-sm font-bold border transition-colors ${
                  minRating === n
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                {n}+ ★
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleFilterSave}
            disabled={saving || !connected}
            className="min-h-[40px] px-4 rounded-xl text-sm font-bold border border-white/10 text-white hover:bg-white/5 disabled:opacity-40"
          >
            Save filter
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || !connected}
            className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl font-bold text-sm bg-emerald-500/90 text-[#0A0F1A] disabled:opacity-40"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync from Google'}
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={saving || !connected}
            className="min-h-[44px] px-4 inline-flex items-center justify-center gap-2 rounded-xl font-bold text-sm border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 disabled:opacity-40"
          >
            <Unplug size={16} /> Disconnect
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
            <p className="text-[10px] uppercase text-gray-500 tracking-wider">Imported</p>
            <p className="text-2xl font-black text-white mt-1">{status?.googleReviewCount ?? 0}</p>
          </div>
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
            <p className="text-[10px] uppercase text-gray-500 tracking-wider">Last sync</p>
            <p className="text-sm font-bold text-white mt-2">
              {status?.googleReviews?.lastSyncedAt
                ? new Date(status.googleReviews.lastSyncedAt).toLocaleString()
                : 'Never'}
            </p>
          </div>
        </div>

        <Link
          to="/workspace/design-lab"
          className="inline-flex items-center gap-2 text-sm font-bold text-cyan-400 hover:text-cyan-300"
        >
          Open Design Lab to publish <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
