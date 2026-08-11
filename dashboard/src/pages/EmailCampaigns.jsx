import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Mail,
  Search,
  Sparkles,
  Send,
  RefreshCw,
  CheckSquare,
  Square,
  Filter,
  CalendarClock,
  UserPlus,
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../Api';
import { useAuth } from '../context/AuthContext';
import { isPresenceType, hasPerm } from '../utils/permissionHelpers';

/**
 * Email Campaigns — ecommerce owners or staff with `campaigns` permission.
 * Audience = unique reviewer emails; filter by product / rating / search.
 */
export default function EmailCampaigns() {
  const { activeStore, user } = useAuth();
  const isPresence = isPresenceType(activeStore?.storeType);
  const canManageCampaigns =
    user?.role === 'owner' || user?.role === 'admin' || hasPerm(user, 'campaigns');

  const [products, setProducts] = useState([]);
  const [audience, setAudience] = useState([]);
  const [history, setHistory] = useState([]);
  const [campaignSummary, setCampaignSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const [productId, setProductId] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [minRating, setMinRating] = useState('');
  const [selected, setSelected] = useState(() => new Set());

  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const [reqEmail, setReqEmail] = useState('');
  const [reqName, setReqName] = useState('');
  const [reqHandle, setReqHandle] = useState('');

  useEffect(() => {
    if (!activeStore?._id || isPresence || !canManageCampaigns) return;
    loadAudience();
    loadHistory();
  }, [activeStore?._id, isPresence, canManageCampaigns]);

  const loadAudience = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/store/${activeStore._id}/campaigns/audience`, {
        params: {
          productId: productId || undefined,
          emailSearch: emailSearch.trim() || undefined,
          minRating: minRating || undefined,
        },
      });
      setAudience(res.data?.data?.audience || []);
      setProducts(res.data?.data?.products || []);
      setSelected(new Set());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load reviewers.');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get(`/store/${activeStore._id}/campaigns`);
      setHistory(res.data?.data || []);
      setCampaignSummary(res.data?.summary || null);
    } catch {
      /* ignore */
    }
  };

  const allSelected = audience.length > 0 && selected.size === audience.length;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(audience.map((r) => r.email.toLowerCase())));
  };

  const toggleOne = (email) => {
    const key = email.toLowerCase();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedProductTitle = useMemo(() => {
    if (!productId) return '';
    return products.find((p) => p._id === productId)?.productTitle || '';
  }, [productId, products]);

  const campaignPayload = () => ({
    subject: subject.trim(),
    bodyText: bodyText.trim(),
    emails: [...selected],
    productId: productId || undefined,
    emailSearch: emailSearch.trim() || undefined,
    minRating: minRating || undefined,
  });

  const handleDraft = async () => {
    setDrafting(true);
    try {
      const res = await api.post(`/store/${activeStore._id}/campaigns/draft`, {
        goal: 'thank reviewers and invite them back',
        productTitle: selectedProductTitle || undefined,
      });
      setSubject(res.data?.data?.subject || '');
      setBodyText(res.data?.data?.bodyText || '');
      toast.success(res.data?.data?.source === 'ai' ? 'Draft ready.' : 'Template draft ready.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not draft message.');
    } finally {
      setDrafting(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !bodyText.trim()) {
      return toast.error('Add a subject and message first.');
    }
    if (selected.size < 1) {
      return toast.error('Select at least one reviewer.');
    }
    if (!window.confirm(`Send this campaign to ${selected.size} recipient(s)?`)) return;

    setSending(true);
    try {
      const res = await api.post(`/store/${activeStore._id}/campaigns/send`, campaignPayload());
      toast.success(res.data?.message || 'Campaign sent.');
      loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Send failed.');
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = async () => {
    if (!subject.trim() || !bodyText.trim()) {
      return toast.error('Add a subject and message first.');
    }
    if (selected.size < 1) {
      return toast.error('Select at least one reviewer.');
    }
    if (!scheduledAt) {
      return toast.error('Pick a schedule date and time.');
    }
    setScheduling(true);
    try {
      const res = await api.post(`/store/${activeStore._id}/campaigns/schedule`, {
        ...campaignPayload(),
        scheduledAt: new Date(scheduledAt).toISOString(),
      });
      toast.success(res.data?.message || 'Campaign scheduled.');
      setScheduledAt('');
      loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Schedule failed.');
    } finally {
      setScheduling(false);
    }
  };

  const handleReviewRequest = async () => {
    if (!reqEmail.trim() || !reqHandle.trim()) {
      return toast.error('Customer email and product handle are required.');
    }
    setRequesting(true);
    try {
      const res = await api.post(`/store/${activeStore._id}/review-requests`, {
        customerEmail: reqEmail.trim(),
        customerName: reqName.trim() || undefined,
        productHandle: reqHandle.trim(),
      });
      toast.success(res.data?.message || 'Review request sent.');
      setReqEmail('');
      setReqName('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send review request.');
    } finally {
      setRequesting(false);
    }
  };

  if (!activeStore) return null;
  if (isPresence) {
    return <Navigate to="/workspace/widgets" replace />;
  }
  if (!canManageCampaigns) {
    return (
      <div className="p-8 md:p-10 max-w-lg mx-auto text-center text-gray-400">
        You need the campaigns permission to open Email Campaigns. Ask the store owner in Team Management.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-400/80 mb-2">Growth</p>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Mail className="text-cyan-400" size={28} />
            Email Campaigns
          </h1>
          <p className="text-gray-400 text-sm mt-2 max-w-xl">
            Reach past reviewers, schedule sends, or trigger a post-purchase review request. API webhook:{' '}
            <code className="text-cyan-400/90 text-[11px]">POST /api/public/review-requests</code>
          </p>
        </div>
        <button
          type="button"
          onClick={loadAudience}
          className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold"
        >
          <RefreshCw size={16} /> Refresh list
        </button>
      </header>

      {campaignSummary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Campaigns', value: campaignSummary.campaigns },
            { label: 'Emails sent', value: campaignSummary.totalSent },
            { label: 'Failed', value: campaignSummary.totalFailed },
            { label: 'Delivery rate', value: `${campaignSummary.deliveryRate || 0}%` },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">{card.label}</p>
              <p className="text-xl font-bold text-white mt-1">{card.value}</p>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-4">
          <UserPlus size={16} className="text-cyan-400" /> Request a review
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Send one shopper a leave-a-review email (post-purchase). Same flow as the public API webhook.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1.5 text-xs text-gray-500">
            Customer email
            <input
              value={reqEmail}
              onChange={(e) => setReqEmail(e.target.value)}
              className="min-h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-sm text-white"
              placeholder="buyer@email.com"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-gray-500">
            Name (optional)
            <input
              value={reqName}
              onChange={(e) => setReqName(e.target.value)}
              className="min-h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-sm text-white"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-gray-500">
            Product handle
            <input
              value={reqHandle}
              onChange={(e) => setReqHandle(e.target.value)}
              list="campaign-product-handles"
              className="min-h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-sm text-white"
              placeholder="blue-tee"
            />
            <datalist id="campaign-product-handles">
              {products.map((p) => (
                <option key={p._id} value={p.productHandle}>
                  {p.productTitle}
                </option>
              ))}
            </datalist>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleReviewRequest}
              disabled={requesting}
              className="w-full min-h-11 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-sm font-bold hover:bg-cyan-500/30 disabled:opacity-50"
            >
              {requesting ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-4">
          <Filter size={16} className="text-cyan-400" /> Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1.5 text-xs text-gray-500">
            Product
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="min-h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-sm text-white"
            >
              <option value="">All products</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.productTitle}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-gray-500">
            Min rating
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="min-h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-sm text-white"
            >
              <option value="">Any</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n}+ stars
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-gray-500 md:col-span-2">
            Search email
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={emailSearch}
                onChange={(e) => setEmailSearch(e.target.value)}
                placeholder="name@example.com"
                className="w-full min-h-11 rounded-xl bg-black/40 border border-white/10 pl-10 pr-3 text-sm text-white"
              />
            </div>
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={loadAudience}
            className="min-h-11 px-5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-sm font-bold hover:bg-cyan-500/30"
          >
            Apply filters
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden min-h-[420px] flex flex-col">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-white">Reviewers</h2>
              <p className="text-xs text-gray-500">
                {audience.length} contacts · {selected.size} selected
              </p>
            </div>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1.5"
            >
              {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
              {allSelected ? 'Clear' : 'Select all'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[520px] divide-y divide-white/5">
            {loading ? (
              <p className="p-6 text-sm text-cyan-400 animate-pulse">Loading reviewers…</p>
            ) : audience.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No reviewer emails match these filters.</p>
            ) : (
              audience.map((row) => {
                const key = row.email.toLowerCase();
                const on = selected.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleOne(row.email)}
                    className={`w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-white/[0.03] transition-colors ${
                      on ? 'bg-cyan-500/5' : ''
                    }`}
                  >
                    <span className="mt-0.5 text-cyan-400">
                      {on ? <CheckSquare size={18} /> : <Square size={18} className="text-gray-600" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white truncate">
                        {row.customerName || 'Customer'}
                      </span>
                      <span className="block text-xs text-cyan-400/90 truncate">{row.email}</span>
                      <span className="block text-[11px] text-gray-500 mt-1 truncate">
                        {row.reviewCount} review{row.reviewCount === 1 ? '' : 's'} · avg {row.avgRating}★
                        {row.products?.[0] ? ` · ${row.products[0]}` : ''}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5 min-h-[420px] flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-white">Compose</h2>
            <button
              type="button"
              onClick={handleDraft}
              disabled={drafting}
              className="inline-flex items-center gap-2 min-h-10 px-3 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 disabled:opacity-50"
            >
              <Sparkles size={14} />
              {drafting ? 'Drafting…' : 'AI draft'}
            </button>
          </div>
          <label className="flex flex-col gap-1.5 text-xs text-gray-500">
            Subject
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="min-h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-sm text-white"
              placeholder="Thank you from your store"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-gray-500 flex-1">
            Message
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={10}
              className="flex-1 min-h-[180px] rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-sm text-white resize-y"
              placeholder="Write as your store. EchoStream only delivers the mail."
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-gray-500">
            Schedule (optional)
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="min-h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-sm text-white"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleSchedule}
              disabled={scheduling || selected.size < 1 || !scheduledAt}
              className="min-h-12 w-full rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 disabled:opacity-40"
            >
              <CalendarClock size={16} />
              {scheduling ? 'Scheduling…' : 'Schedule send'}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || selected.size < 1}
              className="min-h-12 w-full rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-black disabled:opacity-40"
            >
              <Send size={16} />
              {sending ? 'Sending…' : `Send now (${selected.size || 0})`}
            </button>
          </div>
        </section>
      </div>

      {history.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="font-bold text-white text-sm">Recent campaigns</h2>
          </div>
          <ul className="divide-y divide-white/5">
            {history.map((c) => (
              <li
                key={c._id}
                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm"
              >
                <span className="font-medium text-gray-200 truncate">
                  {c.subject}
                  {c.status === 'scheduled' ? (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded-full">
                      Scheduled
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-gray-500">
                  {c.status === 'scheduled' && c.scheduledAt
                    ? `Sends ${new Date(c.scheduledAt).toLocaleString()}`
                    : `${c.sentCount}/${c.recipientCount} sent`}
                  {c.failedCount ? ` · ${c.failedCount} failed` : ''}
                  {c.suppressedCount ? ` · ${c.suppressedCount} unsubscribed` : ''}
                  {' · '}
                  {new Date(c.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
