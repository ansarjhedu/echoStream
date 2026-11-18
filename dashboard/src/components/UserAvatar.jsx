import { useState } from 'react';

/** Google photo URLs fail when the browser sends a Referer. Ask for a sharper size too. */
export function avatarSrc(src) {
  if (!src || typeof src !== 'string') return '';
  return src.replace(/=s\d+-c(?=$|[?#])/, '=s256-c');
}

export default function UserAvatar({ src, name, className = '' }) {
  const [failed, setFailed] = useState(false);
  const photo = failed ? '' : avatarSrc(src);
  const initial = String(name || '?').trim().charAt(0).toUpperCase() || '?';

  if (!photo) {
    return (
      <span className={`inline-flex items-center justify-center bg-cyan-500/20 text-cyan-100 font-bold ${className}`}>
        {initial}
      </span>
    );
  }

  return (
    <img
      src={photo}
      alt=""
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
