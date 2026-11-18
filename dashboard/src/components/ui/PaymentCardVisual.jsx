const BRAND_LABELS = {
  visa: 'VISA',
  mastercard: 'Mastercard',
  amex: 'AMEX',
  discover: 'Discover',
  google_pay: 'Google Pay',
  apple_pay: 'Apple Pay',
};

function brandLabel(brand) {
  if (!brand) return 'DEBIT';
  const key = String(brand).toLowerCase().replace(/\s+/g, '_');
  return BRAND_LABELS[key] || String(brand).replace(/_/g, ' ');
}

function maskName(name) {
  const parts = String(name || 'Cardholder').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'C••••••';
  return parts
    .slice(0, 2)
    .map((part) => `${part.charAt(0).toUpperCase()}${'•'.repeat(Math.max(4, Math.min(part.length, 8) - 1))}`)
    .join(' ');
}

function maskNumber(last4) {
  const tail = last4 ? String(last4).replace(/\D/g, '').slice(-4) : '••••';
  return `••••   ••••   ••••   ${tail || '••••'}`;
}

function maskExpiry(month, year) {
  if (!month || !year) return '••/••';
  const mm = String(month).padStart(2, '0').slice(-2);
  const yy = String(year).slice(-2);
  return `${mm}/${yy}`;
}

/**
 * Debit-card face. The holder name and number stay masked; last 4 digits show when a card is on file.
 */
export default function PaymentCardVisual({
  brand,
  last4,
  expMonth,
  expYear,
  holder,
  compact = false,
}) {
  const label = brandLabel(brand);
  const hasCard = Boolean(last4);

  if (compact) {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-gray-200">
        <span className="tracking-[0.14em] font-mono">{maskNumber(last4)}</span>
        <span className="text-[10px] uppercase text-cyan-300/80">{label}</span>
      </span>
    );
  }

  return (
    <div className="relative w-full max-w-md aspect-[1.586/1] rounded-[1.35rem] overflow-hidden border border-white/15 shadow-[0_18px_50px_rgba(0,0,0,0.45)] bg-gradient-to-br from-[#12324a] via-[#0b1c33] to-[#061018] text-white">
      <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-8 w-48 h-48 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_42%)]" />

      <div className="relative h-full p-5 sm:p-6 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="relative w-11 h-8 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-inner overflow-hidden">
              <span className="absolute inset-x-0 top-1/2 h-px bg-amber-900/40" />
              <span className="absolute inset-y-0 left-1/2 w-px bg-amber-900/40" />
              <span className="absolute left-1 right-1 top-1 bottom-1 rounded-sm border border-amber-900/25" />
            </span>
            <span className="flex flex-col gap-0.5 text-cyan-200/80" aria-hidden>
              <span className="block w-4 h-3 border-t-2 border-r-2 border-current rounded-tr-full" />
              <span className="block w-3 h-2.5 border-t-2 border-r-2 border-current rounded-tr-full ml-1" />
            </span>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/50">EchoStream</p>
            <p className="text-sm font-black tracking-widest mt-0.5">{label}</p>
          </div>
        </div>

        <p className="font-mono text-[1.15rem] sm:text-2xl tracking-[0.18em] text-white/95">
          {maskNumber(hasCard ? last4 : '')}
        </p>

        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/45">Card holder</p>
            <p className="text-sm font-semibold tracking-wide truncate">{maskName(holder)}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/45">Valid thru</p>
            <p className="text-sm font-semibold tracking-widest">{maskExpiry(expMonth, expYear)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
