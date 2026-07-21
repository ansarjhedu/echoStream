import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateSmartReply = async (req, res) => {
    try {
        const { text, type, customerName, rating } = req.body;
        const storeName = req.store.storeName;

        if (!text) {
            return res.status(400).json({ message: "Text is required to generate a reply." });
        }

        // 🧠 MEMBER 3's DOMAIN: PROMPT ENGINEERING
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

        // Call the Gemini API
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // The fastest, most cost-effective model
            contents: systemPrompt,
        });

        // Extract the text from the AI's response
        const aiReply = response.text;

        return res.status(200).json({
            data: aiReply,
            message: "AI Reply generated successfully"
        });

    } catch (error) {
        console.error("AI Generation Error:", error);
        return res.status(500).json({ message: "Failed to generate AI reply. Please try again." });
    }
};

export { generateSmartReply };