import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/** Extra fields that stay tucked away until the row needs them. */
export default function Fold({ title = 'More details', children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-white/10">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 py-2.5 text-xs font-semibold text-gray-400"
      >
        {title}
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? <div className="pb-1 space-y-2">{children}</div> : null}
    </div>
  );
}
