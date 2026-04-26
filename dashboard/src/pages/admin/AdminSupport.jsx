import React, { useEffect, useState } from 'react';
import api from '../../Api';
import { LifeBuoy, Clock, CheckCircle, AlertCircle, MessageSquare, Check } from 'lucide-react';
import { toast } from 'react-toastify';

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});

  useEffect(() => {
    fetchTickets();
  },[]);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/admin/support/list'); 
      setTickets(res.data.data ||[]);
    } catch (error) {
      toast.error("Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (ticketId) => {
    if (!replyText[ticketId]) return toast.error("Reply cannot be empty");
    try {
      const res = await api.post(`/admin/support/${ticketId}/reply`, { content: replyText[ticketId] });
      setTickets(tickets.map(t => t._id === ticketId ? res.data.data : t));
      setReplyText({ ...replyText, [ticketId]: '' });
      toast.success("Reply sent to user!");
    } catch (error) {
      toast.error("Failed to send reply");
    }
  };

  const handleResolve = async (ticketId) => {
    if (!window.confirm("Mark this ticket as resolved?")) return;
    try {
      const res = await api.patch(`/admin/support/${ticketId}/resolve`);
      setTickets(tickets.map(t => t._id === ticketId ? res.data.data : t));
      toast.success("Ticket marked as resolved!");
    } catch (error) {
      toast.error("Failed to resolve ticket");
    }
  };

  const StatusBadge = ({ status }) => {
    switch(status) {
      case 'resolved': return <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1"><CheckCircle size={12}/> Resolved</span>;
      case 'in_progress': return <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1"><Clock size={12}/> In Progress</span>;
      default: return <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1"><AlertCircle size={12}/> Open</span>;
    }
  };

  if (loading) return <div className="p-10 text-blue-400 animate-pulse">Loading Support Queue...</div>;

  return (
    <div className="p-4 md:p-10 w-full animate-fade-in-down overflow-y-auto no-scrollbar h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3 mb-2">
          <LifeBuoy className="text-blue-500" /> Support Desk
        </h1>
        <p className="text-gray-400">Respond to merchant issues and technical difficulties.</p>
      </div>

      <div className="space-y-6 max-w-4xl pb-10">
        {tickets.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-white/10 rounded-2xl">
            <CheckCircle size={48} className="mx-auto text-green-500/50 mb-4" />
            <h3 className="text-xl font-bold text-white">Inbox Zero!</h3>
            <p className="text-gray-500">No support tickets require your attention.</p>
          </div>
        ) : tickets.map(ticket => (
          <div key={ticket._id} className={`bg-white/[0.02] border p-6 md:p-8 rounded-2xl shadow-lg relative transition-colors ${ticket.status === 'resolved' ? 'border-green-500/20 opacity-80' : 'border-blue-500/20'}`}>
            
            {/* TICKET HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4 border-b border-white/5 pb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-white text-xl">{ticket.subject}</h3>
                  <StatusBadge status={ticket.status} />
                </div>
                <p className="text-sm text-gray-400 font-mono">
                  From: <span className="text-cyan-400">{ticket.ownerName}</span> ({ticket.ownerEmail})
                </p>
                <span className="text-xs font-mono text-gray-600 mt-1 block">Ticket ID: {ticket._id.substring(0, 8)}</span>
              </div>

              {ticket.status !== 'resolved' && (
                <button 
                  onClick={() => handleResolve(ticket._id)}
                  className="px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <Check size={14} /> Mark as Resolved
                </button>
              )}
            </div>
            
            {/* 📸 ORIGINAL IMAGES (If the user attached screenshots to the first message) */}
            {ticket.images && ticket.images.length > 0 && (
              <div className="flex gap-2 mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
                <span className="text-xs text-gray-500 uppercase tracking-widest font-bold flex items-center h-full mr-2">Attachments:</span>
                {ticket.images.map((img, idx) => (
                  <a key={idx} href={img} target="_blank" rel="noopener noreferrer">
                    <img src={img} className="w-16 h-16 object-cover rounded-lg border border-white/10 hover:border-blue-400 transition-colors" alt="attachment" />
                  </a>
                ))}
              </div>
            )}

            {/* 💬 THE FULL CHAT THREAD */}
            <div className="space-y-4 mb-6">
              {ticket.conversation?.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex flex-col ${msg.sender === 'admin' ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 px-1">
                    {msg.sender === 'admin' ? 'You' : ticket.ownerName} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  <div 
                    className={`p-4 rounded-2xl max-w-[85%] md:max-w-[75%] text-sm leading-relaxed ${
                      msg.sender === 'admin' 
                        ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30 rounded-tr-sm' 
                        : 'bg-black/40 text-gray-300 border border-white/10 rounded-tl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* ✉️ REPLY INPUT (Hidden if resolved) */}
            {ticket.status !== 'resolved' && (
              <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-white/5">
                <input 
                  type="text" 
                  placeholder={`Reply to ${ticket.ownerName}...`}
                  value={replyText[ticket._id] || ''}
                  onChange={(e) => setReplyText({ ...replyText, [ticket._id]: e.target.value })}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all text-sm"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleReply(ticket._id); }} // Submit on Enter key!
                />
                <button 
                  onClick={() => handleReply(ticket._id)} 
                  disabled={!replyText[ticket._id]}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm"
                >
                  <MessageSquare size={16} /> Send Reply
                </button>
              </div>
            )}

          </div>
        ))}
      </div>
    </div>
  );
}