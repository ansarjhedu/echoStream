import User from '../models/User.js';
import Store from '../models/Store.js';
import Campaign from '../models/Campaign.js';
import {
  PLAN_CATALOG,
  getEntitlements,
  getPlanLimits,
  isWithinLimit,
  resolvePlanId,
} from '../utils/plans.js';
import {
  cancelLemonSubscription,
  createLemonCheckout,
  extractPortalUrl,
  frontendBase,
  getLemonSubscription,
  isLemonConfigured,
  mapLemonStatus,
  planIdFromVariantId,
  publicPricing,
  resumeLemonSubscription,
  verifyLemonWebhookSignature,
} from '../utils/lemonSqueezyBilling.js';

async function loadOwner(req) {
  if (req.user.role !== 'owner') return null;
  return User.findById(req.user._id);
}

async function usageForOwner(ownerId) {
  const storesUsed = await Store.countDocuments({ owner: ownerId, isDeleted: { $ne: true } });
  const seatsUsed = await User.countDocuments({
    parentAccount: ownerId,
    role: 'staff',
    isDeleted: { $ne: true },
  });
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const storeIds = (await Store.find({ owner: ownerId, isDeleted: { $ne: true } }).select('_id')).map((s) => s._id);
  const campaignsUsed = await Campaign.countDocuments({
    store: { $in: storeIds },
    createdAt: { $gte: monthStart },
    status: { $in: ['sent', 'partial'] },
  });
  return { stores: storesUsed, teamSeats: seatsUsed, campaignsThisMonth: campaignsUsed };
}

function subscriptionIdOf(owner) {
  return owner.lemonSqueezySubscriptionId || owner.stripeSubscriptionId || null;
}

export async function applyLemonSubscriptionToUser(owner, subscriptionData, meta = {}) {
  const attrs = subscriptionData?.attributes || subscriptionData || {};
  const variantId =
    subscriptionData?.relationships?.variant?.data?.id ||
    attrs.variant_id ||
    meta.variant_id;
  const planFromVariant = planIdFromVariantId(variantId);
  const planFromCustom = resolvePlanId(meta?.custom_data?.plan_id || meta?.plan_id);
  const planId = planFromVariant || (planFromCustom !== 'free' ? planFromCustom : null) || resolvePlanId(owner.plan);

  owner.plan = planId === 'free' ? 'growth' : planId;
  owner.planUpdatedAt = new Date();
  owner.paymentProvider = 'lemonsqueezy';
  owner.lemonSqueezySubscriptionId = String(subscriptionData?.id || attrs.id || owner.lemonSqueezySubscriptionId || '');
  if (attrs.customer_id) owner.lemonSqueezyCustomerId = String(attrs.customer_id);
  // Keep legacy field populated for older UI reads
  owner.stripeSubscriptionId = owner.lemonSqueezySubscriptionId;

  owner.subscriptionStatus = mapLemonStatus(attrs.status);
  owner.cancelAtPeriodEnd = Boolean(attrs.cancelled);
  if (attrs.trial_ends_at) owner.trialEndsAt = new Date(attrs.trial_ends_at);
  if (attrs.renews_at) owner.currentPeriodEnd = new Date(attrs.renews_at);
  else if (attrs.ends_at) owner.currentPeriodEnd = new Date(attrs.ends_at);

  if (attrs.card_brand) owner.paymentMethodBrand = attrs.card_brand;
  if (attrs.card_last_four) owner.paymentMethodLast4 = String(attrs.card_last_four);
  if (attrs.card_expiration_month != null) {
    owner.paymentMethodExpMonth = Number(attrs.card_expiration_month) || null;
  }
  if (attrs.card_expiration_year != null) {
    owner.paymentMethodExpYear = Number(attrs.card_expiration_year) || null;
  }

  const portal = extractPortalUrl(attrs);
  if (portal) owner.billingPortalUrl = portal;

  await owner.save();
  return owner;
}

export function stampOwnerTrialFields(userDoc) {
  if (!userDoc || userDoc.role !== 'owner') return userDoc;
  if (!userDoc.plan) userDoc.plan = 'free';
  if (!userDoc.subscriptionStatus) userDoc.subscriptionStatus = 'none';
  userDoc.trialEndsAt = null;
  return userDoc;
}

