import React, { useEffect, useState } from 'react';
import api from '../../Api';
import { LifeBuoy, Clock, CheckCircle, AlertCircle, MessageSquare, Check } from 'lucide-react'; // <-- Added Check icon
import { toast } from 'react-toastify';

export default function AdminSupport() {
  const[tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});

  useEffect(() => {
    fetchTickets();
  },[]);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/admin/support/list'); // Adjust route to match yours
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

  // 🚨 NEW: Resolve Ticket Handler
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
      case 'resolved': return <span className="px-3 py-1 text-xs font-bold uppercase rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1"><CheckCircle size={14}/> Resolved</span>;
      case 'in_progress': return <span className="px-3 py-1 text-xs font-bold uppercase rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1"><Clock size={14}/> In Progress</span>;
      default: return <span className="px-3 py-1 text-xs font-bold uppercase rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1"><AlertCircle size={14}/> Open</span>;
    }
  };

  if (loading) return <div className="p-10 text-blue-400 animate-pulse">Loading Support Queue...</div>;

  return (
    <div className="p-4 md:p-10 w-full animate-fade-in-down">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3 mb-2">
          <LifeBuoy className="text-blue-500" /> Support Desk
        </h1>
        <p className="text-gray-400">Respond to merchant issues and technical difficulties.</p>
      </div>

      <div className="space-y-4 max-w-4xl">
        {tickets.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-white/10 rounded-2xl">
            <CheckCircle size={48} className="mx-auto text-green-500/50 mb-4" />
            <h3 className="text-xl font-bold text-white">Inbox Zero!</h3>
            <p className="text-gray-500">No support tickets require your attention.</p>
          </div>
        ) : tickets.map(ticket => (
          <div key={ticket._id} className={`bg-white/[0.02] border p-6 rounded-2xl shadow-lg relative transition-colors ${ticket.status === 'resolved' ? 'border-green-500/20 opacity-80' : 'border-blue-500/20'}`}>
            
            <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-white text-lg">{ticket.subject}</h3>
                  <StatusBadge status={ticket.status} />
                </div>
                <p className="text-sm text-gray-400 font-mono">
                  From: <span className="text-cyan-400">{ticket.ownerName}</span> ({ticket.ownerEmail})
                </p>
              </div>

              {/* 🚨 NEW: Mark as Resolved Button */}
              {ticket.status !== 'resolved' && (
                <button 
                  onClick={() => handleResolve(ticket._id)}
                  className="px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                >
                  <Check size={14} /> Mark as Resolved
                </button>
              )}
            </div>
            
            <div className="bg-black/40 p-4 rounded-xl border border-white/5 mb-4">
              <p className="text-gray-300">"{ticket.conversation[ticket.conversation.length - 1].content}"</p>
              {ticket.images && ticket.images.length > 0 && (
                <div className="flex gap-2 mt-4">
                  {ticket.images.map((img, idx) => (
                    <a key={idx} href={img} target="_blank" rel="noopener noreferrer">
                      <img src={img} className="w-16 h-16 object-cover rounded-lg border border-white/10 hover:border-blue-400" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Reply Logic */}
            { ticket.conversation[ticket.conversation.length - 1].content && ticket.conversation[ticket.conversation.length - 1].sender === 'admin' ? (
              <div className="p-4 rounded-lg bg-blue-500/10 border-l-2 border-blue-500">
                <span className="text-blue-400 text-xs font-bold uppercase block mb-1">
                  Your Response sent on {new Date(ticket.conversation[ticket.conversation.length - 1].createdAt).toLocaleDateString()}
                </span>
                <p className="text-sm text-gray-300">{ticket.conversation[ticket.conversation.length - 1].content}</p>
              </div>
            ) : ticket.status !== 'resolved' ? (
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <input 
                  type="text" 
                  placeholder="Type your reply to the merchant..." 
                  value={replyText[ticket._id] || ''}
                  onChange={(e) => setReplyText({ ...replyText, [ticket._id]: e.target.value })}
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all text-sm"
                />
                <button 
                  onClick={() => handleReply(ticket._id)} 
                  disabled={!replyText[ticket._id]}
                  className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm"
                >
                  <MessageSquare size={16} /> Send Reply
                </button>
              </div>
            ) : null}

          </div>
        ))}
      </div>
    </div>
  );
}