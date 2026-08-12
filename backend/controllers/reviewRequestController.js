import ReviewRequest from '../models/ReviewRequest.js';
import Review from '../models/Review.js';
import EmailSuppression from '../models/EmailSuppression.js';
import Store from '../models/Store.js';
import Product from '../models/Product.js';
import sendEmail, { isEmailTransportError } from '../utils/sendEmail.js';
import {
  buildUnsubscribeUrl,
  isEmailSuppressed,
} from '../utils/emailCompliance.js';
import { frontendBaseUrl, logActivity } from '../utils/activityLog.js';

function reviewCtaUrl(store, productHandle) {
  const handle = encodeURIComponent(productHandle || 'site');
  const hosted = `${frontendBaseUrl()}/review/${encodeURIComponent(store.apiKey)}/${handle}`;
  const site = (store.websiteUrl || '').trim();
  if (site) {
    try {
      const u = new URL(site.includes('://') ? site : `https://${site}`);
      // Prefer merchant product page when they have a site; still offer hosted form as fallback note in email
      return { primary: u.toString(), hosted };
    } catch {
      return { primary: hosted, hosted };
    }
  }
  return { primary: hosted, hosted };
}

function buildReviewRequestHtml({ storeName, customerName, productTitle, ctaUrl, unsubscribeUrl }) {
  const greeting = customerName ? `Hi ${customerName},` : 'Hi there,';
  const productBit = productTitle ? ` about <strong>${productTitle}</strong>` : '';
  return `
  <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">
    <p>${greeting}</p>
    <p>Thank you for shopping with <strong>${storeName}</strong>. We would love your honest feedback${productBit}.</p>
    <p style="margin:28px 0">
      <a href="${ctaUrl}" style="background:#06b6d4;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
        Leave a review
      </a>
    </p>
    <p style="color:#666;font-size:14px">It only takes a minute and helps other shoppers.</p>
    <p style="color:#999;font-size:12px;margin-top:32px">
      <a href="${unsubscribeUrl}" style="color:#999">Unsubscribe</a> from emails from ${storeName}.
    </p>
  </div>`;
}

