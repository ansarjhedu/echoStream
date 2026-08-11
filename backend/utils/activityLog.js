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

export function frontendBaseUrl() {
  return (
    process.env.FRONTEND_URL ||
    process.env.FRONTEND_BASE_URL ||
    'http://localhost:5173'
  ).replace(/\/$/, '');
}
