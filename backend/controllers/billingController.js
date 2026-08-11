import User from '../models/User.js';
import Store from '../models/Store.js';
import Campaign from '../models/Campaign.js';
import {
  PLAN_CATALOG,
  TRIAL_DAYS,
  computeTrialEndsAt,
  getEffectivePlanId,
  getEntitlements,
  getPlanLimits,
  isWithinLimit,
  resolvePlanId,
} from '../utils/plans.js';
import {
  cardFromPaymentMethod,
  frontendBase,
  getStripe,
  isStripeConfigured,
  planIdFromPriceId,
  publicPricing,
  stripePriceIdForPlan,
} from '../utils/stripeBilling.js';

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

async function ensureStripeCustomer(owner) {
  const stripe = getStripe();
  if (!stripe) throw Object.assign(new Error('Stripe is not configured'), { code: 'STRIPE_NOT_CONFIGURED' });
  if (owner.stripeCustomerId) return owner.stripeCustomerId;
  const customer = await stripe.customers.create({
    email: owner.email,
    name: owner.userName,
    metadata: { echoUserId: String(owner._id) },
  });
  owner.stripeCustomerId = customer.id;
  await owner.save();
  return customer.id;
}

async function syncCardFromSubscription(owner, subscription) {
  const stripe = getStripe();
  if (!stripe || !subscription) return;
  const pmId =
    typeof subscription.default_payment_method === 'string'
      ? subscription.default_payment_method
      : subscription.default_payment_method?.id;
  if (!pmId) return;
  try {
    const pm = await stripe.paymentMethods.retrieve(pmId);
    const card = cardFromPaymentMethod(pm);
    owner.paymentMethodBrand = card.brand;
    owner.paymentMethodLast4 = card.last4;
    owner.paymentMethodExpMonth = card.expMonth;
    owner.paymentMethodExpYear = card.expYear;
  } catch {
    /* ignore */
  }
}

export async function applyStripeSubscriptionToUser(owner, subscription) {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const planId = planIdFromPriceId(priceId) || resolvePlanId(owner.plan);
  owner.plan = planId === 'free' ? 'growth' : planId;
  owner.planUpdatedAt = new Date();
  owner.stripeSubscriptionId = subscription.id;
  owner.subscriptionStatus =
    subscription.status === 'trialing'
      ? 'trialing'
      : subscription.status === 'active'
        ? 'active'
        : subscription.status === 'past_due'
          ? 'past_due'
          : subscription.status === 'canceled'
            ? 'canceled'
            : 'unpaid';
  owner.cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
  if (subscription.trial_end) owner.trialEndsAt = new Date(subscription.trial_end * 1000);
  if (subscription.current_period_end) {
    owner.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  }
  await syncCardFromSubscription(owner, subscription);
  await owner.save();
}

/** Call after owner accounts are created (register verify / Google). */
export function stampOwnerTrialFields(userDoc) {
  if (!userDoc || userDoc.role !== 'owner') return userDoc;
  if (userDoc.trialEndsAt) return userDoc;
  userDoc.trialEndsAt = computeTrialEndsAt();
  userDoc.subscriptionStatus = 'trialing';
  userDoc.plan = 'free'; // billing plan; entitlements elevate to Growth during trial
  userDoc.planUpdatedAt = new Date();
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

    // Expire local trial if needed (no active Stripe sub)
    const now = new Date();
    if (
      owner.subscriptionStatus === 'trialing' &&
      owner.trialEndsAt &&
      new Date(owner.trialEndsAt) <= now &&
      !owner.stripeSubscriptionId
    ) {
      owner.subscriptionStatus = 'none';
      owner.plan = 'free';
      await owner.save();
    }

    const entitlements = getEntitlements(owner);
    const usage = await usageForOwner(owner._id);

    return res.status(200).json({
      data: {
        audience: 'merchant',
        stripeEnabled: isStripeConfigured(),
        trialDays: TRIAL_DAYS,
        entitlements,
        plan: entitlements.catalog,
        billedPlanId: resolvePlanId(owner.plan),
        subscription: {
          status: owner.subscriptionStatus || 'none',
          trialEndsAt: owner.trialEndsAt,
          currentPeriodEnd: owner.currentPeriodEnd,
          cancelAtPeriodEnd: Boolean(owner.cancelAtPeriodEnd),
          stripeSubscriptionId: owner.stripeSubscriptionId || null,
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
    if (!isStripeConfigured()) {
      return res.status(503).json({
        message: 'Stripe is not configured yet. Set STRIPE_SECRET_KEY and price IDs on the server.',
        code: 'STRIPE_NOT_CONFIGURED',
      });
    }

    const priceId = stripePriceIdForPlan(planId);
    if (!priceId) {
      return res.status(503).json({
        message: `Missing STRIPE_PRICE_${planId.toUpperCase()} env var.`,
        code: 'STRIPE_PRICE_MISSING',
      });
    }

    const stripe = getStripe();
    const customerId = await ensureStripeCustomer(owner);
    const trialStillActive =
      owner.subscriptionStatus === 'trialing' &&
      owner.trialEndsAt &&
      new Date(owner.trialEndsAt) > new Date();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: String(owner._id),
      success_url: `${frontendBase()}/hub/billing?checkout=success`,
      cancel_url: `${frontendBase()}/hub/billing?checkout=cancel`,
      allow_promotion_codes: true,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { echoUserId: String(owner._id), planId },
        ...(trialStillActive
          ? { trial_end: Math.floor(new Date(owner.trialEndsAt).getTime() / 1000) }
          : owner.stripeSubscriptionId
            ? {}
            : { trial_period_days: TRIAL_DAYS }),
      },
      metadata: { echoUserId: String(owner._id), planId },
    });

    return res.status(200).json({ data: { url: session.url, sessionId: session.id } });
  } catch (error) {
    console.error('createCheckoutSession', error);
    return res.status(500).json({ message: error.message || 'Could not start checkout.' });
  }
};

