import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, Bot, User, LifeBuoy, Minimize2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../Api';

/**
 * Floating EchoStream support assistant (platform FAQ + human escalation).
 */
export default function SupportAssistant() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hi — I’m EchoBot. Ask me anything about EchoStream (widgets, Design Lab, Presence vs Commerce, Google Reviews, tickets…). Say “talk to a human” anytime to open a support ticket.',
    },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const sendMessage = async (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || sending) return;

    const nextHistory = [...messages, { role: 'user', content: text }];
    setMessages(nextHistory);
    setInput('');
    setSending(true);

    try {
      const res = await api.post('/users/assistant/chat', {
        message: text,
        history: nextHistory.map((m) => ({ role: m.role, content: m.content })),
      });
      const { reply, escalate } = res.data.data || {};
      setMessages((prev) => [...prev, { role: 'assistant', content: reply || '…' }]);

      if (escalate) {
        await runEscalation(text, [...nextHistory, { role: 'assistant', content: reply }]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assistant unavailable.');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry — I hit an error. Try again, or open Help & Support manually.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  const runEscalation = async (summary, history) => {
    setEscalating(true);
    try {
      const res = await api.post('/users/assistant/escalate', {
        summary,
        history: (history || messages).map((m) => ({ role: m.role, content: m.content })),
      });
      const { redirectPath, assignedTo } = res.data.data || {};
      toast.success(res.data.message || 'Support ticket created.');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: assignedTo
            ? `I’ve opened a ticket and routed it to ${assignedTo.userName}. Taking you to Help & Support…`
            : 'I’ve opened a ticket in the platform support queue. Taking you to Help & Support…',
        },
      ]);
      setOpen(false);
      if (redirectPath) navigate(redirectPath);
      else navigate('/hub/support');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create a ticket.');
    } finally {
      setEscalating(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col items-end gap-3 pointer-events-none">
      {open && (
        <div className="pointer-events-auto w-[min(100vw-1.5rem,380px)] h-[min(70vh,520px)] bg-[#0A0F1A]/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="text-cyan-400 shrink-0" size={18} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">EchoBot Support</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Platform guide</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Talk to a human"
                disabled={escalating}
                onClick={() => runEscalation('User requested a human agent from the chat header.', messages)}
                className="p-2 text-yellow-400/90 hover:bg-white/5 rounded-lg disabled:opacity-40"
              >
                <LifeBuoy size={16} />
              </button>
              <button type="button" onClick={() => setOpen(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg">
                <Minimize2 size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              return (
                <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-50 rounded-br-md'
                        : 'bg-white/[0.04] border border-white/10 text-gray-200 rounded-bl-md'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 opacity-60 text-[10px] uppercase tracking-wider">
                      {isUser ? <User size={10} /> : <Bot size={10} />}
                      {isUser ? 'You' : 'EchoBot'}
                    </div>
                    {m.content}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <form onSubmit={sendMessage} className="p-3 border-t border-white/10 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about EchoStream…"
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="min-w-[44px] min-h-[44px] rounded-xl bg-cyan-500 text-[#0A0F1A] flex items-center justify-center disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto min-w-[56px] min-h-[56px] rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 text-white shadow-[0_0_30px_rgba(34,211,238,0.35)] flex items-center justify-center hover:scale-105 transition-transform"
        aria-label={open ? 'Close support chat' : 'Open support chat'}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
