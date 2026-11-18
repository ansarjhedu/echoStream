import { useEffect, useMemo, useState } from 'react';
import { CreditCard, RefreshCw, Filter } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../Api';
import Fold from '../../components/Fold';
import PaymentCardVisual from '../../components/ui/PaymentCardVisual';

const PLAN_OPTIONS = [
  { value: 'all', label: 'All plans' },
  { value: 'free', label: 'Free' },
  { value: 'growth', label: 'Growth' },
  { value: 'pro', label: 'Pro' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'renewing', label: 'Actively renewing' },
  { value: 'active', label: 'Active (any)' },
  { value: 'canceled', label: 'Canceled / ending' },
  { value: 'past_due', label: 'Past due' },
  { value: 'free', label: 'Free only' },
];

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

function statusBadge(owner) {
  if (owner.cancelAtPeriodEnd) {
    return { label: 'Canceling', className: 'text-amber-300 border-amber-400/30 bg-amber-500/10' };
  }
  if (owner.subscriptionStatus === 'active') {
    return { label: 'Active', className: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10' };
  }
  if (owner.subscriptionStatus === 'past_due') {
    return { label: 'Past due', className: 'text-red-300 border-red-400/30 bg-red-500/10' };
  }
  if (owner.subscriptionStatus === 'canceled') {
    return { label: 'Canceled', className: 'text-gray-400 border-white/20 bg-white/5' };
  }
  return { label: 'Free', className: 'text-gray-400 border-white/20 bg-white/5' };
}

export default function AdminSubscriptions() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState('all');
  const [status, setStatus] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/subscriptions/list', {
        params: { plan, status },
      });
      setRows(res.data?.data || []);
      setSummary(res.data?.summary || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load subscriptions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [plan, status]);

  const filteredCount = useMemo(() => rows.length, [rows]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-red-400/80 mb-2">Platform</p>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <CreditCard className="text-red-400" size={28} />
            Subscriptions
          </h1>
          <p className="text-gray-400 text-sm mt-2 max-w-2xl">
            Owners on Free, Growth, or Pro — filter by plan, active renewals, or canceled subscriptions.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      {summary ? (
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Showing', value: filteredCount },
            { label: 'Free', value: summary.free },
            { label: 'Growth', value: summary.growth },
            { label: 'Pro', value: summary.pro },
            { label: 'Renewing monthly', value: summary.activelyRenewing },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">{card.label}</p>
              <p className="text-xl font-bold text-white mt-1">{card.value}</p>
            </div>
          ))}
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-4">
          <Filter size={16} className="text-red-400" /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <label className="flex flex-col gap-1.5 text-xs text-gray-500">
            Plan
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="min-h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-sm text-white"
            >
              {PLAN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-gray-500">
            Subscription status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="min-h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-sm text-white"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-bold text-white text-sm">Store owners</h2>
          <span className="text-xs text-gray-500">{filteredCount} result{filteredCount === 1 ? '' : 's'}</span>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-red-400 animate-pulse">Loading subscriptions…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No owners match these filters.</p>
        ) : (
          <>
          <div className="md:hidden divide-y divide-white/10">
            {rows.map((o) => {
              const badge = statusBadge(o);
              return (
                <article key={o._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{o.userName || 'Owner'}</p>
                      <p className="text-sm capitalize text-gray-300 mt-1">{o.planLabel || o.plan || 'Free'}</p>
                      <p className="text-xs text-gray-500 mt-1">Renews / ends {fmtDate(o.currentPeriodEnd)}</p>
                    </div>
                    <span className={`shrink-0 inline-flex text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <Fold title="Billing details">
                    <p className="text-xs text-gray-400 break-all">{o.email || '—'}</p>
                    <p className="text-xs text-gray-400">Renews / ends: {fmtDate(o.currentPeriodEnd)}</p>
                    <PaymentCardVisual
                      brand={o.paymentMethodBrand}
                      last4={o.paymentMethodLast4}
                      expMonth={o.paymentMethodExpMonth}
                      expYear={o.paymentMethodExpYear}
                      holder={o.userName}
                    />
                    <p className="text-xs text-gray-500">Joined {fmtDate(o.createdAt)}</p>
                    {o.renewingMonthly ? (
                      <p className="text-xs text-emerald-400/80">Monthly renewal</p>
                    ) : null}
                  </Fold>
                </article>
              );
            })}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500 border-b border-white/10">
                  <th className="px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Renews / ends</th>
                  <th className="px-4 py-3 font-semibold">Card</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((o) => {
                  const badge = statusBadge(o);
                  return (
                    <tr key={o._id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{o.userName || 'Owner'}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[220px]">{o.email}</p>
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-200">{o.planLabel || o.plan || 'Free'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        {o.renewingMonthly ? (
                          <span className="block text-[10px] text-emerald-400/80 mt-1">Monthly renewal</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(o.currentPeriodEnd)}</td>
                      <td className="px-4 py-3">
                        <div className="w-64">
                          <PaymentCardVisual
                            brand={o.paymentMethodBrand}
                            last4={o.paymentMethodLast4}
                            expMonth={o.paymentMethodExpMonth}
                            expYear={o.paymentMethodExpYear}
                            holder={o.userName}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(o.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  );
}
