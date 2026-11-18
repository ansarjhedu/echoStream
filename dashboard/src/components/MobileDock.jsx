import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, UserRound } from 'lucide-react';

function Count({ count }) {
  if (!count || count < 1) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-[9px] font-black text-[#0A0F1A] inline-flex items-center justify-center">
      {count > 9 ? '9+' : count}
    </span>
  );
}

function DockLink({ item, active, children, className }) {
  const classes = className || 'flex flex-col items-center justify-center gap-1 min-w-0 flex-1 h-full px-1';
  if (item.onClick && !item.to) {
    return (
      <button type="button" onClick={item.onClick} className={classes}>
        {children}
      </button>
    );
  }
  return (
    <Link
      to={item.to}
      onClick={item.onClick}
      aria-current={active ? 'page' : undefined}
      className={classes}
    >
      {children}
    </Link>
  );
}

function SideTab({ item, active }) {
  const Icon = item.icon;
  return (
    <DockLink item={item} active={active}>
      <span className={`relative flex items-center justify-center w-10 h-8 rounded-2xl transition-colors ${active ? 'bg-cyan-400/15 text-cyan-300' : 'text-gray-500'}`}>
        <Icon size={20} strokeWidth={active ? 2.4 : 2} />
        <Count count={item.badge} />
      </span>
      <span className={`echo-dock-label text-[10px] font-semibold tracking-wide truncate max-w-full ${active ? 'text-cyan-300' : 'text-gray-500'}`}>
        {item.label}
      </span>
    </DockLink>
  );
}

function RaisedFace({ active, children }) {
  return (
    <span
      className={`-mt-7 flex items-center justify-center w-14 h-14 rounded-full border-4 border-[#0B1220] text-[#04120c] shadow-[0_10px_28px_rgba(16,185,129,0.35)] bg-gradient-to-br from-cyan-300 to-emerald-400 ${active ? 'ring-2 ring-cyan-200/80' : ''}`}
    >
      {children}
    </span>
  );
}

function RaisedTab({ item, active }) {
  const Icon = item.icon;
  return (
    <DockLink item={item} active={active}>
      <RaisedFace active={active}>
        <Icon size={24} strokeWidth={2.4} />
      </RaisedFace>
      <span className={`echo-dock-label text-[10px] font-bold ${active ? 'text-emerald-300' : 'text-emerald-400/80'}`}>
        {item.label}
      </span>
    </DockLink>
  );
}

function AccountTab({ item }) {
  const user = item.user;
  return (
    <DockLink item={item} active={item.active}>
      <span className={`flex items-center justify-center w-9 h-9 rounded-full overflow-hidden border-2 ${item.active ? 'border-cyan-300' : 'border-white/20'}`}>
        {user?.profilePic ? (
          <img src={user.profilePic} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="w-full h-full bg-cyan-500/15 flex items-center justify-center">
            <UserRound size={16} className="text-cyan-300" />
          </span>
        )}
      </span>
      <span className={`echo-dock-label text-[10px] font-semibold ${item.active ? 'text-cyan-300' : 'text-gray-300'}`}>Account</span>
    </DockLink>
  );
}

export default function MobileDock({ left = [], right = [], center = null, more = [], account = null }) {
  const location = useLocation();
  const [pinnedPath, setPinnedPath] = useState(null);
  const open = pinnedPath === location.pathname && more.length > 0;

  useEffect(() => {
    if (!open) {
      delete document.body.dataset.dockMore;
      return undefined;
    }
    document.body.dataset.dockMore = 'open';
    return () => {
      delete document.body.dataset.dockMore;
    };
  }, [open]);

  const moreActive = more.some((item) => item.active);
  const toggleMore = () => setPinnedPath(open ? null : location.pathname);

  const moreButton = (raised) => (
    <button
      key="__more"
      type="button"
      onClick={toggleMore}
      aria-expanded={open}
      className="flex flex-col items-center justify-center gap-1 min-w-0 flex-1 h-full px-1"
    >
      {raised ? (
        open || moreActive ? (
          <RaisedFace active>
            <LayoutGrid size={24} strokeWidth={2.4} />
          </RaisedFace>
        ) : (
          <span className="-mt-7 flex items-center justify-center w-14 h-14 rounded-full border-4 border-[#0B1220] bg-[#0B1220] text-gray-400">
            <LayoutGrid size={24} strokeWidth={2} />
          </span>
        )
      ) : (
        <span className={`flex items-center justify-center w-10 h-8 rounded-2xl ${open || moreActive ? 'bg-cyan-400/15 text-cyan-300' : 'text-gray-500'}`}>
          <LayoutGrid size={20} strokeWidth={open || moreActive ? 2.4 : 2} />
        </span>
      )}
      <span className={`echo-dock-label text-[10px] font-semibold ${open || moreActive ? (raised ? 'font-bold text-emerald-300' : 'text-cyan-300') : 'text-gray-500'}`}>
        More
      </span>
    </button>
  );

  return (
    <>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="md:hidden fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
            onClick={() => setPinnedPath(null)}
          />
          <div className="md:hidden fixed inset-x-0 z-50 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] rounded-t-3xl border border-b-0 border-white/10 bg-[#0E1628] px-4 pt-3 pb-5 shadow-[0_-20px_60px_rgba(0,0,0,0.45)] max-h-[60vh] overflow-y-auto">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
            <div className="grid grid-cols-3 gap-2">
              {more.map((item) => {
                const Icon = item.icon;
                const body = (
                  <>
                    <span className={`relative flex items-center justify-center w-11 h-11 rounded-2xl ${item.active ? 'bg-cyan-400/15 text-cyan-300' : 'bg-white/5 text-gray-300'}`}>
                      <Icon size={20} />
                      <Count count={item.badge} />
                    </span>
                    <span className={`text-[11px] font-semibold text-center leading-tight ${item.active ? 'text-cyan-300' : 'text-gray-300'}`}>
                      {item.label}
                    </span>
                  </>
                );
                const tile = `flex flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 min-h-[92px] ${item.active ? 'border-cyan-400/40 bg-cyan-400/5' : 'border-white/5 bg-white/[0.02]'}`;
                const close = () => {
                  setPinnedPath(null);
                  item.onClick?.();
                };
                if (item.onClick && !item.to) {
                  return (
                    <button key={item.key} type="button" onClick={close} className={tile}>
                      {body}
                    </button>
                  );
                }
                return (
                  <Link key={item.key} to={item.to} onClick={close} className={tile}>
                    {body}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      <nav
        className="echo-mobile-dock fixed inset-x-0 bottom-0 z-[80] w-full md:hidden border-t border-white/10 bg-[#0B1220]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Primary"
      >
        <div className="flex items-end h-[4.75rem] px-1">
          {left.map((item) => <SideTab key={item.key} item={item} active={Boolean(item.active)} />)}
          {center?.more ? moreButton(true) : center && <RaisedTab item={center} active={Boolean(center.active)} />}
          {right.map((item) => <SideTab key={item.key} item={item} active={Boolean(item.active)} />)}
          {more.length > 0 && !center?.more && moreButton(false)}
          {account && <AccountTab item={account} />}
        </div>
      </nav>
    </>
  );
}
