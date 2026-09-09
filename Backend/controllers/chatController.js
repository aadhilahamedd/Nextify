const ChatSession = require('../models/ChatSession');
const { processMessage } = require('../services/chatService');
const { success, error } = require('../utils/apiResponse');
const crypto = require('crypto');

exports.chat = async (req, res, next) => {
  try {
    const { message, sessionId, context } = req.body;
    if (!message?.trim()) return error(res, 400, 'Message is required');

    const sid = sessionId || crypto.randomUUID();
    let session = await ChatSession.findOne({ sessionId: sid });

    const result = await processMessage(message, context || {});

    if (!session) {
      session = new ChatSession({ sessionId: sid, mode: result.mode, messages: [] });
    }

    session.messages.push({ role: 'user', content: message });
    session.messages.push({ role: 'assistant', content: result.reply });
    await session.save();

    return success(res, 200, 'Chat response', {
      sessionId: sid,
      reply: result.reply,
      mode: result.mode,
    });
  } catch (err) {
    next(err);
  }
};
