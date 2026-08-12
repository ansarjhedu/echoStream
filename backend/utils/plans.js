/** EchoStream SaaS plans — limits, features, and public pricing copy. */

export const PLAN_IDS = ['free', 'growth', 'pro'];
export const TRIAL_DAYS = 30;

export const PLAN_CATALOG = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    maxStores: 1,
    maxTeamSeats: 2,
    maxCampaignsPerMonth: 2,
    blurb: 'Launch one workspace and prove the embed.',
    features: {
      campaigns: true,
      thankYouEmails: false,
      googleReviews: true,
      designLab: true,
      aiCampaignDraft: false,
      aiDisputeAssist: false,
      verifiedBuyerHmac: true,
      prioritySupport: false,
    },
    highlights: ['1 store / site', '2 team seats', '2 campaigns / month', 'Design Lab + widgets', 'Google Reviews sync'],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    priceMonthly: 29,
    maxStores: 5,
    maxTeamSeats: 10,
    maxCampaignsPerMonth: 20,
    blurb: 'Multi-store teams, campaigns, and thank-you emails.',
    features: {
      campaigns: true,
      thankYouEmails: true,
      googleReviews: true,
      designLab: true,
      aiCampaignDraft: true,
      aiDisputeAssist: true,
      verifiedBuyerHmac: true,
      prioritySupport: false,
    },
    highlights: ['5 stores', '10 team seats', '20 campaigns / month', 'Thank-you emails', 'AI campaign draft + dispute assist'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 79,
    maxStores: -1,
    maxTeamSeats: -1,
    maxCampaignsPerMonth: -1,
    blurb: 'Unlimited workspaces for scaling brands.',
    features: {
      campaigns: true,
      thankYouEmails: true,
      googleReviews: true,
      designLab: true,
      aiCampaignDraft: true,
      aiDisputeAssist: true,
      verifiedBuyerHmac: true,
      prioritySupport: true,
    },
    highlights: ['Unlimited stores', 'Unlimited seats', 'Unlimited campaigns', 'Everything in Growth', 'Priority support path'],
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

export function computeTrialEndsAt(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + TRIAL_DAYS);
  return d;
}

/**
 * Effective entitlements — always match the user's billed plan (Free by default for new owners).
 */
export function getEffectivePlanId(userLike = {}) {
  const status = String(userLike.subscriptionStatus || '').toLowerCase();
  if (status === 'active' || status === 'past_due') {
    return resolvePlanId(userLike.plan);
  }
  return resolvePlanId(userLike.plan);
}

export function getEntitlements(userLike = {}) {
  const planId = getEffectivePlanId(userLike);
  const catalog = getPlanLimits(planId);

  return {
    planId,
    catalog,
    onTrial: false,
    trialEndsAt: null,
    subscriptionStatus: userLike.subscriptionStatus || 'none',
    currentPeriodEnd: userLike.currentPeriodEnd || null,
    cancelAtPeriodEnd: Boolean(userLike.cancelAtPeriodEnd),
    features: catalog.features,
  };
}

export function assertFeature(userLike, featureKey) {
  const ent = getEntitlements(userLike);
  return Boolean(ent.features?.[featureKey]);
}
