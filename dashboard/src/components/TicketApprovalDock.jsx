import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../Api';
import { useAuth } from '../context/AuthContext';
import { hasPerm, isPlatformStaff } from '../utils/permissionHelpers';
import { userProblem } from '../utils/ticketChat';
import { refreshAdminBadges } from '../utils/adminBadges';

const HIDDEN_KEY = 'echo-ticket-hidden';
const PASSED_KEY = 'echo-ticket-passed';

function readIds(storage, key) {
  try {
    const parsed = JSON.parse(storage.getItem(key) || '[]');
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeIds(storage, key, set) {
  storage.setItem(key, JSON.stringify([...set]));
}

function canReviewTickets(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return isPlatformStaff(user) && hasPerm(user, 'support_queue');
}

/**
 * Global approval card for open support requests. Visible on every screen for platform reviewers.
 * Accept claims the ticket. Reject closes it. Hide keeps it in the queue but stops this popup.
 * Pass skips it for this visit so it can still be accepted from Support later.
 */
export default function TicketApprovalDock() {
  const { user } = useAuth();
  const location = useLocation();
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const enabled = canReviewTickets(user);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await api.get('/admin/support/list', { params: { filter: 'open' } });
      const hidden = readIds(localStorage, HIDDEN_KEY);
      const passed = readIds(sessionStorage, PASSED_KEY);
      const open = (res.data?.data || []).filter((ticket) => !hidden.has(String(ticket._id)) && !passed.has(String(ticket._id)));
      setQueue(open);
      setIndex((current) => (open.length ? Math.min(current, open.length - 1) : 0));
    } catch {
      /* silent — the support page still lists the queue */
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    load();
    const timer = setInterval(load, 15000);
    const onRefresh = () => load();
    window.addEventListener('echo:refresh-admin-badges', onRefresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('echo:refresh-admin-badges', onRefresh);
    };
  }, [enabled, load, location.pathname]);

  if (!enabled || !queue.length) return null;
  const ticket = queue[index] || queue[0];
  if (!ticket) return null;

  const remember = (storage, key) => {
    const ids = readIds(storage, key);
    ids.add(String(ticket._id));
    writeIds(storage, key, ids);
    const next = queue.filter((item) => String(item._id) !== String(ticket._id));
    setQueue(next);
    setIndex(0);
  };

  const decide = async (path, success) => {
    setBusy(true);
    try {
      await api.patch(path);
      toast.success(success);
      refreshAdminBadges();
      setQueue((prev) => prev.filter((item) => String(item._id) !== String(ticket._id)));
      setIndex(0);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update this request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside
      className="fixed z-[180] left-3 md:left-6 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 w-[min(100%-1.5rem,340px)] rounded-2xl border border-white/10 bg-[#10182a]/95 shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-md p-3.5 pointer-events-auto"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-amber-300 font-bold">New support request</p>
          <p className="text-sm font-bold text-white truncate mt-1">{ticket.ownerName || 'Merchant'}</p>
          <p className="text-xs text-gray-400 mt-1 line-clamp-3">{userProblem(ticket)}</p>
        </div>
        {queue.length > 1 && (
          <span className="shrink-0 text-[10px] font-bold text-gray-500">{index + 1}/{queue.length}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => decide(`/admin/support/${ticket._id}/claim`, 'Request accepted.')}
          className="h-9 rounded-xl bg-cyan-400 text-[#04120c] text-xs font-bold disabled:opacity-40"
        >
          Accept
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => decide(`/admin/support/${ticket._id}/reject`, 'Request declined.')}
          className="h-9 rounded-xl border border-rose-400/40 text-rose-300 text-xs font-bold hover:bg-rose-500/10 disabled:opacity-40"
        >
          Reject
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => remember(localStorage, HIDDEN_KEY)}
          className="h-9 rounded-xl border border-white/10 text-gray-300 text-xs font-semibold hover:bg-white/5"
        >
          Hide
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => remember(sessionStorage, PASSED_KEY)}
          className="h-9 rounded-xl border border-white/10 text-gray-300 text-xs font-semibold hover:bg-white/5"
        >
          Pass
        </button>
      </div>
    </aside>
  );
}
