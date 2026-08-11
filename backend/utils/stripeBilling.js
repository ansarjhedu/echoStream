import Stripe from 'stripe';
import { PLAN_CATALOG, resolvePlanId } from './plans.js';

let stripeClient = null;

export function isStripeConfigured() {
  return Boolean((process.env.STRIPE_SECRET_KEY || '').trim());
}

export function getStripe() {
  const key = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) return null;
  if (!stripeClient) stripeClient = new Stripe(key);
  return stripeClient;
}

export function stripePriceIdForPlan(planId) {
  const id = resolvePlanId(planId);
  if (id === 'growth') return (process.env.STRIPE_PRICE_GROWTH || '').trim();
  if (id === 'pro') return (process.env.STRIPE_PRICE_PRO || '').trim();
  return '';
}

export function planIdFromPriceId(priceId) {
  const growth = (process.env.STRIPE_PRICE_GROWTH || '').trim();
  const pro = (process.env.STRIPE_PRICE_PRO || '').trim();
  if (priceId && priceId === growth) return 'growth';
  if (priceId && priceId === pro) return 'pro';
  return null;
}

export function frontendBase() {
  return (
    process.env.FRONTEND_URL ||
    process.env.FRONTEND_BASE_URL ||
    'http://localhost:5173'
  ).replace(/\/$/, '');
}

export function publicPricing() {
  return Object.values(PLAN_CATALOG).map((p) => ({
    id: p.id,
    name: p.name,
    priceMonthly: p.priceMonthly,
    blurb: p.blurb,
    highlights: p.highlights,
    features: p.features,
    maxStores: p.maxStores,
    maxTeamSeats: p.maxTeamSeats,
    maxCampaignsPerMonth: p.maxCampaignsPerMonth,
  }));
}

export function cardFromPaymentMethod(pm) {
  if (!pm?.card) return { brand: null, last4: null, expMonth: null, expYear: null };
  return {
    brand: pm.card.brand || null,
    last4: pm.card.last4 || null,
    expMonth: pm.card.exp_month || null,
    expYear: pm.card.exp_year || null,
  };
}
