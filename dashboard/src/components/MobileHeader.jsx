import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, LogOut } from 'lucide-react';
import api from '../Api';
import mark from '../assets/logo-mark.png';

function trimStoreName(name) {
  const clean = String(name || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= 18) return clean;
  return `${clean.slice(0, 17).trimEnd()}…`;
}

/**
 * Mobile top bar. EchoStream mark on the left, alerts and logout on the right.
 * Inside a store the mark is replaced by the store icon and a short store name.
 */
export default function MobileHeader({ store, alertCount, onLogout, onLeave, homeTo = '/hub/stores' }) {
  const [fetched, setFetched] = useState(0);

  useEffect(() => {
    if (alertCount != null) return undefined;
    let alive = true;
    api.get('/users/notifications', { params: { unread: 1 } })
      .then((res) => { if (alive) setFetched(res.data?.unread || 0); })
      .catch(() => {});
    return () => { alive = false; };
  }, [alertCount]);

  const count = alertCount != null ? alertCount : fetched;
  const storeName = store?.storeName;
  const storeIcon = store?.siteMeta?.favicon || store?.siteMeta?.image;

  return (
    <header className="md:hidden shrink-0 z-30 border-b border-white/10 bg-[#0A0F1A] pt-[env(safe-area-inset-top,0px)]">
      <div className="flex items-center justify-between gap-3 px-3 min-h-16">
        <Link to={homeTo} onClick={onLeave} className="flex items-center gap-2 min-w-0 flex-1">
          {store ? (
            storeIcon ? (
              <img src={storeIcon} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0 border border-white/10" />
            ) : (
              <span className="h-10 w-10 rounded-lg shrink-0 bg-cyan-400/15 border border-cyan-300/30 text-cyan-200 text-base font-black flex items-center justify-center">
                {(storeName || 'S').trim().charAt(0).toUpperCase()}
              </span>
            )
          ) : (
            <img src={mark} alt="EchoStream" className="h-11 w-auto shrink-0" />
          )}
          {storeName ? (
            <span className="text-base font-bold text-white truncate">{trimStoreName(storeName)}</span>
          ) : (
            <span className="text-lg font-black tracking-tight text-white truncate">EchoStream</span>
          )}
        </Link>

        <div className="flex items-center gap-0.5 shrink-0">
          <Link
            to="/hub/notifications"
            onClick={onLeave}
            aria-label={count > 0 ? `Alerts, ${count} unread` : 'Alerts'}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center text-gray-300 hover:bg-white/5"
          >
            <Bell size={18} />
            {count > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-[9px] font-black text-[#0A0F1A] inline-flex items-center justify-center">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Logout"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-rose-300 hover:bg-rose-500/10"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
