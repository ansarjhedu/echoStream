import React, { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  Check,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Shield,
  Calendar,
  Ban,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../Api';
import { useAuth } from '../context/AuthContext';
import PaymentCardVisual from '../components/ui/PaymentCardVisual';

function limLabel(n) {
  return n < 0 ? 'Unlimited' : String(n);
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default function Billing() {
  const { user, setUser } = useAuth();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  if (user?.role !== 'owner') {
    return <Navigate to="/hub/profile" replace />;
  }

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/billing');
      setData(res.data.data);
      if (res.data.data?.entitlements && setUser) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                plan: res.data.data.billedPlanId || prev.plan,
                entitlements: res.data.data.entitlements,
                subscriptionStatus: res.data.data.subscription?.status,
                trialEndsAt: res.data.data.subscription?.trialEndsAt,
                currentPeriodEnd: res.data.data.subscription?.currentPeriodEnd,
                cancelAtPeriodEnd: res.data.data.subscription?.cancelAtPeriodEnd,
                paymentMethodLast4: res.data.data.paymentMethod?.last4,
                paymentMethodBrand: res.data.data.paymentMethod?.brand,
              }
            : prev
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load billing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (params.get('checkout') === 'success') {
      toast.success('Checkout complete — refreshing subscription…');
      load();
    }
  }, [params]);

  const startCheckout = async (planId) => {
    setBusy(`checkout-${planId}`);
    try {
      const res = await api.post('/users/billing/checkout', { plan: planId });
      const url = res.data?.data?.url;
      if (url) window.location.href = url;
      else toast.error('No checkout URL returned.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout unavailable.');
    } finally {
      setBusy('');
    }
  };

  const openPortal = async () => {
    setBusy('portal');
    try {
      const res = await api.post('/users/billing/portal');
      const url = res.data?.data?.url;
      if (url) window.location.href = url;
      else toast.error('No portal URL returned.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Billing portal unavailable.');
    } finally {
      setBusy('');
    }
  };

  const cancelRenew = async () => {
    setBusy('cancel');
    try {
      const res = await api.post('/users/billing/cancel');
      toast.success(res.data.message);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel auto-renew.');
    } finally {
      setBusy('');
    }
  };

  const resumeRenew = async () => {
    setBusy('resume');
    try {
      const res = await api.post('/users/billing/resume');
      toast.success(res.data.message);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resume auto-renew.');
    } finally {
      setBusy('');
    }
  };

  const demoSwitch = async (planId) => {
    setBusy(`demo-${planId}`);
    try {
      const res = await api.patch('/users/billing/plan', { plan: planId });
      toast.success(res.data.message);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update demo plan.');
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return <div className="p-10 text-cyan-400 animate-pulse">Loading billing…</div>;
  }

  const ent = data?.entitlements;
  const sub = data?.subscription || {};
  const pm = data?.paymentMethod || {};
  const paymentsOn = Boolean(data?.paymentsEnabled ?? data?.stripeEnabled);
  const activePlanId = ent?.planId || 'free';

  return (
    <div className="p-4 md:p-10 relative overflow-y-auto h-full z-10 w-full no-scrollbar">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400/80 font-bold mb-2">Owner billing</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tight flex items-center gap-3">
              <CreditCard className="text-cyan-400 shrink-0" /> Billing & plans
            </h1>
            <p className="text-gray-400 text-sm mt-2 max-w-xl">
              Payments via Lemon Squeezy (works for Pakistan-based SaaS) — Visa, Mastercard, Google Pay &amp; Apple Pay.
              Manage card, cancel, or resume auto-renew from here. Owners only.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="min-h-[44px] px-4 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold inline-flex items-center gap-2"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Active card — synced from Lemon Squeezy */}
        <div className="mb-8">
          <PaymentCardVisual
            brand={pm.brand}
            last4={pm.last4}
            expMonth={pm.expMonth}
            expYear={pm.expYear}
          />
          {pm.last4 ? (
            <p className="text-xs text-gray-500 mt-2">
              This is the card on your subscription. Use &quot;Update card / invoices&quot; below to change it in Lemon Squeezy.
            </p>
          ) : null}
        </div>

        {/* Status strip */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          <div className="rounded-2xl border border-white/10 bg-[#0A0F1A] p-4">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Effective plan</p>
            <p className="text-xl font-bold text-white mt-1 capitalize">{ent?.catalog?.name || activePlanId}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0A0F1A] p-4">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 flex items-center gap-1">
              <Calendar size={12} /> Renewal / period end
            </p>
            <p className="text-xl font-bold text-white mt-1">{fmtDate(sub.currentPeriodEnd)}</p>
            <p className="text-xs text-gray-500 mt-1 capitalize">Status: {sub.status || 'none'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0A0F1A] p-4">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Auto-renew</p>
            <p className="text-xl font-bold text-white mt-1">
              {sub.cancelAtPeriodEnd ? 'Off' : sub.subscriptionId ? 'On' : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {sub.cancelAtPeriodEnd ? 'Access until period end' : 'Renews automatically'}
            </p>
          </div>
        </div>

        {/* Usage */}
        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Stores', used: data?.limits?.stores?.used, max: data?.limits?.stores?.max },
            { label: 'Team seats', used: data?.limits?.teamSeats?.used, max: data?.limits?.teamSeats?.max },
            {
              label: 'Campaigns this month',
              used: data?.limits?.campaignsThisMonth?.used,
              max: data?.limits?.campaignsThisMonth?.max,
            },
          ].map((row) => (
            <div key={row.label} className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">{row.label}</p>
              <p className="text-2xl font-bold text-white mt-1">
                {row.used ?? 0}
                <span className="text-sm text-gray-500 font-medium"> / {limLabel(row.max ?? 0)}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-10">
          {paymentsOn && (
            <button
              type="button"
              disabled={busy === 'portal'}
              onClick={openPortal}
              className="min-h-[44px] px-4 rounded-xl font-bold text-sm bg-white text-[#0A0F1A] inline-flex items-center gap-2 disabled:opacity-40"
            >
              <ExternalLink size={14} /> Update card / invoices
            </button>
          )}
          {paymentsOn && sub.subscriptionId && !sub.cancelAtPeriodEnd && (
            <button
              type="button"
              disabled={busy === 'cancel'}
              onClick={cancelRenew}
              className="min-h-[44px] px-4 rounded-xl font-bold text-sm border border-red-500/40 text-red-300 inline-flex items-center gap-2 disabled:opacity-40"
            >
              <Ban size={14} /> Turn off auto-renew
            </button>
          )}
          {paymentsOn && sub.subscriptionId && sub.cancelAtPeriodEnd && (
            <button
              type="button"
              disabled={busy === 'resume'}
              onClick={resumeRenew}
              className="min-h-[44px] px-4 rounded-xl font-bold text-sm border border-emerald-500/40 text-emerald-300 inline-flex items-center gap-2 disabled:opacity-40"
            >
              <RotateCcw size={14} /> Enable auto-renew
            </button>
          )}
          {!paymentsOn && (
            <p className="text-xs text-amber-400/90 flex items-center gap-2">
              <Shield size={14} /> Lemon Squeezy keys not set — demo plan switcher is active. Add
              LEMONSQUEEZY_API_KEY, STORE_ID, VARIANT_GROWTH/PRO + webhook secret for live Visa/Mastercard/Google Pay.
            </p>
          )}
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {(data?.catalog || []).map((p) => {
            const active = activePlanId === p.id;
            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-5 flex flex-col min-h-[320px] ${
                  active ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-white/10 bg-[#0A0F1A]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-bold text-white text-lg">{p.name}</p>
                  {active && (
                    <span className="text-[10px] uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1">
                      <Check size={12} /> Current
                    </span>
                  )}
                </div>
                <p className="text-2xl font-extrabold text-white mb-2">
                  {p.priceMonthly === 0 ? '₹0' : `$${p.priceMonthly}`}
                  <span className="text-sm text-gray-500 font-medium"> / mo</span>
                </p>
                <p className="text-xs text-gray-500 mb-4">{p.blurb}</p>
                <ul className="text-xs text-gray-300 space-y-1.5 mb-5 flex-1">
                  {(p.highlights || []).map((h) => (
                    <li key={h} className="flex gap-2">
                      <Check size={12} className="text-cyan-400 shrink-0 mt-0.5" /> {h}
                    </li>
                  ))}
                </ul>
                {p.id === 'free' ? (
                  <button
                    type="button"
                    disabled
                    className="min-h-[44px] rounded-xl font-bold text-sm bg-white/5 text-gray-500"
                  >
                    Included
                  </button>
                ) : paymentsOn ? (
                  <button
                    type="button"
                    disabled={active || busy === `checkout-${p.id}`}
                    onClick={() => startCheckout(p.id)}
                    className="min-h-[44px] rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-black disabled:opacity-40"
                  >
                    <Sparkles size={14} />
                    {active ? 'Active' : busy === `checkout-${p.id}` ? 'Redirecting…' : 'Subscribe'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={active || busy === `demo-${p.id}`}
                    onClick={() => demoSwitch(p.id)}
                    className="min-h-[44px] rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-black disabled:opacity-40"
                  >
                    <Sparkles size={14} />
                    {active ? 'Active' : 'Select (demo)'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