export const getBillingSummary = async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({
        message: 'Billing is available to store owners only.',
        code: 'OWNER_ONLY_BILLING',
      });
    }

    const owner = await User.findById(req.user._id);
    if (!owner) return res.status(404).json({ message: 'User not found.' });

    const subId = subscriptionIdOf(owner);
    if (subId && isLemonConfigured()) {
      try {
        const json = await getLemonSubscription(subId);
        const attrs = json?.data?.attributes || {};
        if (attrs.card_brand) owner.paymentMethodBrand = attrs.card_brand;
        if (attrs.card_last_four) owner.paymentMethodLast4 = String(attrs.card_last_four);
        if (attrs.card_expiration_month != null) {
          owner.paymentMethodExpMonth = Number(attrs.card_expiration_month) || null;
        }
        if (attrs.card_expiration_year != null) {
          owner.paymentMethodExpYear = Number(attrs.card_expiration_year) || null;
        }
        if (attrs.card_brand || attrs.card_last_four) await owner.save();
      } catch (err) {
        console.error('refresh payment method', err.message);
      }
    }

    const entitlements = getEntitlements(owner);
    const usage = await usageForOwner(owner._id);

    return res.status(200).json({
      data: {
        audience: 'merchant',
        provider: 'lemonsqueezy',
        paymentsEnabled: isLemonConfigured(),
        paymentMethods: ['visa', 'mastercard', 'google_pay', 'apple_pay'],
        entitlements,
        plan: entitlements.catalog,
        billedPlanId: resolvePlanId(owner.plan),
        subscription: {
          status: owner.subscriptionStatus || 'none',
          trialEndsAt: owner.trialEndsAt,
          currentPeriodEnd: owner.currentPeriodEnd,
          cancelAtPeriodEnd: Boolean(owner.cancelAtPeriodEnd),
          subscriptionId: subscriptionIdOf(owner),
          portalUrl: owner.billingPortalUrl || null,
        },
        paymentMethod: {
          brand: owner.paymentMethodBrand,
          last4: owner.paymentMethodLast4,
          expMonth: owner.paymentMethodExpMonth,
          expYear: owner.paymentMethodExpYear,
        },
        usage,
        catalog: publicPricing(),
        limits: {
          stores: { used: usage.stores, max: entitlements.catalog.maxStores },
          teamSeats: { used: usage.teamSeats, max: entitlements.catalog.maxTeamSeats },
          campaignsThisMonth: {
            used: usage.campaignsThisMonth,
            max: entitlements.catalog.maxCampaignsPerMonth,
          },
        },
      },
    });
  } catch (error) {
    console.error('getBillingSummary', error);
    return res.status(500).json({ message: 'Failed to load billing.' });
  }
};

export const createCheckoutSession = async (req, res) => {
  try {
    const owner = await loadOwner(req);
    if (!owner) return res.status(403).json({ message: 'Only account owners can subscribe.' });

    const planId = resolvePlanId(req.body?.plan);
    if (planId === 'free') {
      return res.status(400).json({ message: 'Choose Growth or Pro to start a paid subscription.' });
    }
    if (!isLemonConfigured()) {
      return res.status(503).json({
        message:
          'Payments are not configured. Set LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, and variant IDs (Visa/Mastercard/Google Pay via Lemon Squeezy).',
        code: 'LEMON_NOT_CONFIGURED',
      });
    }

    const { url, checkoutId } = await createLemonCheckout({ owner, planId });
    return res.status(200).json({ data: { url, checkoutId, provider: 'lemonsqueezy' } });
  } catch (error) {
    console.error('createCheckoutSession', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Could not start checkout.',
      code: error.code,
    });
  }
};

export const createBillingPortalSession = async (req, res) => {
  try {
    const owner = await loadOwner(req);
    if (!owner) return res.status(403).json({ message: 'Only account owners can manage billing.' });

    let portal = owner.billingPortalUrl;
    const subId = subscriptionIdOf(owner);
    if (!portal && subId && isLemonConfigured()) {
      try {
        const json = await getLemonSubscription(subId);
        portal = extractPortalUrl(json?.data?.attributes);
        if (portal) {
          owner.billingPortalUrl = portal;
          await owner.save();
        }
      } catch (err) {
        console.error('refresh portal url', err.message);
      }
    }

    if (!portal) {
      return res.status(400).json({
        message:
          'No billing portal yet. Subscribe once, then use Update card — Lemon Squeezy hosts Visa/Mastercard/Google Pay updates.',
      });
    }
    return res.status(200).json({ data: { url: portal, provider: 'lemonsqueezy' } });
  } catch (error) {
    console.error('createBillingPortalSession', error);
    return res.status(500).json({ message: 'Could not open billing portal.' });
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const owner = await loadOwner(req);
    if (!owner) return res.status(403).json({ message: 'Only account owners can cancel.' });
    const subId = subscriptionIdOf(owner);
    if (!subId || !isLemonConfigured()) {
      return res.status(400).json({ message: 'No active subscription to cancel.' });
    }
    const json = await cancelLemonSubscription(subId);
    await applyLemonSubscriptionToUser(owner, json.data);
    return res.status(200).json({
      message: 'Auto-renew turned off. Access continues until the period ends.',
      data: { cancelAtPeriodEnd: true, currentPeriodEnd: owner.currentPeriodEnd },
    });
  } catch (error) {
    console.error('cancelSubscription', error);
    return res.status(500).json({ message: error.message || 'Could not cancel subscription.' });
  }
};

