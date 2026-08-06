import Store from '../models/Store.js';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import { recalculateProductStats } from '../services/reviewService.js';

function googleProductHandle(storeType) {
  const type = String(storeType || '').toLowerCase();
  if (type === 'ecommerce') return 'google-reviews';
  // Presence: handle matches store type so embed needs no edits (portfolio | blog)
  if (type === 'blog' || type === 'portfolio') return type;
  return 'portfolio';
}

async function ensureGoogleProduct(store) {
  const productHandle = googleProductHandle(store.storeType);
  const productTitle =
    store.storeType === 'ecommerce' ? 'Google Reviews' : 'site';

  return Product.findOneAndUpdate(
    { store: store._id, productHandle },
    {
      $setOnInsert: {
        store: store._id,
        productHandle,
        productTitle,
      },
    },
    { upsert: true, new: true }
  );
}

const connectGoogleReviews = async (req, res) => {
  try {
    const store = req.store;
    const { placeId, businessName, minRating } = req.body || {};

    if (!placeId || typeof placeId !== 'string' || !placeId.trim()) {
      return res.status(400).json({ message: 'A Google Place ID is required.' });
    }

    const min = Number(minRating);
    store.googleReviews = {
      ...(store.googleReviews?.toObject?.() || store.googleReviews || {}),
      placeId: placeId.trim(),
      businessName: (businessName || store.googleReviews?.businessName || '').trim() || null,
      minRating: Number.isFinite(min) ? Math.min(5, Math.max(1, min)) : (store.googleReviews?.minRating || 1),
      connected: true,
      lastSyncedAt: store.googleReviews?.lastSyncedAt || null,
      importedCount: store.googleReviews?.importedCount || 0,
    };

    await store.save();
    return res.status(200).json({
      data: store.googleReviews,
      message: 'Google Business Profile connected. Run Sync to import reviews.',
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const updateGoogleReviewFilters = async (req, res) => {
  try {
    const store = req.store;
    if (!store.googleReviews?.connected) {
      return res.status(400).json({ message: 'Connect a Place ID first.' });
    }
    const min = Number(req.body?.minRating);
    if (!Number.isFinite(min) || min < 1 || min > 5) {
      return res.status(400).json({ message: 'minRating must be between 1 and 5.' });
    }
    store.googleReviews.minRating = min;
    await store.save();
    return res.status(200).json({
      data: store.googleReviews,
      message: 'Rating filter updated. Re-sync to apply to new imports; live widget hides below-threshold Google reviews.',
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const disconnectGoogleReviews = async (req, res) => {
  try {
    const store = req.store;
    store.googleReviews = {
      placeId: null,
      businessName: null,
      minRating: 1,
      connected: false,
      lastSyncedAt: null,
      importedCount: store.googleReviews?.importedCount || 0,
    };
    await store.save();
    return res.status(200).json({ data: store.googleReviews, message: 'Google Reviews disconnected.' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

async function fetchGooglePlaceReviews(placeId) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    const err = new Error(
      'GOOGLE_PLACES_API_KEY is not configured on the server. Add it to enable live Google sync.'
    );
    err.status = 503;
    throw err;
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'name,rating,user_ratings_total,reviews');
  url.searchParams.set('key', apiKey);

  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== 'OK') {
    const err = new Error(json.error_message || `Google Places error: ${json.status}`);
    err.status = 502;
    throw err;
  }
  return json.result || {};
}

const syncGoogleReviews = async (req, res) => {
  try {
    const store = req.store;
    if (!store.googleReviews?.connected || !store.googleReviews?.placeId) {
      return res.status(400).json({ message: 'Connect a Google Place ID before syncing.' });
    }

    const place = await fetchGooglePlaceReviews(store.googleReviews.placeId);
    const product = await ensureGoogleProduct(store);
    const minRating = store.googleReviews.minRating || 1;
    const reviews = Array.isArray(place.reviews) ? place.reviews : [];

    let imported = 0;
    let skipped = 0;

    for (const gr of reviews) {
      const rating = Number(gr.rating) || 0;
      if (rating < minRating) {
        skipped += 1;
        continue;
      }
      const externalId =
        gr.time != null
          ? `google:${store.googleReviews.placeId}:${gr.time}:${gr.author_name || 'anon'}`
          : `google:${store.googleReviews.placeId}:${gr.author_name}:${gr.text?.slice(0, 24)}`;

      const existing = await Review.findOne({ store: store._id, source: 'google', externalId });
      if (existing) {
        skipped += 1;
        continue;
      }

      await Review.create({
        product: product._id,
        store: store._id,
        customerName: gr.author_name || 'Google reviewer',
        customerEmail: undefined,
        productTitle: product.productTitle,
        rating,
        comment: gr.text || '(No written review)',
        status: 'approved',
        isVerifiedBuyer: true,
        source: 'google',
        externalId,
        createdAt: gr.time ? new Date(gr.time * 1000) : undefined,
      });
      imported += 1;
    }

    await recalculateProductStats(product._id);

    store.googleReviews.businessName = place.name || store.googleReviews.businessName;
    store.googleReviews.lastSyncedAt = new Date();
    store.googleReviews.importedCount = (store.googleReviews.importedCount || 0) + imported;
    await store.save();

    return res.status(200).json({
      data: {
        googleReviews: store.googleReviews,
        productHandle: product.productHandle,
        imported,
        skipped,
        availableFromGoogle: reviews.length,
      },
      message:
        imported > 0
          ? `Imported ${imported} Google review(s).`
          : 'Sync complete — no new reviews matched your filters.',
    });
  } catch (error) {
    console.log(error);
    return res.status(error.status || 500).json({
      message: error.message || 'Failed to sync Google reviews',
    });
  }
};

const getGoogleReviewsStatus = async (req, res) => {
  try {
    const store = req.store;
    const productHandle = googleProductHandle(store.storeType);
    const googleCount = await Review.countDocuments({
      store: store._id,
      source: 'google',
    });
    return res.status(200).json({
      data: {
        googleReviews: store.googleReviews || {},
        productHandle,
        googleReviewCount: googleCount,
        placesApiConfigured: Boolean(process.env.GOOGLE_PLACES_API_KEY),
      },
      message: 'Google Reviews status',
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export {
  connectGoogleReviews,
  updateGoogleReviewFilters,
  disconnectGoogleReviews,
  syncGoogleReviews,
  getGoogleReviewsStatus,
};
