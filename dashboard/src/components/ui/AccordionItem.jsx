import { ChevronDown } from 'lucide-react';

/**
 * Collapsible row — preview in header, full content when expanded.
 * Matches hub surfaces: rounded-2xl, border-white/10, cyan unread accent.
 */
export default function AccordionItem({
  open,
  onToggle,
  unread = false,
  header,
  preview,
  children,
  className = '',
}) {
  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-colors backdrop-blur-xl ${
        unread ? 'border-cyan-500/25 bg-cyan-500/[0.06]' : 'border-white/10 bg-white/[0.02]'
      } ${className}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full text-left px-4 py-3 md:px-5 md:py-4 flex items-center gap-3 hover:bg-white/[0.03] transition-colors min-h-[56px]"
      >
        <div className="min-w-0 flex-1">{header}</div>
        {preview && !open ? (
          <p className="hidden md:block text-xs text-gray-500 truncate max-w-[38%] shrink-0">{preview}</p>
        ) : null}
        <ChevronDown
          size={18}
          className={`shrink-0 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? (
        <div className="px-4 pb-4 md:px-5 md:pb-5 border-t border-white/10 pt-3 animate-fade-in-down">
          {children}
        </div>
      ) : null}
    </div>
  );
}
