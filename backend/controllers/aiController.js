import { GoogleGenAI } from '@google/genai';
import Support from '../models/Support.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import Store from '../models/Store.js';
import { recalculateProductStats } from '../services/reviewService.js';
import { notifyUser } from '../services/notificationService.js';

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

const PLATFORM_KNOWLEDGE = `
You are EchoBot, the in-dashboard support assistant for EchoStream — a B2B SaaS for reviews, trust widgets, and support.

ONLY answer questions about EchoStream. If asked about unrelated topics, politely refuse and steer back to the platform.

## Product modes
- Commerce (ecommerce stores): product reviews, verified buyers (HMAC), Moderation, Disputes, Analytics, Widgets, Design Lab, Google Reviews.
- Presence (portfolio / blog): site-level reviews (product handle = portfolio|blog, title = site), Widget Catalog, Design Lab, Google Reviews, Reviews list with Hide controls. No product Analytics/Disputes chrome.

## Core features to guide on
1. Landing & auth: Presence signup vs Register a Store; login, register, OTP verify, forgot password, login with OTP, password show/hide.
2. Hub: My Stores (commerce) vs Presence Home (portfolio/blog); Team invites; Help & Support tickets; Profile.
3. Widget Catalog → select layout → Design Lab (colors, typography, carousel motion) → Save & Publish → copy embed snippet.
4. Presence embed: data-api-key + data-product-handle={portfolio|blog} + data-product-title=site (no HMAC).
5. Commerce embed: product handle + customer fields + server-side HMAC verification hash.
6. Google Reviews: user pastes their Place ID; platform uses GOOGLE_PLACES_API_KEY; min star filter; Sync imports reviews.
7. Reviews: list/hide individual reviews; bulk-hide by max star rating; commerce may still have dispute history for older cases.
8. Support tickets: owners create tickets; platform admin Support Queue replies/resolves.
9. Staff: store staff presets (administrator/editor/support); platform staff with support_queue.

## Escalation rules
If the user clearly wants a human agent, live support, or says they are stuck after guidance, respond briefly that you will open a support ticket, and set escalate=true in the JSON response.
Do NOT escalate for simple how-to questions you can answer.

## Response format
Always respond with valid JSON only (no markdown fences):
{
  "reply": "helpful message to the user",
  "escalate": false
}
When escalate is true, reply should confirm you are connecting them to a human and that a ticket will appear in Help & Support.
`;

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

        const transcript = (Array.isArray(history) ? history : [])
            .slice(-12)
            .map((m) => `${m.role === 'user' ? 'User' : 'EchoBot'}: ${String(m.content || '').slice(0, 800)}`)
            .join('\n');

        const prompt = `${PLATFORM_KNOWLEDGE}

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
            parsed = { reply: raw || 'I can help with EchoStream features. What would you like to know?', escalate: false };
        }

        const reply = String(parsed.reply || '').trim() || 'How can I help with EchoStream today?';
        const escalate = Boolean(parsed.escalate);

        return res.status(200).json({
            data: { reply, escalate },
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

function parseAiJson(raw) {
    let text = String(raw || '').trim();
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    return JSON.parse(text);
}

/**
 * Apply a dispute decision and notify the store owner with reasoning.
 * approve_dispute → hide review (rejected)
 * reject_dispute → restore review live (approved); lock at 3 strikes
 */
async function applyDisputeDecision(review, { decision, reason, resolvedBy, confidence = null }) {
    if (decision === 'approve_dispute') {
        review.status = 'rejected';
    } else {
        review.status = 'approved';
        const strikes = review.disputeCount || review.disputedReason?.count || 0;
        if (strikes >= 3) review.isLocked = true;
    }

    review.disputeResolution = {
        decision,
        reason: String(reason || '').trim().slice(0, 2000),
        resolvedBy,
        confidence: typeof confidence === 'number' ? confidence : null,
        resolvedAt: new Date(),
    };
    await review.save();
    await recalculateProductStats(review.product);

    const store = await Store.findById(review.store).select('owner storeName');
    if (store?.owner) {
        const outcome =
            decision === 'approve_dispute'
                ? 'Your dispute was upheld — the review is hidden from your public widget.'
                : 'Your dispute was declined — the review is live again on your widget.';
        await notifyUser({
            userId: store.owner,
            type: 'dispute_resolved',
            title: `Dispute resolved · ${store.storeName}`,
            message: `${outcome}\n\nReasoning: ${review.disputeResolution.reason}`,
            link: '/workspace/disputes',
            important: true,
            meta: {
                reviewId: String(review._id),
                decision,
                resolvedBy,
                storeId: String(store._id),
            },
        });
    }

    return review;
}

/**
 * Core AI dispute agent — analyzes review + merchant claim and returns a decision.
 * Used after a dispute is filed (auto) or when admin clicks "AI Resolve".
 */
async function runAiDisputeAgent(reviewId) {
    const review = await Review.findById(reviewId).populate('store', 'storeName owner');
    if (!review) throw Object.assign(new Error('Review not found'), { status: 404 });
    if (review.status !== 'disputed') {
        throw Object.assign(new Error('Only disputed reviews can be AI-resolved'), { status: 400 });
    }

    const proofCount = Array.isArray(review.disputedReason?.proofImages)
        ? review.disputedReason.proofImages.length
        : 0;

    const prompt = `You are EchoStream's dispute resolution agent for a B2B reviews platform.

