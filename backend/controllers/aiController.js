import { GoogleGenAI } from '@google/genai';
import Support from '../models/Support.js';
import User from '../models/User.js';
import {
  MERCHANT_KNOWLEDGE,
  PLATFORM_OPS_KNOWLEDGE,
  isPlatformOperator,
} from '../utils/echoBotKnowledge.js';

/** Lazy client — ESM can evaluate controllers before dotenv finishes loading. */
function getGeminiClient() {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
    if (!apiKey) {
        const err = new Error('GEMINI_API_KEY is not set');
        err.code = 'MISSING_GEMINI_KEY';
        throw err;
    }
    // Force Gemini Developer API (API key), never Vertex ADC.
    return new GoogleGenAI({ apiKey, vertexai: false });
}

const generateSmartReply = async (req, res) => {
    try {
        const { text, type, customerName, rating } = req.body;
        const storeName = req.store.storeName;

        if (!text) {
            return res.status(400).json({ message: "Text is required to generate a reply." });
        }

        let systemPrompt = "";

        if (type === "review") {
            systemPrompt = `
                You are a professional customer service manager for a store named "${storeName}". 
                A customer named ${customerName} left a ${rating}-star review.
                Their review says: "${text}"
                
                Instructions:
                - If the rating is 4 or 5 stars, write a warm, brief "Thank You" message.
                - If the rating is 1, 2, or 3 stars, write a polite, de-escalating apology offering to make things right.
                - Do NOT include placeholders like [Your Name]. Sign off as "The ${storeName} Team".
                - Keep it under 3 sentences.
            `;
        } else if (type === "ticket") {
            systemPrompt = `
                You are technical support for "${storeName}". 
                A customer submitted this support ticket: "${text}"
                
                Instructions:
                - Write a highly professional, empathetic response acknowledging the issue.
                - State that our team is looking into it immediately.
                - Keep it concise (2-3 sentences max).
                - Sign off as "${storeName} Support".
            `;
        }

        const response = await getGeminiClient().models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: systemPrompt,
        });

        const aiReply = response.text;

        return res.status(200).json({
            data: aiReply,
            message: "AI Reply generated successfully"
        });

    } catch (error) {
        console.error("AI Generation Error:", error);
        if (error.code === 'MISSING_GEMINI_KEY') {
            return res.status(503).json({ message: 'AI is not configured (missing GEMINI_API_KEY).' });
        }
        return res.status(500).json({ message: "Failed to generate AI reply. Please try again." });
    }
};

async function pickLeastLoadedSupportAgent() {
    // Platform support team = staff with support_queue whose parent is an admin.
    const candidates = await User.find({
        role: 'staff',
        permissions: 'support_queue',
        isDeleted: { $ne: true },
        isActive: { $ne: false },
        parentAccount: { $ne: null },
    }).select('_id userName email permissions parentAccount');

    if (!candidates.length) return null;

    const parentIds = [...new Set(candidates.map((c) => String(c.parentAccount)))];
    const adminParents = await User.find({
        _id: { $in: parentIds },
        role: 'admin',
        isDeleted: { $ne: true },
    }).select('_id');
    const adminSet = new Set(adminParents.map((p) => String(p._id)));

    const agents = candidates.filter((c) => adminSet.has(String(c.parentAccount)));
    if (!agents.length) return null;

    const scored = await Promise.all(
        agents.map(async (agent) => {
            const openCount = await Support.countDocuments({
                assignedTo: agent._id,
                status: { $in: ['open', 'in_progress'] },
            });
            return { agent, openCount };
        })
    );

    scored.sort((a, b) => a.openCount - b.openCount);
    return scored[0].agent;
}

