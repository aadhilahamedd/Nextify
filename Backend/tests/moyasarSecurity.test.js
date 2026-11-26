/**
 * Run: node Backend/tests/moyasarSecurity.test.js
 * Unit checks do not print credential values.
 * The HTTP section runs against an isolated in-process Express server on an ephemeral port
 * with in-memory model stubs and mocked Moyasar API responses (no MongoDB or external calls).
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

check('duplicate failed and cancelled charges are classified as idempotent', () => {
  assert.strictEqual(classifyVerification({
    localStatus: 'FAILED',
    localReference: 'pay_failed',
    incomingId: 'pay_failed',
    mappedStatus: 'FAILED',
    bookingAlreadyPaid: false,
  }).action, 'idempotent_failed');
  assert.strictEqual(classifyVerification({
    localStatus: 'CANCELLED',
    localReference: 'pay_cancelled',
    incomingId: 'pay_cancelled',
    mappedStatus: 'CANCELLED',
    bookingAlreadyPaid: false,
  }).action, 'idempotent_cancelled');
});

check('secret key logging was removed', () => {
  const source = fs.readFileSync(path.join(__dirname, '../services/paymentProviders/moyasarClient.js'), 'utf8');
  assert.ok(!source.includes('Key prefix'));
  assert.ok(!source.includes('Key suffix'));
  assert.ok(!source.includes('Key length'));
  assert.ok(!source.includes('MOYASAR KEY DEBUG'));
});

check('checkout switch defaults fail-closed to WhatsApp booking assistance and blocks TEST on production', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../Front-end/Nextify/src/utils/paymentMode.js'), 'utf8');
  assert.ok(source.includes('resolveCheckoutConfig'));
  assert.ok(source.includes('production_blocks_test_mode'));
  assert.ok(source.includes('TEMP_WHATSAPP_BOOKING_INSTEAD_OF_MOYASAR = CHECKOUT_CONFIG.useWhatsAppFallback'));
});

check('env example has an empty secret placeholder and production env is ignored', () => {
  const example = fs.readFileSync(path.join(__dirname, '../.env.example'), 'utf8');
  assert.ok(example.includes('MOYASAR_SECRET_KEY='));
  assert.ok(!/MOYASAR_SECRET_KEY=sk_/.test(example));
  const gitignore = fs.readFileSync(path.join(__dirname, '../../.gitignore'), 'utf8');
  assert.ok(gitignore.includes('.env.production'));
});

async function httpChecks() {
  const mongoose = require('mongoose');
  const Booking = require('../models/Booking');
  const Payment = require('../models/Payment');
  const Car = require('../models/Car');
  const { NextifyServer } = require('../index');

  assert.strictEqual(mongoose.connection.readyState, 0, 'Test must not connect to shared MongoDB');

  const bookings = new Map();
  const payments = new Map();
  const stubCars = [
    { id: 1, name: 'Ford Taurus', img: '/images/car/ford-taurus.webp', price: '180 SAR' },
  ];

  const origBookingFindOne = Booking.findOne;
  const origBookingFindById = Booking.findById;
  const origBookingFindOneAndUpdate = Booking.findOneAndUpdate;
  const origBookingSave = Booking.prototype.save;
  const origPaymentFindOne = Payment.findOne;
  const origPaymentCreate = Payment.create;
  const origCarFind = Car.find;
  const origCarDeleteMany = Car.deleteMany;
  const origCarInsertMany = Car.insertMany;
  const origFetch = global.fetch;

  let server = null;
  let moyasarMockHits = 0;

  try {
    Booking.findOne = async (query = {}) => {
      if (query.bookingNumber) {
        for (const doc of bookings.values()) {
          if (doc.bookingNumber === query.bookingNumber) return doc;
        }
      }
      return null;
    };

    Booking.findById = (id) => {
      const doc = bookings.get(String(id)) || null;
      return {
        select() {
          return {
            lean: async () => doc,
            then(resolve, reject) {
              return Promise.resolve(doc).then(resolve, reject);
            },
          };
        },
        then(resolve, reject) {
          return Promise.resolve(doc).then(resolve, reject);
        },
      };
    };

    Booking.prototype.save = async function saveStub() {
      const now = new Date();
      if (!this.createdAt) this.createdAt = now;
      this.updatedAt = now;
      bookings.set(String(this._id), this);
      return this;
    };

    Booking.findOneAndUpdate = async (filter, update) => {
      const doc = bookings.get(String(filter._id)) || null;
      if (!doc) return null;
      if (filter.paymentStatus?.$nin?.includes(doc.paymentStatus)) return null;
      if (update?.$set) Object.assign(doc, update.$set);
      doc.updatedAt = new Date();
      return doc;
    };

    Payment.findOne = (query = {}) => {
      const match = () => {
        const list = Array.from(payments.values()).filter((p) => {
          if (query.booking && String(p.booking) !== String(query.booking)) return false;
          if (query.status && p.status !== query.status) return false;
          if (query.$or) {
            const ref = p.providerReference;
            const emptyRef = ref === '' || ref === null || ref === undefined;
            if (!emptyRef) return false;
          }
          return true;
        });
        list.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
        return list[0] || null;
      };
      const result = match();
      return {
        sort() {
          return this;
        },
        then(resolve, reject) {
          return Promise.resolve(result).then(resolve, reject);
        },
      };
    };

    Payment.create = async (doc) => {
      const now = new Date();
      const created = {
        _id: new mongoose.Types.ObjectId(),
        providerReference: '',
        ...doc,
        createdAt: now,
        updatedAt: now,
        toObject() {
          return { ...this };
        },
      };
      payments.set(String(created._id), created);
      return created;
    };

    Car.find = () => ({
      sort() {
        return Promise.resolve(stubCars);
      },
      then(resolve, reject) {
        return Promise.resolve(stubCars).then(resolve, reject);
      },
    });
    Car.deleteMany = async () => ({ deletedCount: 0 });
    Car.insertMany = async () => stubCars;

    server = await new Promise((resolve, reject) => {
      const s = NextifyServer.listen(0, '127.0.0.1', () => resolve(s));
      s.on('error', reject);
    });
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;

    global.fetch = async (url, options) => {
      const target = String(url);
      if (target.startsWith('https://api.moyasar.com/v1/payments/')) {
        moyasarMockHits += 1;
        return {
          ok: false,
          status: 404,
          json: async () => ({
            type: 'invalid_request_error',
            message: 'Payment not found',
          }),
        };
      }
      if (target.startsWith(base)) {
        return origFetch(url, options);
      }
      throw new Error(`Blocked unexpected outbound fetch in isolated test: ${target}`);
    };

    const bookRes = await fetch(`${base}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
      body: JSON.stringify({
        serviceType: 'airport_transfer',
        vehicleCategory: 'ford_taurus',
        vehicleName: 'Ford Taurus',
        quotedPrice: 1,
        totalAmount: 1,
        airport: 'King Abdulaziz International Airport',
        origin: 'King Abdulaziz International Airport',
        destination: 'Makkah',
        pickupPlace: { id: 'jeddah-airport', iata: 'JED', nameEn: 'King Abdulaziz International Airport', cityEn: 'Jeddah', kind: 'airport' },
        dropoffPlace: { id: 'mecca', nameEn: 'Makkah', cityEn: 'Makkah', kind: 'place' },
        travelDate: '2026-12-20',
        travelTime: '15:00',
        customer: { name: 'Security Test', email: 'security-pay-test@example.com', mobile: '0555992937' },
      }),
    });
    const bookJson = await bookRes.json();
    const booking = bookJson?.data?.booking;
    const checkoutToken = bookJson?.data?.checkoutToken;
    assert.strictEqual(bookRes.status, 201, bookJson.message || 'booking failed');
    assert.ok(typeof checkoutToken === 'string' && checkoutToken.length >= 43, 'checkoutToken must be issued');
    assert.strictEqual(booking.pricing.totalAmount, 600);
    assert.notStrictEqual(booking.pricing.totalAmount, 1);

    // OPTIONS preflight for /api/payments/create must allow X-Checkout-Token
    const preflightRes = await fetch(`${base}/api/payments/create`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, X-Checkout-Token',
      },
    });
    assert.strictEqual(preflightRes.status, 204);
    assert.strictEqual(preflightRes.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    const allowedHeaders = String(preflightRes.headers.get('access-control-allow-headers') || '').toLowerCase();
    assert.ok(allowedHeaders.includes('x-checkout-token'), 'CORS preflight must allow X-Checkout-Token');

    // POST /api/payments/create without X-Checkout-Token must return 403 and create/reuse no payment
    const unauthPayRes = await fetch(`${base}/api/payments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5173',
      },
      body: JSON.stringify({ bookingId: booking._id }),
    });
    const unauthPayJson = await unauthPayRes.json();
    assert.strictEqual(unauthPayRes.status, 403);
    assert.strictEqual(unauthPayJson.success, false);
    assert.strictEqual(unauthPayJson.data?.payment, undefined);
    assert.strictEqual(payments.size, 0, 'unauthorized POST /api/payments/create must not create or reuse a payment');

    const payRes = await fetch(`${base}/api/payments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5173',
        'X-Checkout-Token': checkoutToken,
      },
      body: JSON.stringify({ bookingId: booking._id }),
    });
    const payJson = await payRes.json();
    const raw = JSON.stringify(payJson);
    assert.ok(payRes.status === 200 || payRes.status === 201, payJson.message || 'payment create failed');
    assert.strictEqual(payJson.data.checkout.provider, 'moyasar');
    assert.strictEqual(payJson.data.checkout.amountHalalas, 60000);
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
    assert.strictEqual(moyasarMockHits, 1, 'verify must hit mocked Moyasar endpoint once');
    assert.notStrictEqual(verifyJson?.data?.booking?.paymentStatus, 'PAID');
    const rawVerify = JSON.stringify(verifyJson);
    assert.ok(!rawVerify.includes('sk_test_'));
    assert.ok(!rawVerify.includes('sk_live_'));
    assert.strictEqual(mongoose.connection.readyState, 0, 'Test must remain disconnected from MongoDB');

    console.log('ok http payment creation stays on the server amount and test publishable key');
  } finally {
    global.fetch = origFetch;
    Booking.findOne = origBookingFindOne;
    Booking.findById = origBookingFindById;
    Booking.findOneAndUpdate = origBookingFindOneAndUpdate;
    Booking.prototype.save = origBookingSave;
    Payment.findOne = origPaymentFindOne;
    Payment.create = origPaymentCreate;
    Car.find = origCarFind;
    Car.deleteMany = origCarDeleteMany;
    Car.insertMany = origCarInsertMany;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
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
