import Store from '../models/Store.js';

/** In-memory throttle: one impression per store+IP per minute. */
const recent = new Map();

function clientKey(req, storeId) {
  const ip =
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    'unknown';
  return `${storeId}:${ip}`;
}

/**
 * Fire-and-forget widget impression for the store's published layout.
 */
export function recordWidgetImpression(req, store) {
  try {
    if (!store?._id) return;
    const layout = store.widgetConfig?.layout || 'glassmorphism';
    const key = clientKey(req, String(store._id));
    const now = Date.now();
    const last = recent.get(key) || 0;
    if (now - last < 60_000) return;
    recent.set(key, now);
    if (recent.size > 5000) {
      for (const [k, t] of recent) {
        if (now - t > 120_000) recent.delete(k);
      }
    }

    const layoutPath = `widgetStats.byLayout.${layout}`;
    Store.updateOne(
      { _id: store._id },
      {
        $inc: {
          'widgetStats.impressions': 1,
          [layoutPath]: 1,
        },
        $set: { 'widgetStats.lastImpressedAt': new Date() },
      }
    ).catch((err) => console.error('recordWidgetImpression', err?.message || err));
  } catch (err) {
    console.error('recordWidgetImpression', err?.message || err);
  }
}
