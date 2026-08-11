import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Store from '../models/Store.js';
import Campaign from '../models/Campaign.js';
import User from '../models/User.js';
import sendEmail, { isEmailTransportError } from '../utils/sendEmail.js';
import { buildCampaignHtml } from '../services/reviewMailService.js';
import { GoogleGenAI } from '@google/genai';
import { getPlanLimits, isWithinLimit } from '../utils/plans.js';
import {
  buildUnsubscribeUrl,
  isEmailSuppressed,
} from '../utils/emailCompliance.js';

function assertCampaignAccess(req, res) {
  const role = req.user?.role;
  if (role === 'owner' || role === 'admin') return true;
  const perms = req.user?.permissions || [];
  if (role === 'staff' && perms.includes('campaigns')) return true;
  res.status(403).json({ message: 'You need the campaigns permission to manage email campaigns.' });
  return false;
}

function assertCommerce(store, res) {
  if (store?.storeType !== 'ecommerce') {
    res.status(400).json({ message: 'Email campaigns are available for ecommerce stores only.' });
    return false;
  }
  return true;
}

function buildAudienceMatch(storeId, { productId, emailSearch, minRating } = {}) {
  const match = {
    store: new mongoose.Types.ObjectId(String(storeId)),
    isDeleted: { $ne: true },
    customerEmail: { $exists: true, $nin: [null, ''] },
  };
  if (productId && mongoose.Types.ObjectId.isValid(productId)) {
    match.product = new mongoose.Types.ObjectId(String(productId));
  }
  if (emailSearch && String(emailSearch).trim()) {
    match.customerEmail = {
      $regex: String(emailSearch).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      $options: 'i',
    };
  }
  if (minRating != null && minRating !== '' && !Number.isNaN(Number(minRating))) {
    match.rating = { $gte: Number(minRating) };
  }
  return match;
}

/**
 * Unique reviewer contacts for campaigns (email-keyed).
 */
const getCampaignAudience = async (req, res) => {
  try {
    if (!assertCampaignAccess(req, res)) return;
    const store = await Store.findById(req.store._id).select('storeType storeName');
    if (!assertCommerce(store, res)) return;

    const { productId, emailSearch, minRating } = req.query || {};
    const match = buildAudienceMatch(req.store._id, { productId, emailSearch, minRating });

    const audience = await Review.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $toLower: '$customerEmail' },
          email: { $first: '$customerEmail' },
          customerName: { $first: '$customerName' },
          products: { $addToSet: '$productTitle' },
          productIds: { $addToSet: '$product' },
          reviewCount: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          lastReviewAt: { $max: '$createdAt' },
        },
      },
      { $sort: { lastReviewAt: -1 } },
      { $limit: 500 },
    ]);

    const products = await Product.find({ store: req.store._id, isDeleted: { $ne: true } })
      .select('productTitle productHandle')
      .sort({ productTitle: 1 })
      .lean();

    return res.status(200).json({
      data: {
        audience: audience.map((row) => ({
          email: row.email,
          customerName: row.customerName,
          products: row.products || [],
          reviewCount: row.reviewCount,
          avgRating: Math.round((row.avgRating || 0) * 10) / 10,
          lastReviewAt: row.lastReviewAt,
        })),
        products,
        storeName: store.storeName,
      },
    });
  } catch (error) {
    console.error('getCampaignAudience', error);
    return res.status(500).json({ message: 'Failed to load campaign audience.' });
  }
};

const draftCampaignCopy = async (req, res) => {
  try {
    if (!assertCampaignAccess(req, res)) return;
    const store = await Store.findById(req.store._id).select('storeType storeName');
    if (!assertCommerce(store, res)) return;

    const { goal, productTitle } = req.body || {};
    const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(200).json({
        data: {
          subject: `A note from ${store.storeName}`,
          bodyText:
            `Hello,\n\nThank you again for supporting ${store.storeName}` +
            (productTitle ? ` and for reviewing ${productTitle}` : '') +
            `. We wanted to share a short update with customers who took the time to leave feedback.\n\nWith appreciation,\nThe ${store.storeName} team`,
          source: 'template',
        },
      });
    }

    const client = new GoogleGenAI({ apiKey, vertexai: false });
    const prompt =
      `Draft a short email campaign for store "${store.storeName}" sent to past product reviewers.\n` +
      `Goal: ${goal || 'thank reviewers and gently encourage a return visit'}\n` +
      `Product focus (optional): ${productTitle || 'general'}\n` +
      `Speak as the store, not as EchoStream. No fake discount codes. Under 140 words.\n` +
      `Return JSON only: { "subject": "...", "bodyText": "..." }`;

    const response = await client.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: prompt,
    });
    const raw = String(response?.text || '').trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    if (!parsed?.subject || !parsed?.bodyText) {
      return res.status(500).json({ message: 'Could not draft campaign copy.' });
    }
    return res.status(200).json({
      data: {
        subject: String(parsed.subject).slice(0, 140),
        bodyText: String(parsed.bodyText).slice(0, 2000),
        source: 'ai',
      },
    });
  } catch (error) {
    console.error('draftCampaignCopy', error);
    return res.status(500).json({ message: 'Failed to draft campaign copy.' });
  }
};

