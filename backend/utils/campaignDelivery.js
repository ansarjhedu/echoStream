import Campaign from '../models/Campaign.js';
import Store from '../models/Store.js';
import sendEmail, { isEmailTransportError } from './sendEmail.js';
import { buildCampaignHtml } from '../services/reviewMailService.js';
import {
  buildUnsubscribeUrl,
  isEmailSuppressed,
} from './emailCompliance.js';
import { logActivity } from './activityLog.js';

/**
 * Send emails for one scheduled (or ready) campaign document.
 * Mutates and saves the campaign.
 */
export async function deliverCampaign(campaign, store) {
  const recipients = Array.isArray(campaign.recipientEmails)
    ? campaign.recipientEmails
    : [];
  let sentCount = 0;
  let failedCount = 0;
  let suppressedCount = 0;

  for (const email of recipients) {
    try {
      if (await isEmailSuppressed(email, campaign.store)) {
        suppressedCount += 1;
        continue;
      }
      const unsubUrl = buildUnsubscribeUrl(email, campaign.store);
      const html = buildCampaignHtml({
        storeName: store.storeName,
        bodyText: String(campaign.bodyText),
        unsubscribeUrl: unsubUrl,
      });
      await sendEmail({
        email,
        subject: String(campaign.subject).slice(0, 140),
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
      console.error('deliverCampaign failed', email, err?.message || err);
      if (isEmailTransportError(err) && sentCount === 0) {
        throw err;
      }
    }
  }

  campaign.sentCount = sentCount;
  campaign.failedCount = failedCount;
  campaign.suppressedCount = suppressedCount;
  campaign.status =
    failedCount === 0 && sentCount > 0 ? 'sent' : sentCount === 0 ? 'draft' : 'partial';
  await campaign.save();
  return campaign;
}

/** Process due scheduled campaigns (cron + opportunistic poll). */
export async function processDueCampaigns({ limit = 20 } = {}) {
  const now = new Date();
  const due = await Campaign.find({
    status: 'scheduled',
    scheduledAt: { $lte: now },
  })
    .sort({ scheduledAt: 1 })
    .limit(limit);

  const results = [];
  for (const campaign of due) {
    try {
      const store = await Store.findById(campaign.store).select('storeName storeType');
      if (!store) {
        campaign.status = 'draft';
        await campaign.save();
        results.push({ id: campaign._id, ok: false, reason: 'store_missing' });
        continue;
      }
      await deliverCampaign(campaign, store);
      await logActivity({
        storeId: campaign.store,
        actorId: campaign.createdBy,
        action: 'campaign.send',
        targetType: 'campaign',
        targetId: String(campaign._id),
        meta: { scheduled: true, sentCount: campaign.sentCount },
      });
      results.push({ id: campaign._id, ok: true, status: campaign.status });
    } catch (err) {
      console.error('processDueCampaigns', campaign._id, err?.message || err);
      results.push({ id: campaign._id, ok: false, reason: err?.message || 'send_failed' });
    }
  }
  return results;
}
