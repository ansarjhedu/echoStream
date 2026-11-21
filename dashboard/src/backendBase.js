/**
 * Development always calls /api on this Vite server. Vite forwards that to the
 * local API, so the login cookie stays on localhost.
 * Production calls /api on the site domain. A localhost value is never used there.
 */
export function resolveBackendBase() {
  const fromEnv = String(import.meta.env.VITE_BACKEND_URL || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\/$/, '');
  const pointsAtLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(fromEnv);
  if (import.meta.env.DEV) return '/api';
  if (fromEnv && !pointsAtLocal) return fromEnv;
  return '/api';
}
