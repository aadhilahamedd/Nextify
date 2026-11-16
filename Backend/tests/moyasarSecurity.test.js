/**
 * Run: node Backend/tests/moyasarSecurity.test.js
 * Unit checks do not print credential values.
 * The HTTP section expects the local API on port 5000.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { classifyVerification } = require('../services/paymentProviders/paymentDecision');
const {
  assertMoyasarCredentials,
  assertWebhookMode,
  webhookSecretAccepted,
} = require('../services/paymentProviders/moyasarConfig');
const { mockPaymentEndpointsEnabled } = require('../services/paymentProviders/mockPaymentGuard');
const { allowedOriginSet } = require('../config/corsOptions');

const saved = {
  MOYASAR_ENV: process.env.MOYASAR_ENV,
  MOYASAR_SECRET_KEY: process.env.MOYASAR_SECRET_KEY,
  MOYASAR_PUBLISHABLE_KEY: process.env.MOYASAR_PUBLISHABLE_KEY,
  MOYASAR_WEBHOOK_SECRET: process.env.MOYASAR_WEBHOOK_SECRET,
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
  NODE_ENV: process.env.NODE_ENV,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function throws(fn) {
  try {
    fn();
    return null;
  } catch (err) {
    return err;
  }
}

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`ok ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.log(`fail ${name} — ${err.message}`);
  }
}

check('test mode accepts matching test prefixes', () => {
  process.env.PAYMENT_PROVIDER = 'moyasar';
  process.env.MOYASAR_ENV = 'test';
  process.env.MOYASAR_SECRET_KEY = 'sk_test_example';
  process.env.MOYASAR_PUBLISHABLE_KEY = 'pk_test_example';
  assert.strictEqual(assertMoyasarCredentials({ force: true }).mode, 'test');
  restoreEnv();
});

check('test mode rejects a live secret', () => {
  process.env.PAYMENT_PROVIDER = 'moyasar';
  process.env.MOYASAR_ENV = 'test';
  process.env.MOYASAR_SECRET_KEY = 'sk_live_example';
  process.env.MOYASAR_PUBLISHABLE_KEY = 'pk_test_example';
  const err = throws(() => assertMoyasarCredentials({ force: true }));
  assert.ok(err);
  assert.strictEqual(err.statusCode, 500);
  assert.ok(!/sk_live_example|pk_test_example/.test(err.message));
  restoreEnv();
});

check('live mode rejects test credentials', () => {
  process.env.PAYMENT_PROVIDER = 'moyasar';
  process.env.MOYASAR_ENV = 'live';
  process.env.MOYASAR_SECRET_KEY = 'sk_test_example';
  process.env.MOYASAR_PUBLISHABLE_KEY = 'pk_test_example';
  const err = throws(() => assertMoyasarCredentials({ force: true }));
  assert.ok(err);
  assert.strictEqual(err.statusCode, 500);
  restoreEnv();
});

check('live mode requires both live prefixes', () => {
  process.env.PAYMENT_PROVIDER = 'moyasar';
  process.env.MOYASAR_ENV = 'live';
  process.env.MOYASAR_SECRET_KEY = 'sk_live_example';
  process.env.MOYASAR_PUBLISHABLE_KEY = 'pk_test_example';
  assert.ok(throws(() => assertMoyasarCredentials({ force: true })));
  process.env.MOYASAR_PUBLISHABLE_KEY = 'pk_live_example';
  assert.strictEqual(assertMoyasarCredentials({ force: true }).mode, 'live');
  restoreEnv();
});

check('missing credentials are rejected', () => {
  process.env.PAYMENT_PROVIDER = 'moyasar';
  process.env.MOYASAR_ENV = 'test';
  process.env.MOYASAR_SECRET_KEY = '';
  process.env.MOYASAR_PUBLISHABLE_KEY = 'pk_test_example';
  const err = throws(() => assertMoyasarCredentials({ force: true }));
  assert.strictEqual(err.statusCode, 503);
  restoreEnv();
});

check('unknown MOYASAR_ENV is rejected', () => {
  process.env.MOYASAR_ENV = 'sandbox';
  process.env.MOYASAR_SECRET_KEY = 'sk_test_example';
  process.env.MOYASAR_PUBLISHABLE_KEY = 'pk_test_example';
  assert.ok(throws(() => assertMoyasarCredentials({ force: true })));
  restoreEnv();
});

check('example webhook secrets are not accepted', () => {
  process.env.MOYASAR_WEBHOOK_SECRET = 'change_me_in_moyasar_dashboard';
  assert.strictEqual(webhookSecretAccepted('change_me_in_moyasar_dashboard'), false);
  process.env.MOYASAR_WEBHOOK_SECRET = '';
  assert.strictEqual(webhookSecretAccepted(''), false);
  restoreEnv();
});

check('webhook token comparison is exact', () => {
  process.env.MOYASAR_WEBHOOK_SECRET = 'local-dashboard-token';
  assert.strictEqual(webhookSecretAccepted('local-dashboard-token'), true);
  assert.strictEqual(webhookSecretAccepted('local-dashboard-token-x'), false);
  assert.strictEqual(webhookSecretAccepted(''), false);
  restoreEnv();
});

check('webhook live flag must match MOYASAR_ENV', () => {
  process.env.MOYASAR_ENV = 'test';
  assert.doesNotThrow(() => assertWebhookMode({ live: false }));
  const err = throws(() => assertWebhookMode({ live: true }));
  assert.strictEqual(err.statusCode, 409);
  restoreEnv();
});

check('mock endpoints stay off for Moyasar and production', () => {
  process.env.NODE_ENV = 'development';
  process.env.MOYASAR_ENV = 'test';
  process.env.PAYMENT_PROVIDER = 'moyasar';
  assert.strictEqual(mockPaymentEndpointsEnabled(), false);
  process.env.PAYMENT_PROVIDER = 'mock';
  assert.strictEqual(mockPaymentEndpointsEnabled(), true);
  process.env.NODE_ENV = 'production';
  assert.strictEqual(mockPaymentEndpointsEnabled(), false);
  process.env.NODE_ENV = 'development';
  process.env.MOYASAR_ENV = 'live';
  process.env.PAYMENT_PROVIDER = 'mock';
  assert.strictEqual(mockPaymentEndpointsEnabled(), false);
  restoreEnv();
});

check('cors allowlist keeps local and production origins', () => {
  const origins = allowedOriginSet();
  assert.ok(origins.has('http://localhost:5173'));
  assert.ok(origins.has('http://127.0.0.1:5173'));
  assert.ok(origins.has('https://www.nextifylimo.com'));
  assert.ok(origins.has('https://nextifylimo.com'));
  assert.ok(!origins.has('https://evil.example'));
  assert.ok(!origins.has('http://localhost:3000'));
});

check('paid booking is not confirmed again by a second Moyasar id', () => {
  const decision = classifyVerification({
    localStatus: 'PAID',
    localReference: 'pay_first',
    incomingId: 'pay_second',
    mappedStatus: 'PAID',
    bookingAlreadyPaid: true,
  });
  assert.strictEqual(decision.action, 'duplicate_charge');
  assert.strictEqual(decision.confirmBooking, false);
  assert.strictEqual(decision.manualInterventionRequired, true);
});

check('same paid id verifies idempotently', () => {
  const decision = classifyVerification({
    localStatus: 'PAID',
    localReference: 'pay_first',
    incomingId: 'pay_first',
    mappedStatus: 'PAID',
    bookingAlreadyPaid: true,
  });
  assert.strictEqual(decision.action, 'idempotent_paid');
  assert.strictEqual(decision.confirmBooking, false);
});

check('failure does not unpay a paid booking', () => {
  const decision = classifyVerification({
    localStatus: 'PAID',
    localReference: 'pay_first',
    incomingId: 'pay_first',
    mappedStatus: 'FAILED',
    bookingAlreadyPaid: true,
  });
  assert.strictEqual(decision.action, 'ignore_unpay');
});

check('cancellation does not unpay a paid booking', () => {
  const decision = classifyVerification({
    localStatus: 'PAID',
    localReference: 'pay_first',
    incomingId: 'pay_second',
    mappedStatus: 'CANCELLED',
    bookingAlreadyPaid: true,
  });
  assert.strictEqual(decision.action, 'ignore_unpay');
});

check('first successful charge can confirm', () => {
  const decision = classifyVerification({
    localStatus: 'PENDING',
    localReference: '',
    incomingId: 'pay_first',
    mappedStatus: 'PAID',
    bookingAlreadyPaid: false,
  });
  assert.strictEqual(decision.action, 'mark_paid');
  assert.strictEqual(decision.confirmBooking, true);
});

check('failed and cancelled charges are recorded only before payment', () => {
  assert.strictEqual(classifyVerification({
    localStatus: 'PENDING',
    localReference: '',
    incomingId: 'pay_failed',
    mappedStatus: 'FAILED',
    bookingAlreadyPaid: false,
  }).action, 'mark_failed');
  assert.strictEqual(classifyVerification({
    localStatus: 'PENDING',
    localReference: '',
    incomingId: 'pay_cancelled',
    mappedStatus: 'CANCELLED',
    bookingAlreadyPaid: false,
  }).action, 'mark_cancelled');
});

check('secret key logging was removed', () => {
  const source = fs.readFileSync(path.join(__dirname, '../services/paymentProviders/moyasarClient.js'), 'utf8');
  assert.ok(!source.includes('Key prefix'));
  assert.ok(!source.includes('Key suffix'));
  assert.ok(!source.includes('Key length'));
  assert.ok(!source.includes('MOYASAR KEY DEBUG'));
});

check('checkout switch is Moyasar for the production source', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../Front-end/Nextify/src/utils/paymentMode.js'), 'utf8');
  assert.ok(source.includes('TEMP_WHATSAPP_BOOKING_INSTEAD_OF_MOYASAR = false'));
});

check('env example has an empty secret placeholder and production env is ignored', () => {
  const example = fs.readFileSync(path.join(__dirname, '../.env.example'), 'utf8');
  assert.ok(example.includes('MOYASAR_SECRET_KEY='));
  assert.ok(!/MOYASAR_SECRET_KEY=sk_/.test(example));
  const gitignore = fs.readFileSync(path.join(__dirname, '../../.gitignore'), 'utf8');
  assert.ok(gitignore.includes('.env.production'));
});

async function httpChecks() {
  const base = 'http://localhost:5000';
  const bookRes = await fetch(`${base}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    body: JSON.stringify({
      serviceType: 'airport_transfer',
      vehicleCategory: 'ford_taurus',
      vehicleName: 'Ford Taurus',
      quotedPrice: 1,
      totalAmount: 1,
      airport: 'King Khalid International Airport',
      origin: 'King Khalid International Airport',
      destination: 'Olaya',
      pickupPlace: { id: 'riyadh-airport', iata: 'RUH', nameEn: 'King Khalid International Airport', cityEn: 'Riyadh', kind: 'airport' },
      dropoffPlace: { id: 'olaya', nameEn: 'Olaya', cityEn: 'Riyadh', pricingCity: 'Riyadh', kind: 'neighbourhood' },
      travelDate: '2026-12-20',
      travelTime: '15:00',
      customer: { name: 'Security Test', email: 'security-pay-test@example.com', mobile: '0555992937' },
    }),
  });
  const bookJson = await bookRes.json();
  const booking = bookJson?.data?.booking;
  assert.strictEqual(bookRes.status, 201, bookJson.message || 'booking failed');
  assert.strictEqual(booking.pricing.totalAmount, 180);
  assert.notStrictEqual(booking.pricing.totalAmount, 1);

  const payRes = await fetch(`${base}/api/payments/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    body: JSON.stringify({ bookingId: booking._id }),
  });
  const payJson = await payRes.json();
  const raw = JSON.stringify(payJson);
  assert.ok(payRes.status === 200 || payRes.status === 201, payJson.message || 'payment create failed');
  assert.strictEqual(payJson.data.checkout.provider, 'moyasar');
  assert.strictEqual(payJson.data.checkout.amountHalalas, 18000);
  assert.ok(String(payJson.data.checkout.publishableKey).startsWith('pk_test_'));
  assert.ok(!raw.includes('sk_test_'));
  assert.ok(!raw.includes('sk_live_'));
  assert.strictEqual(payJson.data.checkout.callbackUrl, 'http://localhost:5173/payment-result');

  const corsRes = await fetch(`${base}/api/cars`, { headers: { Origin: 'https://evil.example' } });
  assert.notStrictEqual(corsRes.headers.get('access-control-allow-origin'), 'https://evil.example');
  const localCors = await fetch(`${base}/api/cars`, { headers: { Origin: 'http://localhost:5173' } });
  assert.strictEqual(localCors.headers.get('access-control-allow-origin'), 'http://localhost:5173');

  const mockRes = await fetch(`${base}/api/payments/mock/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId: payJson.data.payment._id }),
  });
  assert.strictEqual(mockRes.status, 404);

  const badHook = await fetch(`${base}/api/payments/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret_token: 'not-the-token', type: 'payment_paid', data: { id: 'pay_fake' } }),
  });
  assert.strictEqual(badHook.status, 401);

  const exampleHook = await fetch(`${base}/api/payment/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret_token: 'change_me_in_moyasar_dashboard', type: 'payment_paid', data: { id: 'pay_fake' } }),
  });
  assert.strictEqual(exampleHook.status, 401);

  const configured = process.env.MOYASAR_WEBHOOK_SECRET;
  const modeHook = await fetch(`${base}/api/payments/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret_token: configured, type: 'payment_paid', live: true, data: { id: 'pay_fake' } }),
  });
  assert.strictEqual(modeHook.status, 409);

  const verifyRes = await fetch(`${base}/api/payments/verify/pay_does_not_exist`);
  const verifyJson = await verifyRes.json();
  assert.ok(verifyRes.status >= 400);
  assert.notStrictEqual(verifyJson?.data?.booking?.paymentStatus, 'PAID');
  const rawVerify = JSON.stringify(verifyJson);
  assert.ok(!rawVerify.includes('sk_test_'));
  assert.ok(!rawVerify.includes('sk_live_'));

  console.log('ok http payment creation stays on the server amount and test publishable key');
}

(async () => {
  restoreEnv();
  try {
    await httpChecks();
    results.push({ name: 'http payment flow', ok: true });
  } catch (err) {
    results.push({ name: 'http payment flow', ok: false, error: err.message });
    console.log(`fail http payment flow — ${err.message}`);
  }
  const failed = results.filter((item) => !item.ok);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  process.exit(failed.length ? 1 : 0);
})();
