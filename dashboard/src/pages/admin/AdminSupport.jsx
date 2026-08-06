import React, { useState, useEffect, useRef } from 'react';
import api from '../../Api';
import { LifeBuoy, Send, CheckCircle, MessageSquare, ArrowLeft, Check, UserCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { refreshAdminBadges } from '../../utils/adminBadges';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
];

const emptySummary = { total: 0, open: 0, in_progress: 0, resolved: 0 };

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [filter, setFilter] = useState('open');
  const [loading, setLoading] = useState(true);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => { fetchTickets(filter); }, [filter]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTicketId, tickets]);

  useEffect(() => {
    if (activeTicketId && !tickets.some((t) => t._id === activeTicketId)) {
      setActiveTicketId(null);
    }
  }, [tickets, activeTicketId]);

  const fetchTickets = async (statusFilter = filter) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/support/list', { params: { filter: statusFilter } });
      setTickets(res.data.data || []);
      setSummary(res.data.summary || emptySummary);
    } catch (error) {
      toast.error('Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      const res = await api.post(`/admin/support/${activeTicketId}/reply`, { content: replyText });
      const updated = res.data.data;
      // Reply moves ticket to in_progress — refresh if current filter would hide it
      if (filter === 'open') {
        setTickets((prev) => prev.filter((t) => t._id !== activeTicketId));
        setSummary((s) => ({
          ...s,
          open: Math.max(0, s.open - 1),
          in_progress: s.in_progress + 1,
        }));
        setActiveTicketId(null);
      } else {
        setTickets(tickets.map((t) => (t._id === activeTicketId ? updated : t)));
        if (filter === 'all') {
          setSummary((s) => ({
            ...s,
            open: tickets.find((t) => t._id === activeTicketId)?.status === 'open'
              ? Math.max(0, s.open - 1)
              : s.open,
            in_progress:
              tickets.find((t) => t._id === activeTicketId)?.status === 'open'
                ? s.in_progress + 1
                : s.in_progress,
          }));
        }
      }
      setReplyText('');
      refreshAdminBadges();
    } catch (error) {
      toast.error('Failed to send reply');
    }
  };

  const activeTicket = tickets.find((t) => t._id === activeTicketId);

  const handleClaim = async () => {
    try {
      const res = await api.patch(`/admin/support/${activeTicketId}/claim`);
      const updated = res.data.data;
      toast.success(res.data.message || 'Ticket accepted.');
      if (filter === 'open') {
        setTickets((prev) => prev.filter((t) => t._id !== activeTicketId));
        setSummary((s) => ({
          ...s,
          open: Math.max(0, s.open - 1),
          in_progress: s.in_progress + 1,
        }));
        setActiveTicketId(null);
      } else {
        setTickets((prev) => prev.map((t) => (t._id === activeTicketId ? updated : t)));
        if (filter === 'all' && activeTicket?.status === 'open') {
          setSummary((s) => ({
            ...s,
            open: Math.max(0, s.open - 1),
            in_progress: s.in_progress + 1,
          }));
        }
      }
      refreshAdminBadges();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept ticket');
    }
  };

  const handleResolve = async () => {
    if (!window.confirm('Mark this ticket as resolved?')) return;
    const prevStatus = activeTicket?.status;
    try {
      const res = await api.patch(`/admin/support/${activeTicketId}/resolve`);
      const updated = res.data.data;
      toast.success('Ticket resolved!');
      if (filter === 'resolved' || filter === 'all') {
        setTickets((prev) => prev.map((t) => (t._id === activeTicketId ? updated : t)));
      } else {
        setTickets((prev) => prev.filter((t) => t._id !== activeTicketId));
        setActiveTicketId(null);
      }
      setSummary((s) => ({
        ...s,
        resolved: (s.resolved || 0) + 1,
        open: prevStatus === 'open' ? Math.max(0, s.open - 1) : s.open,
        in_progress: prevStatus === 'in_progress' ? Math.max(0, s.in_progress - 1) : s.in_progress,
      }));
      refreshAdminBadges();
      await fetchTickets(filter);
    } catch (error) {
      toast.error('Failed to resolve ticket');
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-10 relative h-[calc(100vh-80px)] w-full flex flex-col no-scrollbar">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-3">
          <LifeBuoy className="text-red-500 shrink-0" /> Admin Support Desk
        </h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
        {[
          { label: 'Total', value: summary.total, color: 'text-white' },
          { label: 'Pending', value: summary.open, color: 'text-orange-400' },
          { label: 'In Progress', value: summary.in_progress, color: 'text-yellow-400' },
          { label: 'Resolved', value: summary.resolved, color: 'text-green-400' },
        ].map((card) => (
          <div key={card.label} className="bg-white/[0.02] border border-white/10 rounded-2xl p-3 md:p-4 backdrop-blur-xl">
            <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider mb-1">{card.label}</p>
            <p className={`text-xl md:text-2xl font-black ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              filter === f.key
                ? 'bg-red-500/15 text-red-300 border-red-500/40'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            {f.label}
            {f.key === 'open' && summary.open > 0 ? ` (${summary.open})` : ''}
            {f.key === 'in_progress' && summary.in_progress > 0 ? ` (${summary.in_progress})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-red-400 animate-pulse py-10">Loading Support Desk...</div>
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl animate-fade-in-down">
          <div className={`w-full md:w-1/3 flex flex-col border-r border-white/10 ${activeTicketId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-white/10 bg-black/20 font-bold text-gray-300">Conversations</div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {tickets.length === 0 ? (
                <p className="p-6 text-center text-gray-500">No tickets match this filter.</p>
              ) : (
                tickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => setActiveTicketId(ticket._id)}
                    className={`p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 ${
                      activeTicketId === ticket._id
                        ? 'bg-red-500/10 border-l-4 border-l-red-500'
                        : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-white truncate pr-2">{ticket.subject}</h3>
                      <span
                        className={`px-3 py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-full border shrink-0 ${
                          ticket.status === 'in_progress'
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : ticket.status === 'resolved'
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        }`}
                      >
                        {ticket.status === 'open' ? 'pending' : ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-cyan-400 mb-1">{ticket.ownerName}</p>
                    {ticket.source === 'chatbot' && (
                      <p className="text-[10px] text-purple-400 mb-1">Via EchoBot</p>
                    )}
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest">
                      {new Date(ticket.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={`flex-1 flex flex-col bg-black/20 relative ${!activeTicketId ? 'hidden md:flex' : 'flex'}`}>
            {!activeTicket ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageSquare size={48} className="mb-4 opacity-50" />
                <p>Select a ticket to respond to the merchant</p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-white/10 bg-black/40 flex justify-between items-center">
                  <div className="flex items-center gap-4 min-w-0">
                    <button onClick={() => setActiveTicketId(null)} className="md:hidden text-gray-400 hover:text-white shrink-0">
                      <ArrowLeft size={20} />
                    </button>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-lg truncate">{activeTicket.subject}</h3>
                      <p className="text-xs font-mono text-cyan-400 truncate">{activeTicket.ownerEmail}</p>
                    </div>
                  </div>
                  {activeTicket.status !== 'resolved' && (
                    <div className="flex items-center gap-2 shrink-0">
                      {activeTicket.status === 'open' && (
                        <button
                          type="button"
                          onClick={handleClaim}
                          className="px-3 py-1.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-cyan-500/30"
                        >
                          <UserCheck size={14} /> Accept
                        </button>
                      )}
                      <button
                        onClick={handleResolve}
                        className="px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-green-500/30"
                      >
                        <Check size={14} /> Resolve
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
                  {activeTicket.conversation?.map((msg, index) => (
                    <div key={index} className={`flex flex-col ${msg.sender === 'admin' ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 px-1">
                        {msg.sender === 'admin'
                          ? 'You'
                          : msg.sender === 'agent'
                            ? (msg.submittedBy || 'EchoBot')
                            : activeTicket.ownerName}{' '}
                        •{' '}
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div
                        className={`p-3 md:p-4 rounded-2xl max-w-[85%] text-sm wrap-anywhere leading-relaxed ${
                          msg.sender === 'admin'
                            ? 'bg-red-600/20 text-red-100 border border-red-500/30 rounded-tr-sm'
                            : msg.sender === 'agent'
                              ? 'bg-cyan-500/10 text-cyan-50 border border-cyan-500/20 rounded-tl-sm whitespace-pre-wrap'
                              : 'bg-white/5 text-gray-300 border border-white/10 rounded-tl-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                      {Array.isArray(msg.images) && msg.images.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {msg.images.map((img, i) => (
                            <a key={i} href={img} target="_blank" rel="noreferrer">
                              <img src={img} alt="Attachment" className="w-14 h-14 rounded-md object-cover border border-white/20" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {activeTicket.status === 'resolved' ? (
                  <div className="p-4 bg-green-500/10 border-t border-green-500/20 text-center text-green-400 font-bold text-sm">
                    <CheckCircle size={16} className="inline mr-2 mb-0.5" /> Ticket Resolved.
                  </div>
                ) : (
                  <div className="p-4 bg-black/40 border-t border-white/10 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                      placeholder="Reply as Admin..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white focus:outline-none focus:border-red-400 text-sm"
                    />
                    <button
                      onClick={handleReply}
                      disabled={!replyText.trim()}
                      className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white transition-all disabled:opacity-50"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
