const crypto = require('crypto');

const EXAMPLE_WEBHOOK_SECRETS = new Set([
  'change_me_in_moyasar_dashboard',
  'your_dashboard_webhook_secret',
]);

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function moyasarMode() {
  const mode = String(process.env.MOYASAR_ENV || 'test').trim().toLowerCase();
  if (mode !== 'test' && mode !== 'live') {
    throw httpError(500, 'MOYASAR_ENV must be test or live');
  }
  return mode;
}

function assertMoyasarCredentials({ force = false } = {}) {
  if (!force && (process.env.PAYMENT_PROVIDER || 'mock') !== 'moyasar') {
    return { skipped: true };
  }

  const mode = moyasarMode();
  const secret = process.env.MOYASAR_SECRET_KEY || '';
  const publishable = process.env.MOYASAR_PUBLISHABLE_KEY || '';
  if (!secret || !publishable) {
    throw httpError(503, 'Moyasar credentials are missing. Set MOYASAR_SECRET_KEY and MOYASAR_PUBLISHABLE_KEY on the server.');
  }

  const tier = mode === 'live' ? 'live' : 'test';
  const secretOk = secret.startsWith(`sk_${tier}_`);
  const publishableOk = publishable.startsWith(`pk_${tier}_`);
  if (!secretOk || !publishableOk) {
    throw httpError(500, `Moyasar ${mode} mode requires a matching sk_${tier}_ secret key and pk_${tier}_ publishable key.`);
  }

  return { mode };
}

function webhookSecretConfigured() {
  const expected = String(process.env.MOYASAR_WEBHOOK_SECRET || '');
  return Boolean(expected) && !EXAMPLE_WEBHOOK_SECRETS.has(expected);
}

function webhookSecretAccepted(provided) {
  if (!webhookSecretConfigured()) return false;
  const expected = String(process.env.MOYASAR_WEBHOOK_SECRET);
  const actual = Buffer.from(String(provided || ''));
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length) return false;
  return crypto.timingSafeEqual(actual, wanted);
}

function assertWebhookMode(payload) {
  if (typeof payload?.live !== 'boolean') return;
  const eventIsLive = payload.live === true;
  const mode = moyasarMode();
  if ((mode === 'live') !== eventIsLive) {
    throw httpError(409, 'Webhook mode does not match MOYASAR_ENV');
  }
}

module.exports = {
  assertMoyasarCredentials,
  assertWebhookMode,
  moyasarMode,
  webhookSecretAccepted,
  webhookSecretConfigured,
};
