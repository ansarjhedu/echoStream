import crypto from 'crypto';
import { PLAN_CATALOG, resolvePlanId } from './plans.js';

const LS_API = 'https://api.lemonsqueezy.com/v1';

export function isLemonConfigured() {
  return Boolean(
    (process.env.LEMONSQUEEZY_API_KEY || '').trim() &&
      (process.env.LEMONSQUEEZY_STORE_ID || '').trim()
  );
}

export function frontendBase() {
  const fromEnv = (process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    return 'https://echostream-eight.vercel.app';
  }
  return 'http://localhost:5173';
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

export function variantIdForPlan(planId) {
  const id = resolvePlanId(planId);
  if (id === 'growth') return String(process.env.LEMONSQUEEZY_VARIANT_GROWTH || '').trim();
  if (id === 'pro') return String(process.env.LEMONSQUEEZY_VARIANT_PRO || '').trim();
  return '';
}

export function planIdFromVariantId(variantId) {
  const v = String(variantId || '');
  const growth = String(process.env.LEMONSQUEEZY_VARIANT_GROWTH || '').trim();
  const pro = String(process.env.LEMONSQUEEZY_VARIANT_PRO || '').trim();
  if (v && v === growth) return 'growth';
  if (v && v === pro) return 'pro';
  return null;
}

async function lsFetch(path, { method = 'GET', body } = {}) {
  const key = (process.env.LEMONSQUEEZY_API_KEY || '').trim();
  if (!key) {
    const err = new Error('Lemon Squeezy is not configured');
    err.code = 'LEMON_NOT_CONFIGURED';
    throw err;
  }
  const res = await fetch(`${LS_API}${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${key}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      json?.errors?.[0]?.detail ||
      json?.error ||
      `Lemon Squeezy API error (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json;
}

export async function createLemonCheckout({ owner, planId }) {
  const storeId = String(process.env.LEMONSQUEEZY_STORE_ID || '').trim();
  const variantId = variantIdForPlan(planId);
  if (!storeId || !variantId) {
    const err = new Error(
      `Missing Lemon Squeezy store/variant for plan ${planId}. Set LEMONSQUEEZY_STORE_ID and LEMONSQUEEZY_VARIANT_${planId.toUpperCase()}.`
    );
    err.code = 'LEMON_VARIANT_MISSING';
    throw err;
  }

  const payload = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email: owner.email,
          name: owner.userName || undefined,
          custom: {
            echo_user_id: String(owner._id),
            plan_id: planId,
          },
        },
        product_options: {
          redirect_url: `${frontendBase()}/hub/billing?checkout=success`,
        },
        checkout_options: {
          embed: false,
          media: true,
          logo: true,
          desc: true,
          discount: true,
          dark: true,
          subscription_preview: true,
        },
      },
      relationships: {
        store: { data: { type: 'stores', id: storeId } },
        variant: { data: { type: 'variants', id: variantId } },
      },
    },
  };

  const json = await lsFetch('/checkouts', { method: 'POST', body: payload });
  const url = json?.data?.attributes?.url;
  if (!url) throw new Error('Lemon Squeezy did not return a checkout URL.');
  return { url, checkoutId: json?.data?.id };
}

export async function cancelLemonSubscription(subscriptionId) {
  // Cancel at period end
  return lsFetch(`/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    body: {
      data: {
        type: 'subscriptions',
        id: String(subscriptionId),
        attributes: { cancelled: true },
      },
    },
  });
}

export async function resumeLemonSubscription(subscriptionId) {
  return lsFetch(`/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    body: {
      data: {
        type: 'subscriptions',
        id: String(subscriptionId),
        attributes: { cancelled: false },
      },
    },
  });
}

export async function getLemonSubscription(subscriptionId) {
  return lsFetch(`/subscriptions/${subscriptionId}`);
}

/** Verify X-Signature (HMAC-SHA256 hex of raw body with webhook secret). */
export function verifyLemonWebhookSignature(rawBody, signatureHeader) {
  const secret = (process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '').trim();
  if (!secret || !signatureHeader) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    const a = Buffer.from(digest);
    const b = Buffer.from(String(signatureHeader));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function mapLemonStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'on_trial') return 'trialing';
  if (s === 'active') return 'active';
  if (s === 'past_due') return 'past_due';
  if (s === 'unpaid') return 'unpaid';
  if (s === 'cancelled' || s === 'expired') return 'canceled';
  if (s === 'paused') return 'canceled';
  return 'none';
}

export function extractPortalUrl(subscriptionAttrs = {}) {
  return (
    subscriptionAttrs?.urls?.customer_portal ||
    subscriptionAttrs?.urls?.update_payment_method ||
    null
  );
}
