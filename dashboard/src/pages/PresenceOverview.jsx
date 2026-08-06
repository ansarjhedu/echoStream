import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../Api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  LayoutDashboard,
  MessageSquareHeart,
  Ticket,
  Sparkles,
  Plus,
  ArrowRight,
  Globe2,
} from 'lucide-react';
import {
  classifyWorkspaceMode,
  isPresenceType,
  getActiveStores,
  canManageWidgets,
  persistWorkspaceMode,
} from '../utils/permissionHelpers';

/**
 * Presence Dashboard — Portfolio / Blog workspaces (no product commerce chrome).
 */
export default function PresenceOverview() {
  const { user, setActiveStore } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ storeName: '', storeType: 'portfolio' });
  const [showCreate, setShowCreate] = useState(false);
  const [overview, setOverview] = useState(null);

  const presenceSites = getActiveStores(stores).filter((s) => isPresenceType(s.storeType));
  const mode = classifyWorkspaceMode(stores);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [storesRes, overviewRes] = await Promise.all([
          api.get('/store/mystores'),
          api.get('/store/presence/overview').catch(() => null),
        ]);
        if (!alive) return;
        const list = storesRes.data.data || [];
        setStores(list);
        if (overviewRes?.data?.data) setOverview(overviewRes.data.data);
        const modeNow = classifyWorkspaceMode(list);
        persistWorkspaceMode(modeNow);
        if (modeNow === 'commerce') {
          navigate('/hub/stores', { replace: true });
        }
      } catch {
        toast.error('Failed to load your sites.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [navigate]);

  const handleCreateSite = async (e) => {
    e.preventDefault();
    if (!form.storeName.trim()) return toast.error('Give your site a name.');
    setCreating(true);
    try {
      const res = await api.post('/store/create', {
        storeName: form.storeName.trim(),
        storeType: form.storeType,
        storeHosting: 'custom',
      });
      const site = res.data.data;
      setStores((prev) => [site, ...prev]);
      persistWorkspaceMode('presence');
      setShowCreate(false);
      setForm({ storeName: '', storeType: 'portfolio' });
      toast.success('Site workspace ready.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create site.');
    } finally {
      setCreating(false);
    }
  };

  const openSiteWorkspace = (site) => {
    setActiveStore(site);
    navigate(canManageWidgets(user) ? '/workspace/widgets' : '/workspace/analytics/overview');
  };

  if (loading) {
    return (
      <div className="p-10 text-cyan-400 animate-pulse">Loading your presence workspace…</div>
    );
  }

  return (
    <div className="p-4 md:p-10 relative overflow-y-auto h-full z-10 w-full no-scrollbar">
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80 font-bold mb-2">
              Presence mode
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-400 tracking-tight flex items-center gap-3">
              <LayoutDashboard className="text-emerald-400 shrink-0" />
              Portfolio & Blog
            </h1>
            <p className="text-gray-400 mt-2 text-sm md:text-base max-w-xl">
              Social proof for sites without product catalogs. Design a widget, connect Google Reviews,
              and embed with your API key — no product handles required.
            </p>
          </div>
          {user?.role === 'owner' && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-cyan-500 text-[#0A0F1A] shadow-lg hover:opacity-90 transition-opacity"
            >
              <Plus size={18} /> New site
            </button>
          )}
        </div>

        {/* Telemetry — sentiment from rating buckets + support tickets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {(() => {
            const s = overview?.sentiment || { positive: 0, neutral: 0, negative: 0, total: 0 };
            const sentimentLabel =
              s.total === 0
                ? '—'
                : `${Math.round((s.positive / s.total) * 100)}% pos`;
            const tickets = overview?.tickets?.unresolved ?? '—';
            const published = overview?.publishedWidgets ?? presenceSites.length;

            return [
              {
                icon: MessageSquareHeart,
                label: 'Review sentiment',
                value: sentimentLabel,
                hint:
                  s.total === 0
                    ? 'No reviews yet · 4–5★ positive'
                    : `${s.positive}↑ · ${s.neutral}· · ${s.negative}↓ · ${s.total} total`,
              },
              {
                icon: Ticket,
                label: 'Open tickets',
                value: String(tickets),
                hint:
                  overview?.tickets
                    ? `${overview.tickets.open} open · ${overview.tickets.in_progress} in progress`
                    : 'From Help & Support',
              },
              {
                icon: Sparkles,
                label: 'Published widgets',
                value: String(published),
                hint: `${overview?.sites ?? presenceSites.length} site workspace(s)`,
              },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 backdrop-blur-xl"
              >
                <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider mb-3">
                  <card.icon size={14} className="text-emerald-400" />
                  {card.label}
                </div>
                <p className="text-2xl font-black text-white">{card.value}</p>
                <p className="text-xs text-gray-500 mt-1">{card.hint}</p>
                {card.label === 'Review sentiment' && s.total > 0 && (
                  <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-400"
                      style={{ width: `${(s.positive / s.total) * 100}%` }}
                    />
                    <div
                      className="h-full bg-amber-400/80"
                      style={{ width: `${(s.neutral / s.total) * 100}%` }}
                    />
                    <div
                      className="h-full bg-rose-400/80"
                      style={{ width: `${(s.negative / s.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ));
          })()}
        </div>

        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Globe2 size={18} className="text-cyan-400" /> Your sites
            </h2>
            {canManageWidgets(user) && presenceSites.length > 0 && (
              <Link
                to="/workspace/widgets"
                onClick={() => presenceSites[0] && setActiveStore(presenceSites[0])}
                className="text-sm font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
              >
                Open Widget Catalog <ArrowRight size={14} />
              </Link>
            )}
          </div>

          {presenceSites.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
              <p className="text-gray-400 mb-4">
                {mode === 'empty'
                  ? 'No site yet. Create a Portfolio or Blog workspace to get an API key.'
                  : 'No portfolio/blog sites on this account.'}
              </p>
              {user?.role === 'owner' && (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="min-h-[44px] px-5 py-2 rounded-xl border border-emerald-500/40 text-emerald-300 font-bold text-sm hover:bg-emerald-500/10"
                >
                  Create your first site
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {presenceSites.map((site) => (
                <button
                  key={site._id}
                  type="button"
                  onClick={() => openSiteWorkspace(site)}
                  className="text-left p-5 rounded-xl border border-white/10 bg-black/20 hover:border-emerald-500/40 hover:bg-white/[0.04] transition-all"
                >
                  <p className="font-bold text-white truncate">{site.storeName}</p>
                  <p className="text-xs text-emerald-400/80 uppercase tracking-wider mt-1 capitalize">
                    {site.storeType}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono mt-3 truncate">
                    API · {site.apiKey ? `${site.apiKey.slice(0, 8)}…` : 'pending'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/hub/support"
            className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-cyan-500/30 transition-colors"
          >
            <Ticket className="text-yellow-400 mb-2" size={20} />
            <p className="font-bold text-white">Help & Support</p>
            <p className="text-xs text-gray-500 mt-1">Open tickets and conversations</p>
          </Link>
          <button
            type="button"
            disabled={!canManageWidgets(user) || presenceSites.length === 0}
            onClick={() => {
              if (presenceSites[0]) {
                setActiveStore(presenceSites[0]);
                navigate('/workspace/google-reviews');
              }
            }}
            className="text-left p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-emerald-500/30 transition-colors disabled:opacity-40"
          >
            <Globe2 className="text-emerald-400 mb-2" size={20} />
            <p className="font-bold text-white">Google Reviews</p>
            <p className="text-xs text-gray-500 mt-1">Connect Place ID → sync → Design Lab</p>
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateSite}
            className="w-full max-w-md bg-[#0A0F1A] border border-white/10 rounded-2xl p-6 shadow-2xl"
          >
            <h3 className="text-xl font-bold text-white mb-4">Create a site workspace</h3>
            <label className="block text-xs text-gray-400 mb-1">Site name</label>
            <input
              required
              value={form.storeName}
              onChange={(e) => setForm({ ...form, storeName: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white mb-4 focus:outline-none focus:border-emerald-400"
              placeholder="My Portfolio"
            />
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select
              value={form.storeType}
              onChange={(e) => setForm({ ...form, storeType: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white mb-6 focus:outline-none focus:border-emerald-400"
            >
              <option value="portfolio">Portfolio</option>
              <option value="blog">Blog / Content</option>
            </select>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="min-h-[44px] px-5 py-2 rounded-xl font-bold text-sm bg-emerald-500 text-[#0A0F1A] disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create site'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