export const resumeSubscription = async (req, res) => {
  try {
    const owner = await loadOwner(req);
    if (!owner) return res.status(403).json({ message: 'Only account owners can resume billing.' });
    const subId = subscriptionIdOf(owner);
    if (!subId || !isLemonConfigured()) {
      return res.status(400).json({ message: 'No subscription to resume.' });
    }
    const json = await resumeLemonSubscription(subId);
    await applyLemonSubscriptionToUser(owner, json.data);
    return res.status(200).json({
      message: 'Auto-renew enabled.',
      data: { cancelAtPeriodEnd: false, currentPeriodEnd: owner.currentPeriodEnd },
    });
  } catch (error) {
    console.error('resumeSubscription', error);
    return res.status(500).json({ message: error.message || 'Could not resume subscription.' });
  }
};

export const updateBillingPlanDemo = async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Only account owners can change plans.' });
    }
    if (isLemonConfigured()) {
      return res.status(400).json({
        message: 'Lemon Squeezy is live — use Checkout or the billing portal instead of the demo switcher.',
      });
    }
    const next = resolvePlanId(req.body?.plan);
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.plan = next;
    user.planUpdatedAt = new Date();
    if (next === 'free') {
      user.subscriptionStatus = 'none';
      user.trialEndsAt = null;
    } else {
      user.subscriptionStatus = 'active';
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      user.currentPeriodEnd = end;
      user.cancelAtPeriodEnd = false;
    }
    await user.save();
    return res.status(200).json({
      message: `Demo plan set to ${PLAN_CATALOG[next].name}. Configure Lemon Squeezy for real Visa/Mastercard/Google Pay.`,
      data: { plan: PLAN_CATALOG[next] },
    });
  } catch (error) {
    console.error('updateBillingPlanDemo', error);
    return res.status(500).json({ message: 'Failed to update plan.' });
  }
};

export const handleBillingWebhook = async (req, res) => {
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
    const signature = req.headers['x-signature'];
    if (!verifyLemonWebhookSignature(raw, signature)) {
      return res.status(400).send('Invalid Lemon Squeezy signature');
    }

    const event = JSON.parse(raw.toString('utf8'));
    const eventName = event?.meta?.event_name || event?.event_name;
    const custom = event?.meta?.custom_data || {};
    const data = event?.data;

    if (!data) return res.json({ received: true });

    const findOwner = async () => {
      if (custom.echo_user_id) {
        const byCustom = await User.findById(custom.echo_user_id);
        if (byCustom) return byCustom;
      }
      const attrs = data.attributes || {};
      if (attrs.customer_id) {
        const byCustomer = await User.findOne({ lemonSqueezyCustomerId: String(attrs.customer_id) });
        if (byCustomer) return byCustomer;
      }
      if (data.id) {
        const bySub = await User.findOne({
          $or: [
            { lemonSqueezySubscriptionId: String(data.id) },
            { stripeSubscriptionId: String(data.id) },
          ],
        });
        if (bySub) return bySub;
      }
      if (attrs.user_email) {
        return User.findOne({ email: String(attrs.user_email).toLowerCase(), role: 'owner' });
      }
      return null;
    };

    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_resumed':
      case 'subscription_unpaused':
      case 'subscription_payment_success': {
        const owner = await findOwner();
        if (owner) await applyLemonSubscriptionToUser(owner, data, { custom_data: custom });
        break;
      }
      case 'subscription_cancelled':
      case 'subscription_expired': {
        const owner = await findOwner();
        if (owner) {
          await applyLemonSubscriptionToUser(owner, data, { custom_data: custom });
          if (eventName === 'subscription_expired') {
            owner.subscriptionStatus = 'canceled';
            owner.plan = 'free';
            owner.lemonSqueezySubscriptionId = null;
            owner.stripeSubscriptionId = null;
            owner.cancelAtPeriodEnd = false;
            await owner.save();
          }
        }
        break;
      }
      default:
        break;
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('handleBillingWebhook', error);
    return res.status(500).json({ message: 'Webhook handler failed' });
  }
};

/** @deprecated alias kept for older imports */
export const handleStripeWebhook = handleBillingWebhook;

export async function resolveOwnerEntitlements(reqUser) {
  const ownerId = reqUser.role === 'staff' ? reqUser.parentAccount : reqUser._id;
  if (!ownerId) return getEntitlements({ plan: 'free', subscriptionStatus: 'none' });
  if (reqUser.role === 'admin' || reqUser.staffScope === 'platform') {
    return getEntitlements({ plan: 'pro', subscriptionStatus: 'active' });
  }
  const owner = await User.findById(ownerId).select(
    'plan subscriptionStatus trialEndsAt currentPeriodEnd cancelAtPeriodEnd'
  );
  return getEntitlements(owner || { plan: 'free' });
}

export { getPlanLimits, isWithinLimit, getEntitlements };
