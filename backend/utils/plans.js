/** Plan limits for EchoStream SaaS skeleton (Stripe wiring later). */

export const PLAN_IDS = ['free', 'growth', 'pro'];

export const PLAN_CATALOG = {
  free: {
    id: 'free',
    name: 'Free',
    maxStores: 1,
    maxTeamSeats: 2,
    maxCampaignsPerMonth: 2,
    blurb: 'Try Commerce or Presence with core widgets.',
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    maxStores: 5,
    maxTeamSeats: 10,
    maxCampaignsPerMonth: 20,
    blurb: 'Multi-store teams, campaigns, and verified-buyer ops.',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    maxStores: -1,
    maxTeamSeats: -1,
    maxCampaignsPerMonth: -1,
    blurb: 'Unlimited workspaces for scaling brands.',
  },
};

export function resolvePlanId(plan) {
  const id = String(plan || 'free').toLowerCase();
  return PLAN_CATALOG[id] ? id : 'free';
}

export function getPlanLimits(plan) {
  return PLAN_CATALOG[resolvePlanId(plan)];
}

/** -1 means unlimited */
export function isWithinLimit(used, max) {
  if (max < 0) return true;
  return used < max;
}
