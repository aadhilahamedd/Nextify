/**
 * Admin-Only 1 SAR LIVE Payment Test & Customer LIVE Checkout Feature Flag Tests
 * Run: node Backend/tests/adminLivePaymentTest.test.js
 * Uses isolated in-memory model stubs and mocked Moyasar API responses (no live MongoDB or external calls).
 */
const assert = require('assert');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const WhatsAppSession = require('../models/WhatsAppSession');
const jwtMiddleware = require('../middleware/jwtMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const paymentController = require('../controllers/paymentController');
const bookingController = require('../controllers/bookingController');
const moyasarProvider = require('../services/paymentProviders/moyasarPaymentProvider');
const { getJwtSecret } = require('../utils/jwtSecret');

const results = [];

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function runMiddlewareChain(middlewares, req, res) {
  let idx = 0;
  let passed = false;
  let capturedErr = null;
  let pendingPromise = Promise.resolve();

  function next(err) {
    if (err) {
      capturedErr = err;
      return Promise.resolve();
    }
    const fn = middlewares[idx++];
    if (!fn) {
      passed = true;
      return Promise.resolve();
    }
    const stepPromise = Promise.resolve().then(() => fn(req, res, next));
    pendingPromise = pendingPromise.then(() => stepPromise);
    return stepPromise;
  }

  await next();
  // Drain any chained async middleware (e.g. sync jwtMiddleware calling async adminMiddleware)
  let prev = null;
  while (prev !== pendingPromise) {
    prev = pendingPromise;
    await prev;
  }
  return { passed, err: capturedErr };
}

async function check(name, fn) {
  const origEnv = {
    PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
    MOYASAR_ENV: process.env.MOYASAR_ENV,
    MOYASAR_SECRET_KEY: process.env.MOYASAR_SECRET_KEY,
    MOYASAR_PUBLISHABLE_KEY: process.env.MOYASAR_PUBLISHABLE_KEY,
    MOYASAR_WEBHOOK_SECRET: process.env.MOYASAR_WEBHOOK_SECRET,
    MOYASAR_WEBHOOK_ALLOWED_MODE: process.env.MOYASAR_WEBHOOK_ALLOWED_MODE,
    MOYASAR_CUSTOMER_LIVE_PAYMENTS_ENABLED: process.env.MOYASAR_CUSTOMER_LIVE_PAYMENTS_ENABLED,
  };
  const origFetch = global.fetch;
  const origUserFindById = User.findById;
  const origBookingFind = Booking.find;
  const origBookingFindOne = Booking.findOne;
  const origBookingFindById = Booking.findById;
  const origBookingFindOneAndUpdate = Booking.findOneAndUpdate;
  const origBookingSave = Booking.prototype.save;
  const origPaymentFindOne = Payment.findOne;
  const origPaymentFindById = Payment.findById;
  const origPaymentFindOneAndUpdate = Payment.findOneAndUpdate;
  const origPaymentCreate = Payment.create;
  const origWaFindOne = WhatsAppSession.findOne;

  try {
    moyasarProvider._setAllowOfflineUnitTestTransactions(true);
    await fn();
    results.push({ name, ok: true });
    console.log(`ok ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.log(`fail ${name} — ${err.message}`);
  } finally {
    moyasarProvider._setAllowOfflineUnitTestTransactions(false);
    for (const [k, v] of Object.entries(origEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    global.fetch = origFetch;
    User.findById = origUserFindById;
    Booking.find = origBookingFind;
    Booking.findOne = origBookingFindOne;
    Booking.findById = origBookingFindById;
    Booking.findOneAndUpdate = origBookingFindOneAndUpdate;
    Booking.prototype.save = origBookingSave;
    Payment.findOne = origPaymentFindOne;
    Payment.findById = origPaymentFindById;
    Payment.findOneAndUpdate = origPaymentFindOneAndUpdate;
    Payment.create = origPaymentCreate;
    WhatsAppSession.findOne = origWaFindOne;
  }
}

function setLiveMoyasarEnv({ customerEnabled = false } = {}) {
  process.env.PAYMENT_PROVIDER = 'moyasar';
  process.env.MOYASAR_ENV = 'live';
  process.env.MOYASAR_SECRET_KEY = 'sk_live_unit_test_secret';
  process.env.MOYASAR_PUBLISHABLE_KEY = 'pk_live_unit_test_pub';
  process.env.MOYASAR_WEBHOOK_SECRET = 'whsec_live_unit_test';
  process.env.MOYASAR_WEBHOOK_ALLOWED_MODE = 'live';
  if (customerEnabled) {
    process.env.MOYASAR_CUSTOMER_LIVE_PAYMENTS_ENABLED = 'true';
  } else {
    delete process.env.MOYASAR_CUSTOMER_LIVE_PAYMENTS_ENABLED;
  }
}

function makeQueryMock(value) {
  return {
    sort() { return this; },
    select() { return this; },
    populate() { return this; },
    lean: async () => value,
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
}

async function run() {
  const ADMIN_ID = new mongoose.Types.ObjectId().toString();
  const CUSTOMER_ID = new mongoose.Types.ObjectId().toString();

  await check('1. Unauthenticated and non-admin requests are rejected (401/403) before reaching admin test controller', async () => {
    setLiveMoyasarEnv({ customerEnabled: false });

    // No token -> 401
    const unauthRes = makeRes();
    const unauthRun = await runMiddlewareChain(
      [jwtMiddleware, adminMiddleware],
      { headers: {} },
      unauthRes
    );
    assert.strictEqual(unauthRun.passed, false);
    assert.strictEqual(unauthRes.statusCode, 401);

    // Non-admin customer JWT -> 403
    const customerToken = jwt.sign({ userId: CUSTOMER_ID, role: 'user' }, getJwtSecret());
    User.findById = () => makeQueryMock({ _id: CUSTOMER_ID, role: 'user' });
    const customerRes = makeRes();
    const customerRun = await runMiddlewareChain(
      [jwtMiddleware, adminMiddleware],
      { headers: { authorization: `Bearer ${customerToken}` } },
      customerRes
    );
    assert.strictEqual(customerRun.passed, false);
    assert.strictEqual(customerRes.statusCode, 403);

    // Forged JWT claiming role: admin when DB user is role: user -> 403
    const forgedToken = jwt.sign({ userId: CUSTOMER_ID, role: 'admin' }, getJwtSecret());
    const forgedRes = makeRes();
    const forgedRun = await runMiddlewareChain(
      [jwtMiddleware, adminMiddleware],
      { headers: { authorization: `Bearer ${forgedToken}` } },
      forgedRes
    );
    assert.strictEqual(forgedRun.passed, false);
    assert.strictEqual(forgedRes.statusCode, 403);
  });

  await check('2. Customer LIVE checkout is blocked (503) when MOYASAR_CUSTOMER_LIVE_PAYMENTS_ENABLED is false/unset', async () => {
    setLiveMoyasarEnv({ customerEnabled: false });
    let paymentCreated = false;
    Payment.create = async () => { paymentCreated = true; throw new Error('must not create payment'); };

    const res = makeRes();
    await paymentController.createPayment(
      { body: { bookingId: new mongoose.Types.ObjectId().toString(), expectedMode: 'live' } },
      res,
      (err) => { if (err) throw err; }
    );
    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(paymentCreated, false);
  });

  await check('3. Admin can start fixed 1 SAR LIVE test even when customer LIVE checkout is disabled; client amount tampering is ignored', async () => {
    setLiveMoyasarEnv({ customerEnabled: false });

    const savedBookings = [];
    const savedPayments = [];

    User.findById = () => makeQueryMock({ _id: ADMIN_ID, role: 'admin' });
    Booking.findOne = () => makeQueryMock(null);
    Booking.prototype.save = async function saveStub() {
      const now = new Date();
      if (!this.createdAt) this.createdAt = now;
      this.updatedAt = now;
      savedBookings.push(this);
      return this;
    };
    Booking.findById = (id) => makeQueryMock(savedBookings.find((b) => String(b._id) === String(id)) || null);
    Booking.findOneAndUpdate = async (filter, update) => {
      const doc = savedBookings.find((b) => String(b._id) === String(filter._id)) || null;
      if (!doc) return null;
      if (update?.$set) Object.assign(doc, update.$set);
      return doc;
    };
    Payment.findOne = () => makeQueryMock(null);
    Payment.create = async (doc) => {
      const created = {
        _id: new mongoose.Types.ObjectId(),
        providerReference: '',
        ...doc,
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject() { return { ...this }; },
      };
      savedPayments.push(created);
      return created;
    };

    const adminToken = jwt.sign({ userId: ADMIN_ID, role: 'admin' }, getJwtSecret());
    const req = {
      headers: { authorization: `Bearer ${adminToken}` },
      // Attempt to tamper with amount, currency, mode, and provider — must be completely ignored
      body: { amount: 9999, totalAmount: 500, currency: 'USD', mode: 'test', provider: 'mock' },
    };
    const res = makeRes();

    const chain = await runMiddlewareChain(
      [jwtMiddleware, adminMiddleware, paymentController.createAdminLivePaymentTest],
      req,
      res
    );
    assert.strictEqual(chain.err, null);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.reused, false);
    assert.strictEqual(res.body.data.booking.isInternalPaymentTest, true);
    assert.ok(String(res.body.data.booking.bookingNumber).startsWith('NXT-TEST-'));
    assert.strictEqual(res.body.data.payment.amount, 1);
    assert.strictEqual(res.body.data.payment.currency, 'SAR');
    assert.strictEqual(res.body.data.payment.status, 'PENDING');
    assert.strictEqual(res.body.data.checkout.provider, 'moyasar');
    assert.strictEqual(res.body.data.checkout.mode, 'live');
    assert.strictEqual(res.body.data.checkout.amount, 1);
    assert.strictEqual(res.body.data.checkout.amountHalalas, 100);
    assert.strictEqual(res.body.data.checkout.publishableKey, 'pk_live_unit_test_pub');

    const serialized = JSON.stringify(res.body);
    assert.ok(!serialized.includes('sk_live_'), 'Must never leak Moyasar secret key');
    assert.ok(!serialized.includes('whsec_'), 'Must never leak webhook secret');
    assert.strictEqual(savedBookings.length, 1);
    assert.strictEqual(savedPayments.length, 1);
    assert.strictEqual(savedBookings[0].customer.name, 'ADMIN PAYMENT TEST');
  });

  await check('4. Duplicate and concurrent admin 1 SAR test requests reuse active PENDING test without creating extra charges', async () => {
    setLiveMoyasarEnv({ customerEnabled: false });

    const savedBookings = [];
    const savedPayments = [];

    Booking.findOne = (query) => {
      const match = savedBookings.find(
        (b) => (!query.isInternalPaymentTest || b.isInternalPaymentTest === true)
          && (!query.paymentStatus || b.paymentStatus === query.paymentStatus)
      ) || null;
      return makeQueryMock(match);
    };
    Booking.prototype.save = async function saveStub() {
      savedBookings.push(this);
      return this;
    };
    Booking.findById = (id) => makeQueryMock(savedBookings.find((b) => String(b._id) === String(id)) || null);
    Booking.findOneAndUpdate = async (filter, update) => {
      const doc = savedBookings.find((b) => String(b._id) === String(filter._id)) || null;
      if (!doc) return null;
      if (update?.$set) Object.assign(doc, update.$set);
      return doc;
    };
    Payment.findOne = (query) => {
      const match = savedPayments.find((p) => {
        if (query.booking && String(p.booking) !== String(query.booking)) return false;
        if (query.status && p.status !== query.status) return false;
        return true;
      }) || null;
      return makeQueryMock(match);
    };
    Payment.create = async (doc) => {
      const created = {
        _id: new mongoose.Types.ObjectId(),
        providerReference: '',
        ...doc,
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject() { return { ...this }; },
      };
      savedPayments.push(created);
      return created;
    };

    const res1 = makeRes();
    const res2 = makeRes();
    await Promise.all([
      paymentController.createAdminLivePaymentTest({ body: {} }, res1, (err) => { if (err) throw err; }),
      paymentController.createAdminLivePaymentTest({ body: {} }, res2, (err) => { if (err) throw err; }),
    ]);

    assert.strictEqual(savedBookings.length, 1, 'Concurrent clicks must create only 1 test booking');
    assert.strictEqual(savedPayments.length, 1, 'Concurrent clicks must create only 1 test payment');

    // Sequential click while PENDING must reuse the existing booking/payment
    const res3 = makeRes();
    await paymentController.createAdminLivePaymentTest({ body: {} }, res3, (err) => { if (err) throw err; });
    assert.strictEqual(res3.statusCode, 200);
    assert.strictEqual(res3.body.data.reused, true);
    assert.strictEqual(savedBookings.length, 1);
    assert.strictEqual(savedPayments.length, 1);
  });

  await check('5. Server-side webhook verification marks 1 SAR test PAID/CONFIRMED and triggers zero WhatsApp notifications', async () => {
    setLiveMoyasarEnv({ customerEnabled: false });

    const bookingId = new mongoose.Types.ObjectId();
    const paymentId = new mongoose.Types.ObjectId();
    const testBooking = {
      _id: bookingId,
      bookingNumber: 'NXT-TEST-20261127-ABC',
      isInternalPaymentTest: true,
      paymentStatus: 'PENDING',
      bookingStatus: 'PAYMENT_PENDING',
      pricing: { totalAmount: 1, currency: 'SAR' },
    };
    const testPayment = {
      _id: paymentId,
      booking: bookingId,
      bookingNumber: 'NXT-TEST-20261127-ABC',
      amount: 1,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: '',
      status: 'PENDING',
      metadata: { env: 'live' },
    };

    let whatsappLookups = 0;
    WhatsAppSession.findOne = async () => {
      whatsappLookups += 1;
      throw new Error('Internal payment test must NEVER trigger WhatsApp notifications');
    };

    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'pay_live_1sar_ok',
        status: 'paid',
        amount: 100,
        currency: 'SAR',
        live: true,
        metadata: {
          payment_id: String(paymentId),
          booking_number: 'NXT-TEST-20261127-ABC',
        },
      }),
    });

    Payment.findOne = async () => null;
    Payment.findById = async () => testPayment;
    Payment.findOneAndUpdate = async (_filter, update) => {
      Object.assign(testPayment, { status: update.$set.status, providerReference: update.$set.providerReference });
      return { ...testPayment };
    };
    Booking.findById = async () => ({ ...testBooking });
    Booking.findOneAndUpdate = async (_filter, update) => {
      Object.assign(testBooking, update.$set);
      return { ...testBooking };
    };

    const webhookRes = makeRes();
    await paymentController.webhook(
      {
        body: {
          id: 'evt_live_1sar_paid',
          type: 'payment_paid',
          secret_token: 'whsec_live_unit_test',
          live: true,
          data: { id: 'pay_live_1sar_ok' },
        },
      },
      webhookRes,
      (err) => { if (err) throw err; }
    );

    // Flush setImmediate to ensure no async WhatsApp notification runs
    await new Promise((resolve) => setImmediate(resolve));

    assert.strictEqual(webhookRes.statusCode, 200);
    assert.strictEqual(testPayment.status, 'PAID');
    assert.strictEqual(testBooking.paymentStatus, 'PAID');
    assert.strictEqual(testBooking.bookingStatus, 'CONFIRMED');
    assert.strictEqual(whatsappLookups, 0, 'Internal test booking must not trigger WhatsApp notification');
  });

  await check('6. Internal test bookings are excluded from dashboard analytics, driver dispatch, customer tracking, and public pay', async () => {
    const testDoc = {
      _id: new mongoose.Types.ObjectId(),
      bookingNumber: 'NXT-TEST-20261127-XYZ',
      isInternalPaymentTest: true,
      paymentStatus: 'PAID',
      bookingStatus: 'CONFIRMED',
      pricing: { totalAmount: 1, currency: 'SAR' },
      customer: { name: 'ADMIN PAYMENT TEST', email: 'internal-payment-test@nextifylimo.invalid', mobile: '0000000000' },
    };

    // Dashboard stats query must filter out isInternalPaymentTest: true
    let statsQuery = null;
    Booking.find = async (query) => {
      statsQuery = query;
      return [];
    };
    const statsRes = makeRes();
    await bookingController.getDashboardStats({}, statsRes, (err) => { if (err) throw err; });
    assert.strictEqual(statsRes.statusCode, 200);
    assert.deepStrictEqual(statsQuery, { isInternalPaymentTest: { $ne: true } });

    // Driver assignment rejected with 400
    Booking.findById = () => makeQueryMock(testDoc);
    const assignRes = makeRes();
    await bookingController.assignDriver(
      { params: { id: String(testDoc._id) }, body: { driverId: new mongoose.Types.ObjectId().toString() } },
      assignRes,
      (err) => { if (err) throw err; }
    );
    assert.strictEqual(assignRes.statusCode, 400);

    // Customer tracking returns 404
    Booking.findOne = () => makeQueryMock(testDoc);
    const trackRes = makeRes();
    await bookingController.trackBooking(
      { body: { bookingNumber: testDoc.bookingNumber, email: testDoc.customer.email } },
      trackRes,
      (err) => { if (err) throw err; }
    );
    assert.strictEqual(trackRes.statusCode, 404);

    // Public pay booking returns 403
    const pubPayRes = makeRes();
    await bookingController.getPublicPayBooking(
      { params: { id: String(testDoc._id) }, headers: {} },
      pubPayRes,
      (err) => { if (err) throw err; }
    );
    assert.strictEqual(pubPayRes.statusCode, 403);
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
