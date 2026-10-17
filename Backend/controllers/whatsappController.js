const config = require('../config/whatsappConfig');
const { extractIncomingMessages } = require('../services/whatsapp/whatsappService');
const { handleIncoming } = require('../services/whatsapp/whatsappConversationService');

exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (!config.verificationReady) {
    return res.status(503).send('WhatsApp verify token is not configured');
  }

  if (mode === 'subscribe' && token === config.verifyToken) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
};

exports.receiveWebhook = (req, res) => {
  res.status(200).json({ success: true });

  const messages = extractIncomingMessages(req.body);
  if (!messages.length) return;

  if (process.env.NODE_ENV !== 'production') {
    console.log('[whatsapp] inbound', messages.map((m) => ({ from: m.from, type: m.type, hasText: Boolean(m.text), hasButton: Boolean(m.buttonId) })));
  }

  setImmediate(() => {
    Promise.all(messages.map((message) => handleIncoming(message))).catch((err) => {
      console.error('[whatsapp] inbound handler failed', err.message);
    });
  });
};
