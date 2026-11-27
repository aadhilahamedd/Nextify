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

function customerLivePaymentsEnabled() {
  return String(process.env.MOYASAR_CUSTOMER_LIVE_PAYMENTS_ENABLED || '').trim().toLowerCase() === 'true';
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

function endpointWebhookSecret() {
  const explicit = String(process.env.MOYASAR_WEBHOOK_SECRET || '');
  if (explicit) return explicit;

  const mode = moyasarMode();
  return mode === 'live'
    ? String(process.env.MOYASAR_LIVE_WEBHOOK_SECRET || '')
    : String(process.env.MOYASAR_TEST_WEBHOOK_SECRET || '');
}

function secretMatches(provided, expected) {
  if (!expected || EXAMPLE_WEBHOOK_SECRETS.has(expected)) return false;
  const actual = Buffer.from(String(provided || ''));
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length) return false;
  return crypto.timingSafeEqual(actual, wanted);
}

function webhookSecretConfigured() {
  const expected = endpointWebhookSecret();
  return Boolean(expected) && !EXAMPLE_WEBHOOK_SECRETS.has(expected);
}

function webhookSecretAccepted(provided) {
  return secretMatches(provided, endpointWebhookSecret());
}

function webhookAllowedMode() {
  const raw = process.env.MOYASAR_WEBHOOK_ALLOWED_MODE;
  if (raw === undefined || String(raw).trim() === '') {
    return moyasarMode();
  }
  const mode = String(raw).trim().toLowerCase();
  if (mode !== 'test' && mode !== 'live' && mode !== 'none') {
    throw httpError(500, 'MOYASAR_WEBHOOK_ALLOWED_MODE must be test, live, or none');
  }
  return mode;
}

function evaluateWebhookMode(payload) {
  if (typeof payload?.live !== 'boolean') {
    throw httpError(409, 'Webhook mode is missing or invalid');
  }
  const eventIsLive = payload.live === true;
  const eventMode = eventIsLive ? 'live' : 'test';
  const allowedMode = webhookAllowedMode();

  if (allowedMode === 'none') {
    return {
      allowed: false,
      allowedMode,
      eventMode,
      reason: 'webhook_mode_disabled',
    };
  }

  if ((allowedMode === 'live') !== eventIsLive) {
    return {
      allowed: false,
      allowedMode,
      eventMode,
      reason: 'other_environment',
    };
  }

  return {
    allowed: true,
    allowedMode,
    eventMode,
  };
}

function assertWebhookMode(payload) {
  if (typeof payload?.live !== 'boolean') {
    throw httpError(409, 'Webhook mode is missing or invalid');
  }
  const eventIsLive = payload.live === true;
  const mode = moyasarMode();
  if ((mode === 'live') !== eventIsLive) {
    throw httpError(409, 'Webhook mode does not match MOYASAR_ENV');
  }
}

function assertPaymentMode(moyasarPayment) {
  const { mode } = assertMoyasarCredentials({ force: true });
  if (moyasarPayment?.live === undefined) {
    return;
  }
  if (typeof moyasarPayment.live !== 'boolean') {
    throw httpError(409, 'Moyasar payment mode is invalid');
  }
  const expectLive = mode === 'live';
  if (moyasarPayment.live !== expectLive) {
    throw httpError(409, 'Moyasar payment environment does not match server MOYASAR_ENV');
  }
}

module.exports = {
  assertMoyasarCredentials,
  assertPaymentMode,
  assertWebhookMode,
  customerLivePaymentsEnabled,
  evaluateWebhookMode,
  moyasarMode,
  webhookAllowedMode,
  webhookSecretAccepted,
  webhookSecretConfigured,
};
