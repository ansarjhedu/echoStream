import ActivityLog from '../models/ActivityLog.js';
import { processDueCampaigns } from '../utils/campaignDelivery.js';

/** Staff-only activity feed (excludes owner / parent account). */
export const listStoreActivity = async (req, res) => {
  try {
    const rows = await ActivityLog.find({ store: req.store._id })
      .sort({ createdAt: -1 })
      .limit(80)
      .populate('actor', 'userName email role')
      .lean();

    const staffOnly = rows.filter((r) => r.actor && r.actor.role === 'staff');

    return res.status(200).json({
      data: staffOnly.slice(0, 50).map((r) => ({
        id: r._id,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        meta: r.meta,
        createdAt: r.createdAt,
        actor: {
          id: r.actor._id,
          userName: r.actor.userName,
          email: r.actor.email,
          role: r.actor.role,
        },
      })),
    });
  } catch (error) {
    console.error('listStoreActivity', error);
    return res.status(500).json({ message: 'Failed to load activity.' });
  }
};

export const runCampaignCron = async (req, res) => {
  try {
    const secret = (process.env.CRON_SECRET || '').trim();
    const header = String(req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    const querySecret = String(req.query?.secret || '');
    const isVercelCron = String(req.headers['x-vercel-cron'] || '') === '1';
    const authed =
      isVercelCron ||
      (secret && (header === secret || querySecret === secret)) ||
      (!secret && process.env.NODE_ENV !== 'production');
    if (!authed) {
      return res.status(401).json({ message: 'Unauthorized cron.' });
    }
    const results = await processDueCampaigns({ limit: 40 });
    return res.status(200).json({ ok: true, processed: results.length, results });
  } catch (error) {
    console.error('runCampaignCron', error);
    return res.status(500).json({ message: 'Cron failed.' });
  }
};