export const createBillingPortalSession = async (req, res) => {
  try {
    const owner = await loadOwner(req);
    if (!owner) return res.status(403).json({ message: 'Only account owners can manage billing.' });
    if (!isStripeConfigured()) {
      return res.status(503).json({ message: 'Stripe is not configured.', code: 'STRIPE_NOT_CONFIGURED' });
    }
    const stripe = getStripe();
    const customerId = await ensureStripeCustomer(owner);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${frontendBase()}/hub/billing`,
    });
    return res.status(200).json({ data: { url: session.url } });
  } catch (error) {
    console.error('createBillingPortalSession', error);
    return res.status(500).json({ message: 'Could not open billing portal.' });
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const owner = await loadOwner(req);
    if (!owner) return res.status(403).json({ message: 'Only account owners can cancel.' });
    if (!owner.stripeSubscriptionId || !isStripeConfigured()) {
      return res.status(400).json({ message: 'No active Stripe subscription to cancel.' });
    }
    const stripe = getStripe();
    const sub = await stripe.subscriptions.update(owner.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    await applyStripeSubscriptionToUser(owner, sub);
    return res.status(200).json({
      message: 'Auto-renew turned off. Access continues until the period ends.',
      data: { cancelAtPeriodEnd: true, currentPeriodEnd: owner.currentPeriodEnd },
    });
  } catch (error) {
    console.error('cancelSubscription', error);
    return res.status(500).json({ message: 'Could not cancel subscription.' });
  }
};

export const resumeSubscription = async (req, res) => {
  try {
    const owner = await loadOwner(req);
    if (!owner) return res.status(403).json({ message: 'Only account owners can resume billing.' });
    if (!owner.stripeSubscriptionId || !isStripeConfigured()) {
      return res.status(400).json({ message: 'No Stripe subscription to resume.' });
    }
    const stripe = getStripe();
    const sub = await stripe.subscriptions.update(owner.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
    await applyStripeSubscriptionToUser(owner, sub);
    return res.status(200).json({
      message: 'Auto-renew enabled.',
      data: { cancelAtPeriodEnd: false, currentPeriodEnd: owner.currentPeriodEnd },
    });
  } catch (error) {
    console.error('resumeSubscription', error);
    return res.status(500).json({ message: 'Could not resume subscription.' });
  }
};

/** Demo-only when Stripe is off — still owner-only. */
export const updateBillingPlanDemo = async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Only account owners can change plans.' });
    }
    if (isStripeConfigured()) {
      return res.status(400).json({
        message: 'Stripe is live — use Checkout or the billing portal instead of the demo switcher.',
      });
    }
    const next = resolvePlanId(req.body?.plan);
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.plan = next;
    user.planUpdatedAt = new Date();
    if (next === 'free') {
      user.subscriptionStatus = user.trialEndsAt && new Date(user.trialEndsAt) > new Date() ? 'trialing' : 'none';
    } else {
      user.subscriptionStatus = 'active';
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      user.currentPeriodEnd = end;
      user.cancelAtPeriodEnd = false;
    }
    await user.save();
    return res.status(200).json({
      message: `Demo plan set to ${PLAN_CATALOG[next].name}. Configure Stripe for real payments.`,
      data: { plan: PLAN_CATALOG[next] },
    });
  } catch (error) {
    console.error('updateBillingPlanDemo', error);
    return res.status(500).json({ message: 'Failed to update plan.' });
  }
};

export const handleStripeWebhook = async (req, res) => {
  const stripe = getStripe();
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  if (!stripe || !secret) {
    return res.status(503).send('Stripe webhook not configured');
  }

  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('stripe webhook signature', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription) {
          const owner =
            (session.client_reference_id && (await User.findById(session.client_reference_id))) ||
            (session.metadata?.echoUserId && (await User.findById(session.metadata.echoUserId))) ||
            (session.customer && (await User.findOne({ stripeCustomerId: session.customer })));
          if (owner) {
            const sub = await stripe.subscriptions.retrieve(session.subscription);
            owner.stripeCustomerId = session.customer || owner.stripeCustomerId;
            await applyStripeSubscriptionToUser(owner, sub);
          }
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const subscription = event.data.object;
        const owner =
          (await User.findOne({ stripeSubscriptionId: subscription.id })) ||
          (subscription.metadata?.echoUserId && (await User.findById(subscription.metadata.echoUserId))) ||
          (subscription.customer && (await User.findOne({ stripeCustomerId: subscription.customer })));
        if (owner) await applyStripeSubscriptionToUser(owner, subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const owner = await User.findOne({ stripeSubscriptionId: subscription.id });
        if (owner) {
          owner.subscriptionStatus = 'canceled';
          owner.plan = 'free';
          owner.cancelAtPeriodEnd = false;
          owner.stripeSubscriptionId = null;
          owner.planUpdatedAt = new Date();
          await owner.save();
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error('stripe webhook handler', error);
    return res.status(500).json({ message: 'Webhook handler failed' });
  }

  return res.json({ received: true });
};

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

export { getEffectivePlanId, getPlanLimits, isWithinLimit, getEntitlements };
