const crypto = require('crypto');
const ChatSession = require('../models/ChatSession');
const { processMessage } = require('../services/chatService');
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
        mode: 'faq',
        messages: [],
      });
    }

    let replyPayload;
    try {
      replyPayload = await processMessage(message.trim());
    } catch (chatErr) {
      console.error('Chat Error:', chatErr.message);
      return error(res, 502, 'The assistant is temporarily unavailable. Please try again or contact Nextify on WhatsApp.');
    }

    const reply = replyPayload?.reply;
    const mode = replyPayload?.mode || 'faq';

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
    session.mode = mode;

    await session.save();

    return success(res, 200, 'Chat response', {
      sessionId: sid,
      reply,
      mode,
    });
  } catch (err) {
    console.error('Chat Controller Error:', err.message);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors || {}).map((e) => e.message);
      return error(res, 400, 'Validation failed', errors);
    }
    return error(res, 500, 'Unable to process chat right now. Please try again shortly.');
  }
};
