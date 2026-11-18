const GENERIC = /talk to (a )?human|human support|human agent|chatbot escalation|requested a human/i;

export function isGenericLine(text) {
  return GENERIC.test(String(text || '').trim());
}

export function ticketTitle(ticket) {
  if (!ticket) return 'Support';
  if ((ticket.source === 'chatbot' || isGenericLine(ticket.subject)) && ticket.ownerName) {
    return ticket.ownerName;
  }
  return ticket.subject || ticket.ownerName || 'Support';
}

function userLinesFromHandoff(content) {
  return [...String(content || '').matchAll(/^User:\s*(.+)$/gm)]
    .map((match) => match[1].trim())
    .filter((line) => line && !isGenericLine(line) && !line.startsWith('Hi —'));
}

export function userProblem(ticket) {
  const agent = (ticket?.conversation || []).find((message) => message.sender === 'agent');
  const fromTranscript = userLinesFromHandoff(agent?.content);
  if (fromTranscript.length) return fromTranscript.slice(-3).join(' ');
  const reason = String(agent?.content || '').match(/Reason:\s*(.+)/)?.[1]?.trim();
  if (reason && !isGenericLine(reason)) return reason;
  const owner = (ticket?.conversation || []).find(
    (message) => message.sender === 'owner' && !isGenericLine(message.content)
  );
  if (owner?.content) return owner.content;
  if (ticket?.subject && !isGenericLine(ticket.subject)) return ticket.subject;
  return 'Asked EchoBot for help, then asked to speak with a person.';
}

export function earlierChat(ticket) {
  const agent = (ticket?.conversation || []).find((message) => message.sender === 'agent');
  const chunk = String(agent?.content || '').split('--- Chat transcript ---')[1] || '';
  return chunk
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const user = line.match(/^User:\s*(.*)/);
      if (user) return { who: 'user', text: user[1] };
      const bot = line.match(/^EchoBot:\s*(.*)/);
      if (bot) return { who: 'bot', text: bot[1] };
      return null;
    })
    .filter((row) => row && row.text && !isGenericLine(row.text));
}

export function isHandoffMessage(message) {
  return message?.sender === 'agent' && String(message.content || '').includes('Chat transcript');
}
