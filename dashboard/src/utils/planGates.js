/** Shared plan-limit handling — redirect to Billing instead of dead-end toasts. */

export const PLAN_ERROR_CODES = [
  'PLAN_STORE_LIMIT',
  'PLAN_SEAT_LIMIT',
  'PLAN_CAMPAIGN_LIMIT',
  'PLAN_FEATURE_CAMPAIGNS',
  'PLAN_FEATURE_AI_DRAFT',
  'PLAN_FEATURE_THANK_YOU',
];

export function isPlanError(err) {
  const code = err?.response?.data?.code;
  if (code && PLAN_ERROR_CODES.includes(code)) return true;
  const msg = String(err?.response?.data?.message || err?.response?.data || '');
  return /upgrade in billing|plan limit|not included in your plan/i.test(msg);
}

/**
 * Show a short message and send the user to Billing when a plan gate fires.
 * @returns {boolean} true if handled as a plan error
 */
export function redirectIfPlanError(err, navigate, toast) {
  if (!isPlanError(err)) return false;
  const msg =
    err?.response?.data?.message ||
    'This feature needs a plan upgrade. Opening Billing…';
  if (toast?.info) toast.info(msg);
  else if (toast?.error) toast.error(msg);
  if (navigate) navigate('/hub/billing');
  return true;
}

/** Build trust page URL for the environment the dashboard is currently on. */
export function buildTrustPageUrl(publicSlug) {
  if (!publicSlug) return null;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/trust/${encodeURIComponent(publicSlug)}`;
  }
  return null;
}
