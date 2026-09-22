const crypto = require('crypto');
const ChatSession = require('../models/ChatSession');
const { generateAIReply } = require('../services/aiChatService');
const { success, error } = require('../utils/apiResponse');

exports.chat = async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message?.trim()) {
      return error(res, 400, 'Message is required');
    }

    const sid = sessionId || crypto.randomUUID();
    let session = await ChatSession.findOne({ sessionId: sid });

    if (!session) {
      session = new ChatSession({
        sessionId: sid,
        mode: 'ai',
        messages: [],
      });
    }

    const conversation = (session.messages || []).map((item) => ({
      role: item.role,
      content: item.content,
    }));

    let reply;
    try {
      reply = await generateAIReply(message.trim(), conversation);
    } catch (aiErr) {
      console.error('AI Chat Error:', aiErr);
      const quotaError = aiErr?.code === 'credit_balance_exhausted' || aiErr?.type === 'insufficient_quota' || aiErr?.status === 429;
      if (quotaError) {
        return error(res, 502, 'The assistant is temporarily unavailable. Please try again or contact Nextify on WhatsApp.');
      }
      return error(res, 502, 'The assistant is temporarily unavailable. Please try again or contact Nextify on WhatsApp.');
    }

    if (!reply || typeof reply !== 'string') {
      return error(res, 502, 'The assistant is temporarily unavailable. Please try again or contact Nextify on WhatsApp.');
    }

    session.messages.push({
      role: 'user',
      content: message.trim(),
    });
    session.messages.push({
      role: 'assistant',
      content: reply,
    });
    session.mode = 'ai';

    await session.save();

    return success(res, 200, 'Chat response', {
      sessionId: sid,
      reply,
      mode: 'ai',
    });
  } catch (err) {
    console.error('Chat Controller Error:', err);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors || {}).map((e) => e.message);
      return error(res, 400, 'Validation failed', errors);
    }
    return error(res, 500, 'Unable to process chat right now. Please try again shortly.');
  }
};
