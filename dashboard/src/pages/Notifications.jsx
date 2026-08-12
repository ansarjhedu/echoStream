import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../Api';
import { Bell, CheckCheck, Sparkles, MessageSquare, LifeBuoy, AlertOctagon } from 'lucide-react';
import { toast } from 'react-toastify';
import AccordionItem from '../components/ui/AccordionItem';

const TYPE_META = {
  new_review: { icon: MessageSquare, label: 'Review', color: 'text-cyan-400' },
  dispute_resolved: { icon: AlertOctagon, label: 'Dispute', color: 'text-orange-400' },
  support_reply: { icon: LifeBuoy, label: 'Support', color: 'text-yellow-400' },
  support_resolved: { icon: LifeBuoy, label: 'Support', color: 'text-green-400' },
  system: { icon: Sparkles, label: 'System', color: 'text-purple-400' },
};

function previewText(text, max = 72) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);

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

  const toggle = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="p-4 md:p-10 w-full animate-fade-in-down flex justify-center">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3 mb-2">
              <Bell className="text-cyan-400" /> Notifications
            </h1>
            <p className="text-gray-400 text-sm">
              New reviews, dispute outcomes, and support replies.{' '}
              {unread > 0 ? `${unread} unread.` : 'You are all caught up.'}
            </p>
          </div>
          {unread > 0 && (
            <button type="button" onClick={markAll} className="btn-echo bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20">
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-6 justify-center sm:justify-start">
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
            { key: 'important', label: 'Important' },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`btn-echo-sm border transition-all ${
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
          <div className="text-cyan-400 animate-pulse py-10 text-center">Loading notifications…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.02] border border-white/10 rounded-2xl text-gray-500">
            No notifications in this filter.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const meta = TYPE_META[n.type] || TYPE_META.system;
              const Icon = meta.icon;
              const isOpen = openId === n._id;
              return (
                <AccordionItem
                  key={n._id}
                  open={isOpen}
                  onToggle={() => {
                    toggle(n._id);
                    if (!n.isRead && !isOpen) markRead(n._id);
                  }}
                  unread={!n.isRead}
                  preview={previewText(n.message)}
                  header={
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`shrink-0 ${meta.color}`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={`font-bold text-sm truncate ${n.isRead ? 'text-gray-200' : 'text-white'}`}>
                            {n.title}
                          </h3>
                          {n.important ? (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-orange-500/40 text-orange-300 bg-orange-500/10 shrink-0">
                              Important
                            </span>
                          ) : null}
                          <span className="text-[10px] uppercase tracking-wider text-gray-600 shrink-0">{meta.label}</span>
                        </div>
                        {!isOpen ? (
                          <p className="text-xs text-gray-500 truncate mt-0.5 md:hidden">{previewText(n.message, 48)}</p>
                        ) : null}
                        <p className="text-[10px] text-gray-600 font-mono mt-1">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  }
                >
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{n.message}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-white/5">
                    {n.link ? (
                      <Link
                        to={n.link}
                        onClick={() => !n.isRead && markRead(n._id)}
                        className="btn-echo-sm bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25"
                      >
                        Open →
                      </Link>
                    ) : null}
                    {!n.isRead ? (
                      <button
                        type="button"
                        onClick={() => markRead(n._id)}
                        className="btn-echo-sm border border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                      >
                        Mark read
                      </button>
                    ) : null}
                  </div>
                </AccordionItem>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
