import crypto from 'crypto';
import ActivityLog from '../models/ActivityLog.js';

export async function logActivity({
  storeId,
  actorId = null,
  action,
  targetType = null,
  targetId = null,
  meta = {},
}) {
  try {
    if (!storeId || !action) return null;
    return await ActivityLog.create({
      store: storeId,
      actor: actorId || undefined,
      action,
      targetType: targetType || undefined,
      targetId: targetId || undefined,
      meta: meta && typeof meta === 'object' ? meta : {},
    });
  } catch (err) {
    console.error('logActivity', action, err?.message || err);
    return null;
  }
}

export function slugifyStoreName(name) {
  const base = String(name || 'store')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || 'store';
}

export function makePublicSlug(storeName) {
  return `${slugifyStoreName(storeName)}-${crypto.randomBytes(3).toString('hex')}`;
}

/**
 * Dashboard / public-page origin for share links (trust page, review forms, billing redirects).
 * Prefer env. Never fall back to localhost when NODE_ENV=production.
 */
export function frontendBaseUrl() {
  const fromEnv = (process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === 'production') {
    return 'https://echostream-eight.vercel.app';
  }
  return 'http://localhost:5173';
}
