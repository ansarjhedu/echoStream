/**
 * Permission selector — pill toggles with hover + selected states (replaces checkboxes).
 */
export default function PermissionPills({ groups, values, locked, onToggle, variant = 'store' }) {
  const selectedCls =
    variant === 'platform'
      ? 'bg-red-500/15 border-red-500/45 text-red-300 shadow-[0_0_14px_rgba(239,68,68,0.12)]'
      : 'bg-cyan-500/15 border-cyan-500/45 text-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.12)]';
  const idleCls =
    'bg-black/40 border-white/10 text-gray-400 hover:border-white/25 hover:text-gray-200 hover:bg-white/[0.04]';

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">{group.title}</p>
          <div className="flex flex-wrap gap-2">
            {group.keys.map((perm) => {
              const on = values.includes(perm);
              return (
                <button
                  key={perm}
                  type="button"
                  disabled={locked}
                  onClick={() => onToggle(perm)}
                  className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-semibold capitalize transition-all ${
                    locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                  } ${on ? selectedCls : idleCls}`}
                >
                  {perm.replace(/_/g, ' ')}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
