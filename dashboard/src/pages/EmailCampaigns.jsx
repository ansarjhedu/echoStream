import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
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
  Star,
  UserX,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../Api';
import { useAuth } from '../context/AuthContext';
import { isPresenceType, hasPerm } from '../utils/permissionHelpers';
import { redirectIfPlanError } from '../utils/planGates';

function outcomeLabel(outcome) {
  if (outcome === 'reviewed') return { text: 'Review left', className: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10' };
  if (outcome === 'unsubscribed') return { text: 'Unsubscribed', className: 'text-amber-300 border-amber-400/30 bg-amber-500/10' };
  if (outcome === 'failed') return { text: 'Failed', className: 'text-red-300 border-red-400/30 bg-red-500/10' };
  if (outcome === 'sent') return { text: 'Awaiting review', className: 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10' };
  return { text: 'Queued', className: 'text-gray-400 border-white/20 bg-white/5' };
}

export default function EmailCampaigns() {
  const { activeStore, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const isRequestView = path.includes('/campaigns/request');
  const isLaunchView = path.includes('/campaigns/launch');
  const isPresence = isPresenceType(activeStore?.storeType);
  const canManageCampaigns =
    user?.role === 'owner' || user?.role === 'admin' || hasPerm(user, 'campaigns');
  const canAiDraft = Boolean(user?.entitlements?.features?.aiCampaignDraft);


  const [products, setProducts] = useState([]);
  const [audience, setAudience] = useState([]);
  const [history, setHistory] = useState([]);
  const [campaignSummary, setCampaignSummary] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [sending, setSending] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestListTab, setRequestListTab] = useState('all');

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
    loadReviewRequests();
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

  const loadReviewRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await api.get(`/store/${activeStore._id}/review-requests`);
      setReviewData(res.data?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load review requests.');
    } finally {
      setLoadingRequests(false);
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
    if (!canAiDraft) {
      toast.info('AI campaign draft is on Growth and Pro. Opening Billing…');
      navigate('/hub/billing');
      return;
    }
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
      if (redirectIfPlanError(err, navigate, toast)) return;
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
      if (redirectIfPlanError(err, navigate, toast)) return;
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
      if (redirectIfPlanError(err, navigate, toast)) return;
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
      loadReviewRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send review request.');
    } finally {
      setRequesting(false);
    }
  };

  const reviewSummary = reviewData?.summary;
  const reviewRequests = reviewData?.requests || [];
  const suppressions = reviewData?.suppressions || [];

  const filteredRequests = useMemo(() => {
    if (requestListTab === 'sent') return reviewRequests.filter((r) => r.outcome === 'sent');
    if (requestListTab === 'reviewed') return reviewRequests.filter((r) => r.outcome === 'reviewed');
    if (requestListTab === 'failed') return reviewRequests.filter((r) => r.outcome === 'failed');
    return reviewRequests;
  }, [reviewRequests, requestListTab]);


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

  if (path.includes('/campaigns') && !isRequestView && !isLaunchView) {
    return <Navigate to="/workspace/campaigns/request" replace />;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 relative overflow-y-auto h-full z-10 w-full flex flex-col no-scrollbar">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Mail className="text-cyan-400" size={32} />
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tight">
              Email Campaigns
            </h1>
          </div>
          <p className="text-gray-400 text-sm">
            {isLaunchView
              ? 'Filter past reviewers, compose a message, send now or schedule.'
              : 'Email one shopper for a review and track sent, completed, and unsubscribed.'}
          </p>
        </div>
      </div>

      <div className="flex flex-col flex-1 animate-fade-in-down min-h-0 w-full">
        <div className="flex-1 bg-white/[0.02] border border-white/10 p-4 md:p-6 lg:p-8 rounded-2xl backdrop-blur-xl overflow-y-auto no-scrollbar w-full shadow-2xl">
          {isRequestView ? (
<div className="w-full space-y-6">
              <p className="text-sm text-gray-400">
                Email one shopper after they buy. Track who received the invite, who left a review, and who unsubscribed.
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
                  Product ID
                  <input
                    value={reqHandle}
                    onChange={(e) => setReqHandle(e.target.value)}
                    list="campaign-product-handles-req"
                    className="min-h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-sm text-white"
                    placeholder="e.g. blue-tee"
                  />
                  <datalist id="campaign-product-handles-req">
                    {products.map((p) => (
                      <option key={p._id} value={p.productHandle}>
                        {p.productTitle}
                      </option>
                    ))}
                  </datalist>
                </label>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={handleReviewRequest}
                    disabled={requesting}
                    className="flex-1 min-h-11 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-sm font-bold hover:bg-cyan-500/30 disabled:opacity-50"
                  >
                    {requesting ? 'Sending…' : 'Send request'}
                  </button>
                  <button
                    type="button"
                    onClick={loadReviewRequests}
                    className="min-h-11 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
                    title="Refresh lists"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>

              {reviewSummary ? (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  {[
                    { label: 'Total sent', value: reviewSummary.sent, icon: Mail },
                    { label: 'Awaiting review', value: reviewSummary.pending, icon: UserPlus },
                    { label: 'Reviews received', value: reviewSummary.reviewed, icon: CheckCircle2 },
                    { label: 'Unsubscribed', value: reviewSummary.unsubscribed, icon: UserX },
                    { label: 'Failed', value: reviewSummary.failed, icon: Star },
                  ].map((card) => (
                    <div key={card.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 flex items-center gap-1">
                        <card.icon size={12} /> {card.label}
                      </p>
                      <p className="text-xl font-bold text-white mt-1">{card.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'All requests' },
                  { id: 'sent', label: 'Sent (waiting)' },
                  { id: 'reviewed', label: 'Review left' },
                  { id: 'failed', label: 'Failed' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRequestListTab(tab.id)}
                    className={`min-h-9 px-4 rounded-full text-xs font-bold border transition-colors ${
                      requestListTab === tab.id
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden w-full">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <h2 className="font-bold text-white text-sm">Review request history</h2>
                  <span className="text-xs text-gray-500">{filteredRequests.length} rows</span>
                </div>
                {loadingRequests ? (
                  <p className="p-6 text-sm text-cyan-400 animate-pulse">Loading requests…</p>
                ) : filteredRequests.length === 0 ? (
                  <p className="p-6 text-sm text-gray-500">No review requests in this view yet.</p>
                ) : (
                  <ul className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
                    {filteredRequests.map((r) => {
                      const badge = outcomeLabel(r.outcome);
                      return (
                        <li key={r._id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-200 truncate">
                              {r.customerName || r.customerEmail}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {r.customerEmail} · {r.productTitle || r.productHandle}
                            </p>
                            {r.review ? (
                              <p className="text-xs text-emerald-400/90 mt-1">
                                {r.review.rating}★ · {new Date(r.review.createdAt).toLocaleString()}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border ${badge.className}`}
                            >
                              {badge.text}
                            </span>
                            <span className="text-xs text-gray-600">{new Date(r.createdAt).toLocaleString()}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {suppressions.length > 0 ? (
                <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] overflow-hidden w-full">
                  <div className="px-4 py-3 border-b border-amber-500/20">
                    <h2 className="font-bold text-white text-sm flex items-center gap-2">
                      <UserX size={16} className="text-amber-400" /> Unsubscribed emails
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">These addresses opted out — review requests and campaigns skip them.</p>
                  </div>
                  <ul className="divide-y divide-white/5 max-h-[240px] overflow-y-auto">
                    {suppressions.map((s) => (
                      <li key={s.email} className="px-4 py-2.5 flex justify-between text-sm">
                        <span className="text-gray-300">{s.email}</span>
                        <span className="text-xs text-gray-500 capitalize">
                          {s.reason} · {new Date(s.createdAt).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : isLaunchView ? (
<div className="w-full space-y-6">
              {campaignSummary ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
                </div>
              ) : null}

              <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5 w-full">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-4">
                  <Filter size={16} className="text-cyan-400" /> Who should receive this email?
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
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={loadAudience}
                    className="min-h-11 px-5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-sm font-bold hover:bg-cyan-500/30 inline-flex items-center gap-2"
                  >
                    <RefreshCw size={14} /> Apply filters
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden w-full">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-white">Select reviewers</h2>
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
                    {allSelected ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="max-h-[320px] overflow-y-auto divide-y divide-white/5">
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

              <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5 w-full space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-bold text-white">Write your message</h2>
                  <button
                    type="button"
                    onClick={handleDraft}
                    disabled={drafting}
                    className="inline-flex items-center gap-2 min-h-10 px-3 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 disabled:opacity-50"
                    title={canAiDraft ? 'Generate with AI' : 'Growth / Pro — opens Billing'}
                  >
                    <Sparkles size={14} />
                    {drafting ? 'Drafting…' : canAiDraft ? 'AI draft' : 'AI draft (upgrade)'}
                  </button>
                </div>
                <label className="flex flex-col gap-1.5 text-xs text-gray-500">
                  Subject
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="min-h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-sm text-white w-full"
                    placeholder="Thank you from your store"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-gray-500">
                  Message
                  <textarea
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    rows={8}
                    className="min-h-[160px] rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-sm text-white resize-y w-full"
                    placeholder="Write as your store. EchoStream only delivers the mail."
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-gray-500 max-w-md">
                  Schedule for later (optional)
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="min-h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-sm text-white"
                  />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
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

              {history.length > 0 ? (
                <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden w-full">
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
              ) : null}
            </div>
          
          ) : null}
        </div>
      </div>
    </div>
  );
}
