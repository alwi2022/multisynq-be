const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const generateContent = require('../config/generate-content');
const buildChatPrompt = require('../config/chat-prompt');
const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/chat', async (req, res) => {
  const { context, system, messages, lang = 'id' } = req.body || {};
  const validContext = context && typeof context === 'object' && !Array.isArray(context) && context.name === 'Imam Bahri Alwi' && typeof context.summary === 'string' && Array.isArray(context.experience) && Array.isArray(context.projects) && JSON.stringify(context).length <= 60000;
  // Accept legacy server-generated prompts while the existing frontend is upgraded.
  const validLegacy = typeof system === 'string' && system.trim() && system.length <= 60000;
  if ((!validContext && !validLegacy) || (lang !== 'id' && lang !== 'en') || !Array.isArray(messages) || !messages.length || messages.length > 20 || messages.some(m => !m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content.trim() || m.content.length > (m.role === 'user' ? 2000 : 8000)) || messages.at(-1)?.role !== 'user') {
    return res.status(400).json({ error: 'Valid portfolio context and messages are required' });
  }
  const controller = new AbortController();
  res.on('close', () => { if (!res.writableEnded) controller.abort(); });
  try {
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
      systemInstruction: buildChatPrompt({ context: validContext ? context : undefined, system, lang }),
    });
    const result = await generateContent(model, {
      contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
    }, undefined, controller.signal);
    const reply = result.response.text().trim();
    if (!reply) return res.status(502).json({ error: 'No answer returned' });
    return res.json({ reply: reply.slice(0, 8000) });
  } catch (error) {
    if (controller.signal.aborted) return;
    console.error('Gemini chat request failed:', error.status || error.name);
    return res.status(error.temporary ? 503 : 502).json({ error: 'AI temporarily unavailable. Please try again.' });
  }
});

module.exports = router;