Decide whether the STORE OWNER's dispute should be upheld or declined.

Rules:
- approve_dispute = merchant is right → hide/remove the review from the public widget (status rejected).
- reject_dispute = merchant is wrong / insufficient evidence → restore the review as live (status approved).
- Prefer approve_dispute when the claim is specific and plausible (fake purchase, abuse, wrong product, clear policy violation) especially with proof images noted.
- Prefer reject_dispute when the claim is vague, retaliatory against a fair negative review, or unsupported.
- confidence is 0–1. If under 0.55, still pick the better decision but keep confidence honest.
- reason must be clear, professional, and suitable to show the store owner (2–4 sentences). No markdown.

Context:
Store: ${review.store?.storeName || 'Unknown'}
Product: ${review.productTitle}
Customer: ${review.customerName}
Verified buyer: ${review.isVerifiedBuyer ? 'yes' : 'no'}
Rating: ${review.rating}/5
Review text: ${JSON.stringify(review.comment || '')}
Merchant dispute reason: ${JSON.stringify(review.disputedReason?.reason || '')}
Proof images attached: ${proofCount}
Dispute strike: ${review.disputeCount || review.disputedReason?.count || 1} / 3

Return JSON only:
{"decision":"approve_dispute"|"reject_dispute","confidence":0.0,"reason":"..."}`;

    const response = await getGeminiClient().models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: prompt,
    });

    let parsed;
    try {
        parsed = parseAiJson(response.text);
    } catch {
        parsed = {
            decision: 'reject_dispute',
            confidence: 0.4,
            reason:
                'Automated analysis could not fully parse the case. The review remains live pending a clearer claim or human review.',
        };
    }

    const decision = parsed.decision === 'approve_dispute' ? 'approve_dispute' : 'reject_dispute';
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5));
    const reason =
        String(parsed.reason || '').trim() ||
        (decision === 'approve_dispute'
            ? 'The dispute appears valid based on the submitted claim.'
            : 'The dispute does not provide enough evidence to remove a live review.');

    // Low confidence → leave in admin queue with AI recommendation stored as pending note
    if (confidence < 0.55) {
        review.disputeResolution = {
            reason: `AI recommendation (${decision}, confidence ${confidence.toFixed(2)}): ${reason}`,
            resolvedBy: 'ai',
            confidence,
            resolvedAt: null,
        };
        await review.save();
        return { review, applied: false, decision, confidence, reason };
    }

    const updated = await applyDisputeDecision(review, {
        decision,
        reason,
        resolvedBy: 'ai',
        confidence,
    });
    return { review: updated, applied: true, decision, confidence, reason };
}

/** Fire-and-forget from dispute filing — never throws to caller. */
async function autoResolveDisputeWithAi(reviewId) {
    try {
        if (!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()) return;
        await runAiDisputeAgent(reviewId);
    } catch (error) {
        console.error('autoResolveDisputeWithAi', error?.message || error);
    }
}

const aiResolveDispute = async (req, res) => {
    try {
        if (!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()) {
            return res.status(503).json({ message: 'AI dispute agent is not configured (missing GEMINI_API_KEY).' });
        }
        const result = await runAiDisputeAgent(req.params.reviewId);
        return res.status(200).json({
            data: result.review,
            applied: result.applied,
            message: result.applied
                ? `AI resolved dispute (${result.decision}).`
                : 'AI confidence was low — recommendation saved; resolve manually or retry.',
        });
    } catch (error) {
        console.error('aiResolveDispute', error);
        const status = error.status || 500;
        return res.status(status).json({ message: error.message || 'AI dispute resolution failed.' });
    }
};

export {
    generateSmartReply,
    chatWithSupportBot,
    escalateChatToHuman,
    pickLeastLoadedSupportAgent,
    autoResolveDisputeWithAi,
    aiResolveDispute,
    applyDisputeDecision,
};
