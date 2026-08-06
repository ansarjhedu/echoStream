import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../Api';
import { Bell, CheckCheck, Sparkles, MessageSquare, LifeBuoy, AlertOctagon } from 'lucide-react';
import { toast } from 'react-toastify';

const TYPE_META = {
  new_review: { icon: MessageSquare, label: 'Review', color: 'text-cyan-400' },
  dispute_resolved: { icon: AlertOctagon, label: 'Dispute', color: 'text-orange-400' },
  support_reply: { icon: LifeBuoy, label: 'Support', color: 'text-yellow-400' },
  support_resolved: { icon: LifeBuoy, label: 'Support', color: 'text-green-400' },
  system: { icon: Sparkles, label: 'System', color: 'text-purple-400' },
};

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unread | important

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter === 'unread') params.unread = 1;
      if (filter === 'important') params.important = 1;
      const res = await api.get('/users/notifications', { params });
      setItems(res.data.data || []);
      setUnread(res.data.unread || 0);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const markRead = async (id) => {
    try {
      await api.patch(`/users/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
      window.dispatchEvent(new Event('echo:refresh-admin-badges'));
    } catch {
      /* ignore */
    }
  };

  const markAll = async () => {
    try {
      await api.patch('/users/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
      window.dispatchEvent(new Event('echo:refresh-admin-badges'));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Could not mark all as read');
    }
  };

  return (
    <div className="p-4 md:p-10 w-full animate-fade-in-down max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3 mb-2">
            <Bell className="text-cyan-400" /> Notifications
          </h1>
          <p className="text-gray-400 text-sm">
            New reviews, dispute outcomes, and support replies. {unread > 0 ? `${unread} unread.` : 'You are all caught up.'}
          </p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAll}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'all', label: 'All' },
          { key: 'unread', label: 'Unread' },
          { key: 'important', label: 'Important' },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              filter === f.key
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-cyan-400 animate-pulse py-10">Loading notifications…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white/[0.02] border border-white/10 rounded-2xl text-gray-500">
          No notifications in this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => {
            const meta = TYPE_META[n.type] || TYPE_META.system;
            const Icon = meta.icon;
            return (
              <div
                key={n._id}
                className={`border rounded-2xl p-4 md:p-5 transition-colors ${
                  n.isRead
                    ? 'bg-white/[0.02] border-white/10'
                    : 'bg-cyan-500/[0.06] border-cyan-500/25'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 ${meta.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className={`font-bold text-sm md:text-base ${n.isRead ? 'text-gray-200' : 'text-white'}`}>
                        {n.title}
                      </h3>
                      {n.important && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-orange-500/40 text-orange-300 bg-orange-500/10">
                          Important
                        </span>
                      )}
                      <span className="text-[10px] uppercase tracking-wider text-gray-600">{meta.label}</span>
                    </div>
                    <p className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed">{n.message}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <span className="text-[10px] text-gray-600 font-mono">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                      {n.link && (
                        <Link
                          to={n.link}
                          onClick={() => !n.isRead && markRead(n._id)}
                          className="text-xs font-bold text-cyan-400 hover:text-cyan-300"
                        >
                          Open →
                        </Link>
                      )}
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => markRead(n._id)}
                          className="text-xs font-bold text-gray-500 hover:text-white"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
