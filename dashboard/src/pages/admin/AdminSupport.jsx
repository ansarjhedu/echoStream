import React, { useState, useEffect, useRef } from 'react';
import api from '../../Api';
import { LifeBuoy, Send, CheckCircle, MessageSquare, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'react-toastify';

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [replyText, setReplyText] = useState('');
  
  const messagesEndRef = useRef(null);

  useEffect(() => { fetchTickets(); },[]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTicketId, tickets]);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/admin/support/list');
      setTickets(res.data.data ||[]);
    } catch (error) { toast.error("Failed to load tickets."); } 
    finally { setLoading(false); }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      const res = await api.post(`/admin/support/${activeTicketId}/reply`, { content: replyText });
      setTickets(tickets.map(t => t._id === activeTicketId ? res.data.data : t));
      setReplyText('');
    } catch (error) { toast.error("Failed to send reply"); }
  };

  const handleResolve = async () => {
    if (!window.confirm("Mark this ticket as resolved?")) return;
    try {
      const res = await api.patch(`/admin/support/${activeTicketId}/resolve`);
      setTickets(tickets.map(t => t._id === activeTicketId ? res.data.data : t));
      toast.success("Ticket resolved!");
    } catch (error) { toast.error("Failed to resolve ticket"); }
  };

  const activeTicket = tickets.find(t => t._id === activeTicketId);

  if (loading) return <div className="p-10 text-red-400 animate-pulse">Loading Support Desk...</div>;

  return (
    <div className="p-4 md:p-8 lg:p-10 relative h-[calc(100vh-80px)] w-full flex flex-col no-scrollbar">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <LifeBuoy className="text-red-500" /> Admin Support Desk
        </h1>
      </div>

      <div className="flex flex-1 overflow-hidden bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl animate-fade-in-down">
        
        {/* LEFT PANE: TICKET LIST */}
        <div className={`w-full md:w-1/3 flex flex-col border-r border-white/10 ${activeTicketId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-white/10 bg-black/20 font-bold text-gray-300">All Conversations</div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {tickets.length === 0 ? <p className="p-6 text-center text-gray-500">Inbox Zero!</p> : tickets.map(ticket => (
              <div 
                key={ticket._id} 
                onClick={() => setActiveTicketId(ticket._id)}
                className={`p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 ${activeTicketId === ticket._id ? 'bg-red-500/10 border-l-4 border-l-red-500' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-white truncate pr-2">{ticket.subject}</h3>
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${ticket.status === 'resolved' ? 'bg-green-500' : ticket.status === 'in_progress' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                </div>
                <p className="text-xs text-cyan-400 mb-1">{ticket.ownerName}</p>
                <p className="text-[10px] text-gray-600 uppercase tracking-widest">{new Date(ticket.updatedAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANE: CHAT INTERFACE */}
        <div className={`flex-1 flex flex-col bg-black/20 relative ${!activeTicketId ? 'hidden md:flex' : 'flex'}`}>
          {!activeTicket ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageSquare size={48} className="mb-4 opacity-50" />
              <p>Select a ticket to respond to the merchant</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-4 border-b border-white/10 bg-black/40 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <button onClick={() => setActiveTicketId(null)} className="md:hidden text-gray-400 hover:text-white"><ArrowLeft size={20}/></button>
                  <div>
                    <h3 className="font-bold text-white text-lg">{activeTicket.subject}</h3>
                    <p className="text-xs font-mono text-cyan-400">{activeTicket.ownerEmail}</p>
                  </div>
                </div>
                {activeTicket.status !== 'resolved' && (
                  <button onClick={handleResolve} className="px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-green-500/30">
                    <Check size={14}/> Resolve
                  </button>
                )}
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
                {activeTicket.images?.length > 0 && (
                  <div className="mb-6 bg-white/5 p-4 rounded-xl inline-block">
                    <p className="text-xs text-gray-400 mb-2 uppercase font-bold">User Attachments</p>
                    <div className="flex gap-2">
                      {activeTicket.images.map((img, i) => <a key={i} href={img} target="_blank" rel="noreferrer"><img src={img} className="w-16 h-16 rounded-md object-cover border border-white/20"/></a>)}
                    </div>
                  </div>
                )}

                {activeTicket.conversation?.map((msg, index) => (
                  <div key={index} className={`flex flex-col ${msg.sender === 'admin' ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 px-1">
                      {msg.sender === 'admin' ? 'You' : activeTicket.ownerName} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <div className={`p-3 md:p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed ${msg.sender === 'admin' ? 'bg-red-600/20 text-red-100 border border-red-500/30 rounded-tr-sm' : 'bg-white/5 text-gray-300 border border-white/10 rounded-tl-sm'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input */}
              {activeTicket.status === 'resolved' ? (
                <div className="p-4 bg-green-500/10 border-t border-green-500/20 text-center text-green-400 font-bold text-sm">
                  <CheckCircle size={16} className="inline mr-2 mb-0.5" /> Ticket Resolved.
                </div>
              ) : (
                <div className="p-4 bg-black/40 border-t border-white/10 flex gap-2">
                  <input 
                    type="text" 
                    value={replyText} 
                    onChange={e => setReplyText(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleReply()}
                    placeholder="Reply as Admin..." 
                    className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white focus:outline-none focus:border-red-400 text-sm" 
                  />
                  <button onClick={handleReply} disabled={!replyText.trim()} className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white transition-all disabled:opacity-50">
                    <Send size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}