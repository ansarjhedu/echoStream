import Store from '../models/Store.js';
import Review from '../models/Review.js';
import { makePublicSlug, frontendBaseUrl } from '../utils/activityLog.js';

export const getPublicTrustPage = async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!slug) return res.status(400).json({ message: 'Slug required.' });

    const store = await Store.findOne({
      publicSlug: slug,
      isDeleted: { $ne: true },
      status: 'live',
    }).select('storeName storeType websiteUrl widgetConfig publicSlug siteMeta');

    if (!store) {
      return res.status(404).json({ message: 'Trust page not found.' });
    }

    const reviews = await Review.find({
      store: store._id,
      status: 'approved',
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(24)
      .select('customerName rating comment createdAt productTitle isVerifiedBuyer source')
      .lean();

    const agg = await Review.aggregate([
      {
        $match: {
          store: store._id,
          status: 'approved',
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const stats = agg[0]
      ? {
          avgRating: Math.round((agg[0].avgRating || 0) * 10) / 10,
          totalReviews: agg[0].totalReviews,
        }
      : { avgRating: 0, totalReviews: 0 };

    return res.status(200).json({
      data: {
        storeName: store.storeName,
        storeType: store.storeType,
        websiteUrl: store.websiteUrl,
        publicSlug: store.publicSlug,
        siteMeta: store.siteMeta,
        widgetConfig: store.widgetConfig,
        stats,
        reviews,
        shareUrl: `${frontendBaseUrl()}/trust/${store.publicSlug}`,
      },
    });
  } catch (error) {
    console.error('getPublicTrustPage', error);
    return res.status(500).json({ message: 'Failed to load trust page.' });
  }
};

export const ensureStorePublicSlug = async (store) => {
  if (store.publicSlug) return store.publicSlug;
  store.publicSlug = makePublicSlug(store.storeName);
  await store.save();
  return store.publicSlug;
};
