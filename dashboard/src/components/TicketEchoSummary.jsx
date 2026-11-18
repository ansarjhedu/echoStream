import { ticketTitle, userProblem, earlierChat } from '../utils/ticketChat';

export default function TicketEchoSummary({ ticket }) {
  const problem = userProblem(ticket);
  const earlier = earlierChat(ticket).slice(-6);
  const name = ticketTitle(ticket);

  return (
    <div className="max-w-[92%] rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.07] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">EchoBot summary</p>
      <p className="mt-2 text-sm leading-relaxed text-white">{problem}</p>
      {earlier.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Earlier in the chat</p>
          {earlier.map((line, index) => (
            <p key={index} className="text-xs leading-relaxed text-gray-300">
              <span className={line.who === 'user' ? 'font-semibold text-white' : 'text-cyan-200/80'}>
                {line.who === 'user' ? name : 'EchoBot'}:{' '}
              </span>
              {line.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
