const crypto = require('crypto');
const config = require('../config/whatsappConfig');

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

/**
 * Meta Cloud API: X-Hub-Signature-256 = sha256=<hmac_hex(raw_body, app_secret)>
 */
function verifyWhatsAppSignature(req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!config.signatureReady) {
    // Fail closed in production when WhatsApp outbound is configured but app secret is missing.
    if (isProduction && config.configured) {
      console.error('[whatsapp] WHATSAPP_APP_SECRET missing while WhatsApp is configured — refusing webhook');
      return res.sendStatus(503);
    }
    // Local/dev (or production without WhatsApp credentials): skip signature check.
    return next();
  }

  const header = String(req.get('X-Hub-Signature-256') || '');
  const match = /^sha256=([a-f0-9]+)$/i.exec(header);
  if (!match) {
    return res.sendStatus(403);
  }

  const rawBody = req.rawBody;
  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    console.error('[whatsapp] missing rawBody for signature verification');
    return res.sendStatus(403);
  }

  const expected = crypto
    .createHmac('sha256', config.appSecret)
    .update(rawBody)
    .digest('hex');

  if (!timingSafeEqualString(match[1].toLowerCase(), expected.toLowerCase())) {
    return res.sendStatus(403);
  }

  return next();
}

module.exports = {
  verifyWhatsAppSignature,
  timingSafeEqualString,
};
