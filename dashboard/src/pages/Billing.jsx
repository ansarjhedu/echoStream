import React, { useEffect, useState } from 'react';
import { CreditCard, Check, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../Api';
import { useAuth } from '../context/AuthContext';

function limLabel(n) {
  return n < 0 ? 'Unlimited' : String(n);
}

export default function Billing() {
  const { user, setUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/billing');
      setData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load billing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const switchPlan = async (planId) => {
    if (user?.role !== 'owner') {
      return toast.info('Only the account owner can change plans.');
    }
    setUpdating(planId);
    try {
      const res = await api.patch('/users/billing/plan', { plan: planId });
      toast.success(res.data.message || 'Plan updated.');
      if (res.data.user && setUser) {
        setUser((prev) => ({ ...prev, ...res.data.user, plan: res.data.data?.plan?.id || planId }));
      }
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update plan.');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return <div className="p-10 text-cyan-400 animate-pulse">Loading billing…</div>;
  }

  if (data?.audience === 'platform') {
    return (
      <div className="p-4 md:p-10 max-w-3xl">
        <h1 className="text-3xl font-extrabold text-white mb-2 flex items-center gap-2">
          <CreditCard className="text-cyan-400" /> Plans
        </h1>
        <p className="text-gray-400 text-sm mb-6">{data.note}</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {(data.catalog || []).map((p) => (
            <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <p className="font-bold text-white text-lg">{p.name}</p>
              <p className="text-xs text-gray-500 mt-2">{p.blurb}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const plan = data?.plan;
  const usage = data?.usage || {};

  return (
    <div className="p-4 md:p-10 relative overflow-y-auto h-full z-10 w-full no-scrollbar">
      <div className="max-w-5xl">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-400/80 font-bold mb-2">SaaS plans</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tight flex items-center gap-3 mb-2">
          <CreditCard className="text-cyan-400 shrink-0" /> Billing
        </h1>
        <p className="text-gray-400 text-sm mb-8 max-w-xl">
          Enforceable Free / Growth / Pro limits today. Stripe checkout is stubbed for the next release.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Stores', used: usage.stores, max: plan?.maxStores },
            { label: 'Team seats', used: usage.teamSeats, max: plan?.maxTeamSeats },
            { label: 'Campaigns this month', used: usage.campaignsThisMonth, max: plan?.maxCampaignsPerMonth },
          ].map((row) => (
            <div key={row.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">{row.label}</p>
              <p className="text-2xl font-bold text-white mt-1">
                {row.used ?? 0}
                <span className="text-sm text-gray-500 font-medium"> / {limLabel(row.max ?? 0)}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {(data?.catalog || []).map((p) => {
            const active = plan?.id === p.id;
            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-5 flex flex-col ${
                  active ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="font-bold text-white text-lg">{p.name}</p>
                  {active && (
                    <span className="text-[10px] uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1">
                      <Check size={12} /> Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-4 flex-1">{p.blurb}</p>
                <ul className="text-xs text-gray-400 space-y-1.5 mb-5">
                  <li>Stores: {limLabel(p.maxStores)}</li>
                  <li>Team seats: {limLabel(p.maxTeamSeats)}</li>
                  <li>Campaigns / month: {limLabel(p.maxCampaignsPerMonth)}</li>
                </ul>
                <button
                  type="button"
                  disabled={active || updating === p.id || user?.role !== 'owner'}
                  onClick={() => switchPlan(p.id)}
                  className="min-h-[44px] rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-black disabled:opacity-40"
                >
                  <Sparkles size={14} />
                  {active ? 'Active plan' : updating === p.id ? 'Updating…' : 'Select (demo)'}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-gray-600 mt-6">
          {data?.stripe?.message || 'Stripe pending.'}
        </p>
      </div>
    </div>
  );
}