const sendCampaign = async (req, res) => {
  try {
    if (!assertCampaignAccess(req, res)) return;
    const store = await Store.findById(req.store._id).select('storeType storeName');
    if (!assertCommerce(store, res)) return;

    const {
      subject,
      bodyText,
      emails,
      productId,
      emailSearch,
      minRating,
      selectAllFiltered,
    } = req.body || {};

    if (!subject || !String(subject).trim() || !bodyText || !String(bodyText).trim()) {
      return res.status(400).json({ message: 'Subject and message body are required.' });
    }

    let recipients = [];
    if (selectAllFiltered) {
      const match = buildAudienceMatch(req.store._id, { productId, emailSearch, minRating });
      const rows = await Review.aggregate([
        { $match: match },
        { $group: { _id: { $toLower: '$customerEmail' }, email: { $first: '$customerEmail' } } },
        { $limit: 100 },
      ]);
      recipients = rows.map((r) => r.email).filter(Boolean);
    } else if (Array.isArray(emails)) {
      recipients = [...new Set(emails.map((e) => String(e || '').trim().toLowerCase()).filter((e) => e.includes('@')))].slice(0, 100);
    }

    if (!recipients.length) {
      return res.status(400).json({ message: 'Select at least one recipient with a valid email.' });
    }

    const ownerId = req.user.role === 'staff' ? req.user.parentAccount : req.user._id;
    const owner = await User.findById(ownerId).select('plan');
    const limits = getPlanLimits(owner?.plan);
    if (limits.maxCampaignsPerMonth >= 0) {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const stores = await Store.find({ owner: ownerId, isDeleted: { $ne: true } }).select('_id');
      const storeIds = stores.map((s) => s._id);
      const used = await Campaign.countDocuments({
        store: { $in: storeIds },
        createdAt: { $gte: start },
        status: { $in: ['sent', 'partial'] },
      });
      if (!isWithinLimit(used, limits.maxCampaignsPerMonth)) {
        return res.status(403).json({
          message: `Campaign limit reached for the ${limits.name} plan (${limits.maxCampaignsPerMonth}/month). Upgrade in Billing.`,
          code: 'PLAN_CAMPAIGN_LIMIT',
        });
      }
    }

    let sentCount = 0;
    let failedCount = 0;
    let suppressedCount = 0;
    for (const email of recipients) {
      try {
        if (await isEmailSuppressed(email, req.store._id)) {
          suppressedCount += 1;
          continue;
        }
        const unsubUrl = buildUnsubscribeUrl(email, req.store._id);
        const html = buildCampaignHtml({
          storeName: store.storeName,
          bodyText: String(bodyText),
          unsubscribeUrl: unsubUrl,
        });
        await sendEmail({
          email,
          subject: String(subject).slice(0, 140),
          html,
          fromName: store.storeName,
          headers: {
            'List-Unsubscribe': `<${unsubUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        });
        sentCount += 1;
      } catch (err) {
        failedCount += 1;
        console.error('campaign send failed', email, err?.message || err);
        if (isEmailTransportError(err) && sentCount === 0) {
          return res.status(503).json({
            message: 'Email service unavailable. Check SMTP settings on the server.',
          });
        }
      }
    }

    const doc = await Campaign.create({
      store: req.store._id,
      createdBy: req.user._id,
      subject: String(subject).slice(0, 140),
      bodyText: String(bodyText).slice(0, 5000),
      filters: {
        productId: productId || null,
        emailSearch: emailSearch || null,
        minRating: minRating != null && minRating !== '' ? Number(minRating) : null,
      },
      recipientCount: recipients.length,
      sentCount,
      failedCount,
      suppressedCount,
      status: failedCount === 0 && sentCount > 0 ? 'sent' : sentCount === 0 ? 'draft' : 'partial',
    });

    return res.status(200).json({
      message: `Campaign finished: ${sentCount} sent, ${failedCount} failed, ${suppressedCount} suppressed.`,
      data: doc,
    });
  } catch (error) {
    console.error('sendCampaign', error);
    return res.status(500).json({ message: 'Failed to send campaign.' });
  }
};

const listCampaigns = async (req, res) => {
  try {
    if (!assertCampaignAccess(req, res)) return;
    const rows = await Campaign.find({ store: req.store._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const agg = await Campaign.aggregate([
      { $match: { store: req.store._id } },
      {
        $group: {
          _id: null,
          campaigns: { $sum: 1 },
          totalSent: { $sum: '$sentCount' },
          totalFailed: { $sum: '$failedCount' },
          totalSuppressed: { $sum: { $ifNull: ['$suppressedCount', 0] } },
          totalRecipients: { $sum: '$recipientCount' },
        },
      },
    ]);
    const summary = agg[0]
      ? {
          campaigns: agg[0].campaigns,
          totalSent: agg[0].totalSent,
          totalFailed: agg[0].totalFailed,
          totalSuppressed: agg[0].totalSuppressed,
          totalRecipients: agg[0].totalRecipients,
          deliveryRate:
            agg[0].totalRecipients > 0
              ? Math.round((agg[0].totalSent / agg[0].totalRecipients) * 100)
              : 0,
          lastCampaign: rows[0] || null,
        }
      : {
          campaigns: 0,
          totalSent: 0,
          totalFailed: 0,
          totalSuppressed: 0,
          totalRecipients: 0,
          deliveryRate: 0,
          lastCampaign: null,
        };

    return res.status(200).json({ data: rows, summary });
  } catch (error) {
    console.error('listCampaigns', error);
    return res.status(500).json({ message: 'Failed to list campaigns.' });
  }
};

export { getCampaignAudience, draftCampaignCopy, sendCampaign, listCampaigns };
