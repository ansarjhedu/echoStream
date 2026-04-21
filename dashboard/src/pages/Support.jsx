import React, { useState, useEffect } from 'react';
import api from '../Api';
import { LifeBuoy, Send, Clock, CheckCircle, MessageSquare, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-toastify';

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const[loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({ subject: '', message: '', images: null }); // Added images

  useEffect(() => {
    fetchTickets();
  },[]);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/users/support/list'); // Change route if yours is different
      setTickets(res.data.data ||[]);
    } catch (error) {
      console.error("No tickets found.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) return toast.error("Please fill in all fields.");
    
    setSubmitLoading(true);
    
    // 🚨 We MUST use FormData because we are sending files to Multer!
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
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setTickets([res.data.data, ...tickets]); 
      setFormData({ subject: '', message: '', images: null }); 
      document.getElementById('ticket-images').value = ""; // Reset file input
      toast.success("Support ticket submitted successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data || "Failed to submit ticket.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const StatusBadge = ({ status }) => {
    switch(status) {
      case 'resolved': return <span className="px-3 py-1 text-[10px] font-bold uppercase rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1"><CheckCircle size={12}/> Resolved</span>;
      case 'in_progress': return <span className="px-3 py-1 text-[10px] font-bold uppercase rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1"><Clock size={12}/> In Progress</span>;
      default: return <span className="px-3 py-1 text-[10px] font-bold uppercase rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1"><AlertCircle size={12}/> Open</span>;
    }
  };

  return (
    <div className="p-4 md:p-10 lg:p-14 relative overflow-y-auto h-full z-10 w-full">
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 tracking-tight flex items-center gap-3">
          <LifeBuoy className="text-blue-500" /> Help & Support
        </h1>
        <p className="text-gray-400 mt-2">Need assistance? Submit a ticket and our team will get back to you.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 w-full min-h-0 animate-fade-in-down">
        
        {/* LEFT COLUMN: TICKET FORM */}
        <div className="w-full lg:w-1/3 shrink-0">
          <div className="bg-white/[0.02] border border-white/10 p-6 md:p-8 rounded-2xl backdrop-blur-xl shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Send size={18} className="text-blue-400" /> Create New Ticket
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Subject / Topic</label>
                <input type="text" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} placeholder="e.g. Widget not displaying correctly" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all text-sm" required />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Message</label>
                <textarea value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} rows="6" placeholder="Please describe your issue in detail..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all text-sm resize-none custom-scrollbar" required />
              </div>

              {/* 📸 IMAGE UPLOAD FOR TICKETS */}
              <div>
                <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2"><ImageIcon size={14}/> Attach Screenshots (Max 3)</label>
                <input id="ticket-images" type="file" multiple accept="image/*" className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 cursor-pointer transition-all" onChange={(e) => setFormData({ ...formData, images: e.target.files })} />
              </div>

              <button type="submit" disabled={submitLoading} className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-400 hover:to-cyan-500 py-3 rounded-xl font-bold text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                {submitLoading ? 'Submitting...' : <><Send size={16} /> Submit Ticket</>}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: TICKET HISTORY */}
        <div className="flex-1 bg-white/[0.02] border border-white/10 p-6 md:p-8 rounded-2xl backdrop-blur-xl shadow-2xl no-scrollbar">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <MessageSquare size={18} className="text-cyan-400" /> Your Ticket History
          </h2>
          
          {loading ? (
            <div className="text-blue-400 animate-pulse text-sm">Fetching tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-black/20">
              <LifeBuoy size={48} className="mx-auto text-gray-600 mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">No Tickets Yet</h3>
              <p className="text-gray-500 text-sm">You have not submitted any support requests.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {tickets.map(ticket => (
                <div key={ticket._id} className="p-5 bg-black/30 border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-white text-lg">{ticket.subject}</h3>
                    <StatusBadge status={ticket.status} />
                  </div>
                  
                  <p className="text-sm text-gray-300 leading-relaxed mb-3">"{ticket.message}"</p>
                  
                  {/* Display Ticket Images */}
                  {ticket.images && ticket.images.length > 0 && (
                    <div className="flex gap-2 mb-4">
                      {ticket.images.map((img, idx) => (
                        <a key={idx} href={img} target="_blank" rel="noopener noreferrer">
                          <img src={img} alt="Screenshot" className="w-16 h-16 object-cover rounded-lg border border-white/10 hover:border-blue-400 transition-colors" />
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-end border-t border-white/5 pt-3">
                    <span className="text-xs text-gray-500">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    <span className="text-xs font-mono text-gray-600">ID: {ticket._id.substring(0, 8)}</span>
                  </div>

                  {/* 🚨 FIX: Updated to read adminReply.content based on your backend! */}
                  {ticket.adminReply && ticket.adminReply.content && (
                    <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border-l-2 border-blue-500">
                      <span className="text-blue-400 text-xs font-bold uppercase tracking-widest block mb-1">Admin Response</span>
                      <p className="text-sm text-gray-300">{ticket.adminReply.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}