import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../Api';
import { LifeBuoy, Send, CheckCircle, Image as ImageIcon, Plus, ArrowLeft, X, MessageSquare } from 'lucide-react';
import { toast } from 'react-toastify';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
];

const emptySummary = { total: 0, open: 0, in_progress: 0, resolved: 0 };

export default function Support() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deepTicketId = searchParams.get('ticket');
  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ subject: '', message: '', images: null });
  const messagesEndRef = useRef(null);

  useEffect(() => { fetchTickets(filter); }, [filter]);

  useEffect(() => {
    if (!deepTicketId) return;
    setFilter('all');
    setActiveTicketId(deepTicketId);
  }, [deepTicketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTicketId, tickets]);

  useEffect(() => {
    if (!activeTicketId || loading) return;
    if (tickets.some((t) => t._id === activeTicketId)) {
      if (deepTicketId && deepTicketId === activeTicketId) {
        setSearchParams({}, { replace: true });
      }
      return;
    }
    if (!deepTicketId) setActiveTicketId(null);
  }, [tickets, activeTicketId, loading, deepTicketId, setSearchParams]);

  const fetchTickets = async (statusFilter = filter) => {
    setLoading(true);
    try {
      const res = await api.get('/users/support/list', { params: { filter: statusFilter } });
      setTickets(res.data.data || []);
      setSummary(res.data.summary || emptySummary);
    } catch (error) {
      toast.error('Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) return toast.error('Please fill in all fields.');

    setSubmitLoading(true);
    const payload = new FormData();
    payload.append('subject', formData.subject);
    payload.append('message', formData.message);
    if (formData.images) {
      for (let i = 0; i < Math.min(formData.images.length, 3); i++) {
        payload.append('images', formData.images[i]);
      }
    }

    try {
      const res = await api.post('/users/support/create', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setIsModalOpen(false);
      setFormData({ subject: '', message: '', images: null });
      toast.success('Support ticket submitted successfully!');
      if (filter !== 'all' && filter !== 'open') setFilter('open');
      else await fetchTickets(filter === 'all' || filter === 'open' ? filter : 'open');
      setActiveTicketId(res.data.data._id);
    } catch (error) {
      toast.error('Failed to submit ticket.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      const res = await api.post(`/users/support/${activeTicketId}/reply`, { content: replyText });
      setTickets(tickets.map((t) => (t._id === activeTicketId ? res.data.data : t)));
      toast.success('Message sent successfully!');
      setReplyText('');
    } catch (error) {
      toast.error('Failed to send reply');
    }
  };

  const activeTicket = tickets.find((t) => t._id === activeTicketId);

  return (
    <div className="p-4 md:p-8 lg:p-10 relative h-[calc(100vh-80px)] w-full flex flex-col no-scrollbar">
      <div className="flex justify-between items-center mb-4 gap-3">
        <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 flex items-center gap-3">
          <LifeBuoy className="text-blue-500 shrink-0" /> Support Desk
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shrink-0"
        >
          <Plus size={18} /> New Ticket
        </button>
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
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
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
        <div className="text-cyan-400 animate-pulse py-10">Loading Support Desk...</div>
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl">
          <div className={`w-full md:w-1/3 flex flex-col border-r border-white/10 ${activeTicketId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-white/10 bg-black/20 font-bold text-gray-300">Your Conversations</div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {tickets.length === 0 ? (
                <p className="p-6 text-center text-gray-500 italic">No tickets match this filter.</p>
              ) : (
                tickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => setActiveTicketId(ticket._id)}
                    className={`p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 ${
                      activeTicketId === ticket._id
                        ? 'bg-blue-500/10 border-l-4 border-l-blue-500'
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
                    <p className="text-xs text-gray-400 truncate">
                      {ticket.conversation?.length
                        ? ticket.conversation[ticket.conversation.length - 1].content
                        : 'No messages yet'}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-2 uppercase tracking-widest">
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
                <p>Select a ticket to view the conversation</p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-white/10 bg-black/40 flex items-center gap-4">
                  <button onClick={() => setActiveTicketId(null)} className="md:hidden text-gray-400 hover:text-white">
                    <ArrowLeft size={20} />
                  </button>
                  <div>
                    <h3 className="font-bold text-white text-lg">{activeTicket.subject}</h3>
                    <p className="text-xs font-mono text-gray-500">Ticket ID: {activeTicket._id.substring(0, 8)}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
                  {activeTicket.conversation?.map((msg, index) => (
                    <div key={index} className={`flex flex-col ${msg.sender === 'owner' ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 px-1">
                        {msg.sender === 'owner'
                          ? 'You'
                          : msg.sender === 'agent'
                            ? (msg.submittedBy || 'EchoBot')
                            : 'EchoStream Support'}{' '}
                        •{' '}
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div
                        className={`p-3 md:p-4 rounded-2xl max-w-[85%] wrap-anywhere text-sm leading-relaxed ${
                          msg.sender === 'owner'
                            ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30 rounded-tr-sm'
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
                    <CheckCircle size={16} className="inline mr-2 mb-0.5" /> This ticket has been resolved.
                  </div>
                ) : (
                  <div className="p-4 bg-black/40 border-t border-white/10 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                      placeholder="Type your reply..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white focus:outline-none focus:border-blue-400 text-sm"
                    />
                    <button
                      onClick={handleReply}
                      disabled={!replyText.trim()}
                      className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white transition-all disabled:opacity-50"
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

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in-down">
          <div className="bg-[#0A0F1A] border border-blue-500/30 p-6 md:p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <LifeBuoy className="text-blue-500" /> New Ticket
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-blue-400 focus:outline-none text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows="5"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-blue-400 focus:outline-none text-sm resize-none custom-scrollbar"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  <ImageIcon size={14} className="inline mr-1" /> Attachments (Max 3)
                </label>
                <input
                  id="ticket-images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, images: e.target.files })}
                  className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-blue-500/10 file:text-blue-400 cursor-pointer"
                />
              </div>
              <button
                type="submit"
                disabled={submitLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50 mt-2"
              >
                {submitLoading ? 'Sending...' : 'Submit to Support'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
