import crypto from 'crypto';
import EmailSuppression from '../models/EmailSuppression.js';

function secret() {
  return (
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    'echo-stream-unsub-dev'
  );
}

export function makeUnsubscribeToken(email, storeId) {
  const payload = Buffer.from(
    JSON.stringify({
      e: String(email || '').trim().toLowerCase(),
      s: String(storeId || ''),
      t: Date.now(),
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyUnsubscribeToken(token) {
  const raw = String(token || '');
  const [payload, sig] = raw.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data?.e || !String(data.e).includes('@')) return null;
    return { email: String(data.e).toLowerCase(), storeId: data.s || null };
  } catch {
    return null;
  }
}

export function publicApiBaseUrl() {
  return (
    process.env.BACKEND_PUBLIC_URL ||
    process.env.API_PUBLIC_URL ||
    'https://echo-stream-pi.vercel.app'
  ).replace(/\/$/, '');
}

export function buildUnsubscribeUrl(email, storeId) {
  const token = makeUnsubscribeToken(email, storeId);
  return `${publicApiBaseUrl()}/api/public/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

export async function isEmailSuppressed(email, storeId) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return false;
  const hit = await EmailSuppression.findOne({
    email: normalized,
    $or: [{ store: storeId }, { store: null }],
  }).select('_id');
  return Boolean(hit);
}

export async function suppressEmail(email, storeId, reason = 'unsubscribe') {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized.includes('@')) return null;
  return EmailSuppression.findOneAndUpdate(
    { email: normalized, store: storeId || null },
    { $set: { reason } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function handlePublicUnsubscribe(req, res) {
  try {
    const parsed = verifyUnsubscribeToken(req.query.token);
    if (!parsed) {
      return res
        .status(400)
        .type('html')
        .send('<html><body style="font-family:system-ui;padding:2rem"><h1>Invalid link</h1><p>This unsubscribe link is invalid or expired.</p></body></html>');
    }
    await suppressEmail(parsed.email, parsed.storeId || null, 'unsubscribe');
    return res
      .status(200)
      .type('html')
      .send(
        `<html><body style="font-family:system-ui;padding:2rem;max-width:480px;margin:auto">
          <h1>You’re unsubscribed</h1>
          <p><strong>${parsed.email}</strong> will no longer receive EchoStream store campaigns for this workspace.</p>
          <p style="color:#64748b;font-size:14px">Thank-you receipts after a review you submit may still be sent once.</p>
        </body></html>`
      );
  } catch (error) {
    console.error('handlePublicUnsubscribe', error);
    return res.status(500).type('html').send('<html><body><h1>Something went wrong</h1></body></html>');
  }
}
