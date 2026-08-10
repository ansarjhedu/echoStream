import { GoogleGenAI } from '@google/genai';
import sendEmail from './sendEmail.js';

function getGeminiClientOrNull() {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  if (!apiKey) return null;
  try {
    return new GoogleGenAI({ apiKey, vertexai: false });
  } catch {
    return null;
  }
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fallbackCopy({ storeName, customerName, productTitle, rating }) {
  const first = (customerName || 'there').split(' ')[0];
  return {
    subject: `Thank you for reviewing ${productTitle} — ${storeName}`,
    bodyText:
      `Hi ${first},\n\n` +
      `Thank you for taking the time to leave a ${rating}-star review of ${productTitle}. ` +
      `We truly appreciate your feedback — it helps us improve and helps other shoppers decide with confidence.\n\n` +
      `With gratitude,\nThe ${storeName} team`,
  };
}

async function maybeAiCopy({ storeName, customerName, productTitle, rating, comment }) {
  try {
    const client = getGeminiClientOrNull();
    if (!client) return null;
    const prompt =
      `Write a short thank-you email from the store "${storeName}" to a customer who just reviewed a product.\n` +
      `Customer first name: ${(customerName || 'there').split(' ')[0]}\n` +
      `Product: ${productTitle}\nRating: ${rating}/5\n` +
      `Review excerpt: ${String(comment || '').slice(0, 240)}\n\n` +
      `Rules: warm and professional; speak as the store (not as EchoStream or a review platform); ` +
      `no links; under 120 words; return JSON only with keys subject and bodyText.`;

    const response = await client.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: prompt,
    });
    const raw = String(response?.text || '').trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.subject || !parsed.bodyText) return null;
    return {
      subject: String(parsed.subject).slice(0, 140),
      bodyText: String(parsed.bodyText).slice(0, 1200),
    };
  } catch {
    return null;
  }
}

function toHtml(storeName, bodyText) {
  const paragraphs = escapeHtml(bodyText)
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 12px;line-height:1.55;color:#1f2937;">${line}</p>`)
    .join('');
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;">
    <p style="margin:0 0 20px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">
      ${escapeHtml(storeName)}
    </p>
    ${paragraphs}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 12px;" />
    <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.4;">
      This message was sent on behalf of ${escapeHtml(storeName)} via EchoStream mail delivery.
    </p>
  </div>`;
}

/**
 * Fire-and-forget thank-you after an ecommerce review.
 * Delivery uses EchoStream SMTP; content is store-branded.
 */
export async function sendReviewThankYouEmail({ store, review }) {
  if (!store || store.storeType !== 'ecommerce') return { skipped: true, reason: 'not_ecommerce' };
  const email = String(review?.customerEmail || '').trim();
  if (!email || !email.includes('@')) return { skipped: true, reason: 'no_email' };

  const storeName = store.storeName || 'Our store';
  const base = fallbackCopy({
    storeName,
    customerName: review.customerName,
    productTitle: review.productTitle,
    rating: review.rating,
  });
  const ai = await maybeAiCopy({
    storeName,
    customerName: review.customerName,
    productTitle: review.productTitle,
    rating: review.rating,
    comment: review.comment,
  });
  const copy = ai || base;

  await sendEmail({
    email,
    subject: copy.subject,
    html: toHtml(storeName, copy.bodyText),
    fromName: storeName,
  });

  return { sent: true };
}

export function buildCampaignHtml({ storeName, bodyText, unsubscribeNote }) {
  const paragraphs = escapeHtml(bodyText)
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 12px;line-height:1.55;color:#1f2937;">${line}</p>`)
    .join('');
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;">
    <p style="margin:0 0 20px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">
      ${escapeHtml(storeName)}
    </p>
    ${paragraphs}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 12px;" />
    <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.4;">
      ${escapeHtml(unsubscribeNote || `You are receiving this because you left a review for ${storeName}.`)}
      Delivered via EchoStream on behalf of ${escapeHtml(storeName)}.
    </p>
  </div>`;
}