const chatWithSupportBot = async (req, res) => {
    try {
        if (!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()) {
            return res.status(503).json({ message: 'Support assistant is not configured (missing GEMINI_API_KEY).' });
        }

        const { message, history = [] } = req.body || {};
        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ message: 'Message is required.' });
        }

        const platformOps = isPlatformOperator(req.user);
        const knowledge = platformOps ? PLATFORM_OPS_KNOWLEDGE : MERCHANT_KNOWLEDGE;
        const roleLine = `Caller: role=${req.user?.role || 'unknown'}, staffScope=${req.user?.staffScope || 'n/a'}, storeRole=${req.user?.storeRole || 'n/a'}, permissions=${(req.user?.permissions || []).join(',') || 'none'}.`;

        const transcript = (Array.isArray(history) ? history : [])
            .slice(-12)
            .map((m) => `${m.role === 'user' ? 'User' : 'EchoBot'}: ${String(m.content || '').slice(0, 800)}`)
            .join('\n');

        const prompt = `${knowledge}

${roleLine}

Conversation so far:
${transcript || '(new conversation)'}

User: ${message.trim()}

Return JSON only.`;

        const response = await getGeminiClient().models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: prompt,
        });

        let raw = (response.text || '').trim();
        raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch {
            parsed = { reply: raw || 'I can help with EchoStream. What would you like to know?', escalate: false };
        }

        const reply = String(parsed.reply || '').trim() || 'How can I help with EchoStream today?';
        const escalate = platformOps ? false : Boolean(parsed.escalate);

        return res.status(200).json({
            data: { reply, escalate, audience: platformOps ? 'platform' : 'merchant' },
            message: 'ok',
        });
    } catch (error) {
        console.error('chatWithSupportBot', error);
        if (error.code === 'MISSING_GEMINI_KEY') {
            return res.status(503).json({ message: 'Support assistant is not configured (missing GEMINI_API_KEY).' });
        }
        return res.status(500).json({ message: 'Assistant failed to respond. Please try again.' });
    }
};

/**
 * Industry-standard escalation:
 * create a real ticket immediately, auto-assign to least-loaded platform support agent,
 * seed conversation with chatbot transcript + agent note.
 */
const escalateChatToHuman = async (req, res) => {
    try {
        if (isPlatformOperator(req.user)) {
            return res.status(403).json({
                message: 'Platform operators cannot open merchant support tickets from EchoBot. Use the Support Queue instead.',
                code: 'PLATFORM_NO_ESCALATE',
            });
        }

        const { summary, history = [] } = req.body || {};
        const targetOwnerId = req.user.role === 'staff' ? req.user.parentAccount : req.user._id;
        const ownerDoc = await User.findById(targetOwnerId).select('userName email');
        if (!ownerDoc) {
            return res.status(400).json({ message: 'Account owner not found for escalation.' });
        }

        const assignee = await pickLeastLoadedSupportAgent();

        const transcript = (Array.isArray(history) ? history : [])
            .slice(-20)
            .map((m) => `${m.role === 'user' ? 'User' : 'EchoBot'}: ${String(m.content || '')}`)
            .join('\n');

        const ticket = await Support.create({
            owner: ownerDoc._id,
            ownerName: ownerDoc.userName,
            ownerEmail: ownerDoc.email,
            subject: summary?.slice(0, 120) || 'Chatbot escalation — human support requested',
            source: 'chatbot',
            status: 'open',
            assignedTo: assignee?._id || null,
            conversation: [
                {
                    sender: 'agent',
                    submittedBy: 'EchoBot',
                    content:
                        `Automated handoff from EchoBot.\n\n` +
                        `Reason: ${summary || 'User requested a human agent.'}\n\n` +
                        `--- Chat transcript ---\n${transcript || '(empty)'}`,
                },
                {
                    sender: 'owner',
                    submittedBy: req.user.userName,
                    content: summary || 'I would like to speak with a human support agent.',
                },
            ],
        });

        return res.status(201).json({
            data: {
                ticket,
                ticketId: ticket._id,
                assignedTo: assignee
                    ? { _id: assignee._id, userName: assignee.userName, email: assignee.email }
                    : null,
                redirectPath: `/hub/support?ticket=${ticket._id}`,
            },
            message: assignee
                ? `Ticket created and routed to ${assignee.userName} (least open tickets).`
                : 'Ticket created in the platform support queue.',
        });
    } catch (error) {
        console.error('escalateChatToHuman', error);
        return res.status(500).json({ message: 'Failed to create support ticket.' });
    }
};

export {
    generateSmartReply,
    chatWithSupportBot,
    escalateChatToHuman,
    pickLeastLoadedSupportAgent,
};