async function sendReviewRequestEmail({ store, email, customerName, productHandle, productTitle, orderId, source, createdBy }) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized.includes('@')) {
    const err = new Error('A valid customer email is required.');
    err.status = 400;
    throw err;
  }

  const doc = await ReviewRequest.create({
    store: store._id,
    productHandle: String(productHandle || 'site').trim(),
    productTitle: productTitle || null,
    customerEmail: normalized,
    customerName: customerName || null,
    orderId: orderId || null,
    status: 'queued',
    source: source || 'api',
    createdBy: createdBy || null,
  });

  if (await isEmailSuppressed(normalized, store._id)) {
    doc.status = 'failed';
    doc.errorMessage = 'Email is on the suppression list.';
    await doc.save();
    const err = new Error('That email has unsubscribed and cannot be contacted.');
    err.status = 400;
    throw err;
  }

  const { primary, hosted } = reviewCtaUrl(store, doc.productHandle);
  const unsubUrl = buildUnsubscribeUrl(normalized, store._id);
  const html = buildReviewRequestHtml({
    storeName: store.storeName,
    customerName: customerName || '',
    productTitle: productTitle || doc.productHandle,
    ctaUrl: primary,
    unsubscribeUrl: unsubUrl,
  });

  try {
    await sendEmail({
      email: normalized,
      subject: `How was your experience with ${store.storeName}?`,
      html:
        html +
        (primary !== hosted
          ? `<p style="font-size:12px;color:#999">Or review here: <a href="${hosted}">${hosted}</a></p>`
          : ''),
      fromName: store.storeName,
      headers: {
        'List-Unsubscribe': `<${unsubUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
    doc.status = 'sent';
    await doc.save();
  } catch (err) {
    doc.status = 'failed';
    doc.errorMessage = err?.message || 'send_failed';
    await doc.save();
    if (isEmailTransportError(err)) {
      const e = new Error('Email service unavailable. Check SMTP settings.');
      e.status = 503;
      throw e;
    }
    throw err;
  }

  await logActivity({
    storeId: store._id,
    actorId: createdBy || null,
    action: 'review.request',
    targetType: 'review_request',
    targetId: String(doc._id),
    meta: { email: normalized, productHandle: doc.productHandle, source },
  });

  return doc;
}

function outcomeForRequest(request, suppressed, review) {
  if (suppressed) return 'unsubscribed';
  if (review && new Date(review.createdAt) >= new Date(request.createdAt)) return 'reviewed';
  if (request.status === 'failed') return 'failed';
  if (request.status === 'sent') return 'sent';
  return 'queued';
}

/** List review requests, suppressions, and conversion stats for a store */
export const listStoreReviewRequests = async (req, res) => {
  try {
    const storeId = req.store._id;
    const [requests, suppressions, reviews] = await Promise.all([
      ReviewRequest.find({ store: storeId }).sort({ createdAt: -1 }).limit(200).lean(),
      EmailSuppression.find({ store: storeId }).sort({ createdAt: -1 }).limit(500).lean(),
      Review.find({ store: storeId, customerEmail: { $exists: true, $nin: [null, ''] } })
        .select('customerEmail product productTitle rating createdAt')
        .populate('product', 'productHandle')
        .lean(),
    ]);

    const suppressedByEmail = new Map(
      suppressions.map((s) => [String(s.email).toLowerCase(), s])
    );

    const reviewByEmailHandle = new Map();
    for (const rev of reviews) {
      const email = String(rev.customerEmail || '').toLowerCase();
      const handle = rev.product?.productHandle || '';
      if (!email) continue;
      const key = `${email}|${handle}`;
      const existing = reviewByEmailHandle.get(key);
      if (!existing || new Date(rev.createdAt) > new Date(existing.createdAt)) {
        reviewByEmailHandle.set(key, rev);
      }
    }

    const items = requests.map((r) => {
      const email = String(r.customerEmail || '').toLowerCase();
      const suppressed = suppressedByEmail.get(email) || null;
      const review = reviewByEmailHandle.get(`${email}|${r.productHandle}`) || null;
      const outcome = outcomeForRequest(r, suppressed, review);
      return {
        ...r,
        outcome,
        suppressed: suppressed
          ? { reason: suppressed.reason, at: suppressed.createdAt }
          : null,
        review: review
          ? {
              rating: review.rating,
              productTitle: review.productTitle,
              createdAt: review.createdAt,
            }
          : null,
      };
    });

    const summary = {
      total: items.length,
      sent: items.filter((i) => i.status === 'sent').length,
      failed: items.filter((i) => i.status === 'failed').length,
      reviewed: items.filter((i) => i.outcome === 'reviewed').length,
      unsubscribed: suppressions.length,
      pending: items.filter((i) => i.outcome === 'sent').length,
    };

    return res.status(200).json({
      data: {
        requests: items,
        suppressions: suppressions.map((s) => ({
          email: s.email,
          reason: s.reason,
          createdAt: s.createdAt,
        })),
        summary,
      },
    });
  } catch (error) {
    console.error('listStoreReviewRequests', error);
    return res.status(500).json({ message: 'Failed to load review requests.' });
  }
};

/** Authenticated dashboard / staff */
export const createStoreReviewRequest = async (req, res) => {
  try {
    const store = await Store.findById(req.store._id);
    if (!store || store.isDeleted) {
      return res.status(404).json({ message: 'Store not found.' });
    }
    if (store.storeType !== 'ecommerce') {
      return res.status(400).json({ message: 'Review requests are for ecommerce stores.' });
    }

    const { customerEmail, customerName, productHandle, productTitle, orderId } = req.body || {};
    let title = productTitle;
    const handle = String(productHandle || '').trim();
    if (!handle) {
      return res.status(400).json({ message: 'productHandle is required.' });
    }
    if (!title) {
      const product = await Product.findOne({ store: store._id, productHandle: handle }).select('productTitle');
      title = product?.productTitle || handle;
    }

    const doc = await sendReviewRequestEmail({
      store,
      email: customerEmail,
      customerName,
      productHandle: handle,
      productTitle: title,
      orderId,
      source: 'dashboard',
      createdBy: req.user._id,
    });

    return res.status(200).json({
      message: 'Review request email sent.',
      data: doc,
    });
  } catch (error) {
    console.error('createStoreReviewRequest', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Failed to send review request.',
    });
  }
};

/** Public webhook — API key auth */
export const createPublicReviewRequest = async (req, res) => {
  try {
    const store = req.store;
    if (!store || store.isDeleted || store.status !== 'live') {
      return res.status(403).json({ message: 'Store unavailable.' });
    }
    if (store.storeType !== 'ecommerce') {
      return res.status(400).json({ message: 'Review requests are for ecommerce stores.' });
    }

    const { customerEmail, customerName, productHandle, productTitle, orderId } = req.body || {};
    const handle = String(productHandle || '').trim();
    if (!handle) {
      return res.status(400).json({ message: 'productHandle is required.' });
    }

    let title = productTitle;
    if (!title) {
      const product = await Product.findOne({ store: store._id, productHandle: handle }).select('productTitle');
      title = product?.productTitle || handle;
    }

    const doc = await sendReviewRequestEmail({
      store,
      email: customerEmail,
      customerName,
      productHandle: handle,
      productTitle: title,
      orderId,
      source: 'webhook',
      createdBy: null,
    });

    return res.status(200).json({
      message: 'Review request accepted.',
      data: { id: doc._id, status: doc.status },
    });
  } catch (error) {
    console.error('createPublicReviewRequest', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Failed to send review request.',
    });
  }
};
