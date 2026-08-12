import { CreditCard } from 'lucide-react';

const BRAND_LABELS = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  google_pay: 'Google Pay',
  apple_pay: 'Apple Pay',
};

function brandLabel(brand) {
  if (!brand) return 'Card';
  const key = String(brand).toLowerCase().replace(/\s+/g, '_');
  return BRAND_LABELS[key] || String(brand).replace(/_/g, ' ');
}

/**
 * Visual card chip for Billing / Profile — shows brand, last4, expiry when on file.
 */
export default function PaymentCardVisual({ brand, last4, expMonth, expYear, compact = false }) {
  const hasCard = Boolean(last4);
  const label = brandLabel(brand);

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border border-white/10 bg-white/[0.04] text-gray-200">
        <CreditCard size={14} className="text-cyan-400 shrink-0" />
        {hasCard ? (
          <span>
            {label} ···· {last4}
            {expMonth && expYear ? ` · ${expMonth}/${String(expYear).slice(-2)}` : ''}
          </span>
        ) : (
          <span className="text-gray-500">No card on file</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${
        hasCard ? 'border-cyan-500/30 bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#0c4a6e]/40' : 'border-white/10 bg-[#0A0F1A]'
      } p-5 min-h-[140px] flex flex-col justify-between`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Active payment card</p>
          <p className="text-lg font-bold text-white mt-1">{hasCard ? label : 'No card linked yet'}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
          <CreditCard size={20} className="text-cyan-300" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-mono tracking-[0.25em] text-white/90 mt-4">
          {hasCard ? `···· ···· ···· ${last4}` : '···· ···· ···· ····'}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {hasCard && expMonth && expYear
            ? `Expires ${expMonth}/${expYear}`
            : hasCard
              ? 'Expiry shown in billing portal'
              : 'Subscribe or open billing portal to add a card'}
        </p>
      </div>
      {hasCard ? (
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 blur-3xl rounded-full pointer-events-none" />
      ) : null}
    </div>
  );
}
