/**
 * Bottom bar layout.
 * Account is always the rightmost tab. The center slot is Design in a store,
 * or a raised More button on the hub. Primary links fill the remaining slots;
 * everything else goes in the More sheet.
 */
export function packDock(primaries, { center = null, centerIsMore = false, extras = [], account = null } = {}) {
  const items = primaries.filter(Boolean);
  const extra = extras.filter(Boolean);

  if (centerIsMore) {
    const visible = items.slice(0, 3);
    const more = [...items.slice(3), ...extra];
    const left = visible.slice(0, 2);
    const right = visible.slice(2);
    return {
      left,
      right,
      center: more.length ? { key: '__more', more: true, raised: true, label: 'More' } : null,
      more,
      account,
    };
  }

  const sideCap = 3;
  const needsMore = extra.length > 0 || items.length > sideCap;
  if (!needsMore) {
    return {
      left: items.slice(0, 2),
      right: items.slice(2),
      center,
      more: [],
      account,
    };
  }

  return {
    left: items.slice(0, 2),
    right: [],
    center,
    more: [...items.slice(2), ...extra],
    account,
  };
}
