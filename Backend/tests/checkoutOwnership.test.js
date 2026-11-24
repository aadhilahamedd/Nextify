/**
 * Secure guest checkout ownership tests (Stage 1 — Backend)
 * Run: node Backend/tests/checkoutOwnership.test.js
 * Uses in-memory stubs only (no MongoDB connection, no Moyasar network calls).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const User = require('../models/User');
const bookingController = require('../controllers/bookingController');
const paymentController = require('../controllers/paymentController');
const paymentService = require('../services/paymentService');
const moyasarProvider = require('../services/paymentProviders/moyasarPaymentProvider');
moyasarProvider._setAllowOfflineUnitTestTransactions(true);
const mockProvider = require('../services/paymentProviders/mockPaymentProvider');
const { buildCorsOptions } = require('../config/corsOptions');
const {
  CHECKOUT_UNAUTHORIZED_MESSAGE,
  DEFAULT_CHECKOUT_TOKEN_TTL_MS,
  generateCheckoutToken,
  getCheckoutTokenTtlMs,
  hashCheckoutToken,
  verifyCheckoutToken,
  authorizeBookingCheckout,
} = require('../utils/checkoutToken');

function createMockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

function makeQuery(doc) {
  return {
    select() {
      return {
        lean: async () => doc,
        then(resolve, reject) {
          return Promise.resolve(doc).then(resolve, reject);
        },
      };
    },
    lean: async () => doc,
    then(resolve, reject) {
      return Promise.resolve(doc).then(resolve, reject);
    },
  };
}

function mockAdminLookup(resolver) {
  User.findById = (id) => ({
    select() {
      return {
        lean: () => resolver(id),
      };
    },
  });
}

const results = [];

async function check(name, fn) {
  const origBookingFindById = Booking.findById;
  const origBookingFindOne = Booking.findOne;
  const origBookingFindOneAndUpdate = Booking.findOneAndUpdate;
  const origBookingUpdateOne = Booking.updateOne;
  const origBookingSave = Booking.prototype.save;
  const origPaymentCreate = Payment.create;
  const origPaymentFindOne = Payment.findOne;
  const origPaymentFindById = Payment.findById;
  const origPaymentFindOneAndUpdate = Payment.findOneAndUpdate;
  const origPaymentUpdateOne = Payment.updateOne;
  const origCreateOrReuse = paymentService.createOrReuseCheckout;
  const origUserFindById = User.findById;
  const origFetch = global.fetch;
  const origEnv = {
    CHECKOUT_TOKEN_TTL_MS: process.env.CHECKOUT_TOKEN_TTL_MS,
    MOYASAR_ENV: process.env.MOYASAR_ENV,
    MOYASAR_SECRET_KEY: process.env.MOYASAR_SECRET_KEY,
    MOYASAR_PUBLISHABLE_KEY: process.env.MOYASAR_PUBLISHABLE_KEY,
    MOYASAR_WEBHOOK_SECRET: process.env.MOYASAR_WEBHOOK_SECRET,
  };

  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`ok ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.log(`fail ${name} — ${err.message}`);
  } finally {
    Booking.findById = origBookingFindById;
    Booking.findOne = origBookingFindOne;
    Booking.findOneAndUpdate = origBookingFindOneAndUpdate;
    Booking.updateOne = origBookingUpdateOne;
    Booking.prototype.save = origBookingSave;
    Payment.create = origPaymentCreate;
    Payment.findOne = origPaymentFindOne;
    Payment.findById = origPaymentFindById;
    Payment.findOneAndUpdate = origPaymentFindOneAndUpdate;
    Payment.updateOne = origPaymentUpdateOne;
    paymentService.createOrReuseCheckout = origCreateOrReuse;
    User.findById = origUserFindById;
    global.fetch = origFetch;
    for (const [key, val] of Object.entries(origEnv)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  }
}

async function run() {
  const idA = '507f191e810c19729de860a1';
  const idB = '507f191e810c19729de860b2';
  const ownerId = '507f191e810c19729de860c3';
  const otherUserId = '507f191e810c19729de860d4';
  const adminId = '507f191e810c19729de860e5';

  // 1. Token utility: generation, hashing, TTL validation, and valid verification
  await check('1. Valid token for Booking A is accepted on public pay and payment create', async () => {
    const issued = generateCheckoutToken();
    assert.ok(issued.rawToken.length >= 43);
    assert.strictEqual(issued.tokenHash, hashCheckoutToken(issued.rawToken));
    assert.notStrictEqual(issued.tokenHash, issued.rawToken);
    assert.strictEqual(getCheckoutTokenTtlMs(), DEFAULT_CHECKOUT_TOKEN_TTL_MS);

    const bookingA = {
      _id: idA,
      bookingNumber: 'NX-TOK-A',
      user: null,
      serviceType: 'airport_transfer',
      vehicle: { name: 'Ford Taurus' },
      quotedPrice: 180,
      pricing: { totalAmount: 180, currency: 'SAR', breakdown: { quoteStatus: 'priced' } },
      paymentStatus: 'PENDING',
      bookingStatus: 'PAYMENT_PENDING',
      customQuoteRequired: false,
      checkoutTokenHash: issued.tokenHash,
      checkoutTokenExpiresAt: issued.expiresAt,
      customer: { name: 'Guest A', email: 'a@example.com', mobile: '0555000001' },
    };

    Booking.findById = (id) => makeQuery(String(id) === idA ? bookingA : null);

    // GET /api/bookings/pay/:id
    const resPay = createMockRes();
    await bookingController.getPublicPayBooking(
      { params: { id: idA }, headers: { 'x-checkout-token': issued.rawToken } },
      resPay,
      (err) => { if (err) throw err; },
    );
    assert.strictEqual(resPay.statusCode, 200);
    assert.strictEqual(resPay.body?.data?.booking?.bookingNumber, 'NX-TOK-A');

    // POST /api/payments/create
    let createCalls = 0;
    paymentService.createOrReuseCheckout = async (booking) => {
      createCalls += 1;
      const now = new Date();
      return {
        payment: {
          _id: '507f191e810c19729de860f1',
          booking: booking._id,
          bookingNumber: booking.bookingNumber,
          amount: 180,
          currency: 'SAR',
          provider: 'moyasar',
          status: 'PENDING',
          createdAt: now,
          updatedAt: now,
        },
        booking,
        checkout: { provider: 'moyasar', amountHalalas: 18000 },
      };
    };

    const resCreate = createMockRes();
    await paymentController.createPayment(
      { body: { bookingId: idA }, headers: { 'x-checkout-token': issued.rawToken } },
      resCreate,
      (err) => { if (err) throw err; },
    );
    assert.strictEqual(resCreate.statusCode, 201);
    assert.strictEqual(createCalls, 1);
  });

  // 2. Missing token rejected for guest booking
  await check('2. Missing token is rejected with 403 for a guest booking', async () => {
    const issued = generateCheckoutToken();
    const bookingA = {
      _id: idA,
      bookingNumber: 'NX-TOK-MISS',
      user: null,
      paymentStatus: 'PENDING',
      bookingStatus: 'PAYMENT_PENDING',
      checkoutTokenHash: issued.tokenHash,
      checkoutTokenExpiresAt: issued.expiresAt,
    };
    Booking.findById = () => makeQuery(bookingA);

    const resPay = createMockRes();
    await bookingController.getPublicPayBooking(
      { params: { id: idA }, headers: {} },
      resPay,
      (err) => { if (err) throw err; },
    );
    assert.strictEqual(resPay.statusCode, 403);
    assert.strictEqual(resPay.body?.message, CHECKOUT_UNAUTHORIZED_MESSAGE);

    const resCreate = createMockRes();
    await paymentController.createPayment(
      { body: { bookingId: idA }, headers: {} },
      resCreate,
      (err) => { if (err) throw err; },
    );
    assert.strictEqual(resCreate.statusCode, 403);
    assert.strictEqual(resCreate.body?.message, CHECKOUT_UNAUTHORIZED_MESSAGE);
  });

  // 3. Incorrect token rejected
  await check('3. Incorrect token is rejected with 403', async () => {
    const issued = generateCheckoutToken();
    const wrong = generateCheckoutToken();
    const bookingA = {
      _id: idA,
      bookingNumber: 'NX-TOK-WRONG',
      user: null,
      checkoutTokenHash: issued.tokenHash,
      checkoutTokenExpiresAt: issued.expiresAt,
    };
    Booking.findById = () => makeQuery(bookingA);

    const res = createMockRes();
    await bookingController.getPublicPayBooking(
      { params: { id: idA }, headers: { 'x-checkout-token': wrong.rawToken } },
      res,
      (err) => { if (err) throw err; },
    );
    assert.strictEqual(res.statusCode, 403);
  });

  // 4. Expired token rejected
  await check('4. Expired token is rejected with 403', async () => {
    const pastNow = Date.now() - 10_000;
    const issued = generateCheckoutToken({ now: pastNow, ttlMs: 1000 });
    assert.strictEqual(verifyCheckoutToken(issued.rawToken, issued.tokenHash, issued.expiresAt), false);

    const bookingA = {
      _id: idA,
      bookingNumber: 'NX-TOK-EXP',
      user: null,
      checkoutTokenHash: issued.tokenHash,
      checkoutTokenExpiresAt: issued.expiresAt,
    };
    Booking.findById = () => makeQuery(bookingA);

    const resPay = createMockRes();
    await bookingController.getPublicPayBooking(
      { params: { id: idA }, headers: { 'x-checkout-token': issued.rawToken } },
      resPay,
      (err) => { if (err) throw err; },
    );
    assert.strictEqual(resPay.statusCode, 403);

    const res = createMockRes();
    await paymentController.createPayment(
      { body: { bookingId: idA }, headers: { 'x-checkout-token': issued.rawToken } },
      res,
      (err) => { if (err) throw err; },
    );
    assert.strictEqual(res.statusCode, 403);
  });

  // 5. Token for Booking A cannot access Booking B
  await check('5. Token issued for Booking A cannot access Booking B', async () => {
    const issuedA = generateCheckoutToken();
    const issuedB = generateCheckoutToken();
    const bookingB = {
      _id: idB,
      bookingNumber: 'NX-TOK-B',
      user: null,
      checkoutTokenHash: issuedB.tokenHash,
      checkoutTokenExpiresAt: issuedB.expiresAt,
    };
    Booking.findById = (id) => makeQuery(String(id) === idB ? bookingB : null);

    const resPay = createMockRes();
    await bookingController.getPublicPayBooking(
      { params: { id: idB }, headers: { 'x-checkout-token': issuedA.rawToken } },
      resPay,
      (err) => { if (err) throw err; },
    );
    assert.strictEqual(resPay.statusCode, 403);

    const resCreate = createMockRes();
    await paymentController.createPayment(
      { body: { bookingId: idB }, headers: { 'x-checkout-token': issuedA.rawToken } },
      resCreate,
      (err) => { if (err) throw err; },
    );
    assert.strictEqual(resCreate.statusCode, 403);
  });

  // 6. Normal user cannot access another user's booking or a guest booking
  await check('6. Ordinary authenticated user cannot access another user or guest booking', async () => {
    const issued = generateCheckoutToken();
    const otherBooking = {
      _id: idA,
      bookingNumber: 'NX-OTHER',
      user: ownerId,
      checkoutTokenHash: issued.tokenHash,
      checkoutTokenExpiresAt: issued.expiresAt,
    };
    const guestBooking = {
      _id: idB,
      bookingNumber: 'NX-GUEST',
      user: null,
      checkoutTokenHash: issued.tokenHash,
      checkoutTokenExpiresAt: issued.expiresAt,
    };

    const res1 = await authorizeBookingCheckout(
      { user: { userId: otherUserId, role: 'user' }, headers: {} },
      otherBooking,
    );
    assert.strictEqual(res1.authorized, false);
    assert.strictEqual(res1.statusCode, 403);

    const res2 = await authorizeBookingCheckout(
      { user: { userId: otherUserId, role: 'user' }, headers: {} },
      guestBooking,
    );
    assert.strictEqual(res2.authorized, false);
    assert.strictEqual(res2.statusCode, 403);
  });

  // 7. Actual booking owner remains authorized
  await check('7. Authenticated booking owner remains authorized without checkout token', async () => {
    const ownedBooking = {
      _id: idA,
      bookingNumber: 'NX-OWNED',
      user: ownerId,
      serviceType: 'airport_transfer',
      pricing: { totalAmount: 180, currency: 'SAR' },
      paymentStatus: 'PENDING',
      bookingStatus: 'PAYMENT_PENDING',
      checkoutTokenHash: '',
      checkoutTokenExpiresAt: null,
    };
    Booking.findById = () => makeQuery(ownedBooking);

    const res = createMockRes();
    await bookingController.getPublicPayBooking(
      { params: { id: idA }, headers: {}, user: { userId: ownerId, role: 'user' } },
      res,
      (err) => { if (err) throw err; },
    );
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.data?.booking?.bookingNumber, 'NX-OWNED');
  });

  // 8. Database-verified admin remains authorized; demoted/deleted admin is rejected
  await check('8. Database-verified admin is authorized; demoted or deleted admin is rejected', async () => {
    const bookingA = {
      _id: idA,
      bookingNumber: 'NX-ADM',
      user: null,
      checkoutTokenHash: '',
      checkoutTokenExpiresAt: null,
    };

    // Valid DB admin
    mockAdminLookup(async () => ({ _id: adminId, role: 'admin' }));
    const okAdmin = await authorizeBookingCheckout(
      { user: { userId: adminId, role: 'admin' }, headers: {} },
      bookingA,
    );
    assert.strictEqual(okAdmin.authorized, true);
    assert.strictEqual(okAdmin.via, 'admin');

    // Demoted admin in DB
    mockAdminLookup(async () => ({ _id: adminId, role: 'user' }));
    const demoted = await authorizeBookingCheckout(
      { user: { userId: adminId, role: 'admin' }, headers: {} },
      bookingA,
    );
    assert.strictEqual(demoted.authorized, false);
    assert.strictEqual(demoted.statusCode, 403);

    // Deleted admin in DB
    mockAdminLookup(async () => null);
    const deleted = await authorizeBookingCheckout(
      { user: { userId: adminId, role: 'admin' }, headers: {} },
      bookingA,
    );
    assert.strictEqual(deleted.authorized, false);
    assert.strictEqual(deleted.statusCode, 403);

    // DB outage fails closed with 500
    mockAdminLookup(async () => {
      throw new Error('MongoNetworkError: secret-host');
    });
    const dbFail = await authorizeBookingCheckout(
      { user: { userId: adminId, role: 'admin' }, headers: {} },
      bookingA,
    );
    assert.strictEqual(dbFail.authorized, false);
    assert.strictEqual(dbFail.statusCode, 500);
    assert.ok(!dbFail.message.includes('secret-host'));
  });

  // 9. Unauthorized payment creation never creates or reopens a payment attempt
  await check('9. Unauthorized payment creation does not create or reopen a payment attempt', async () => {
    const issued = generateCheckoutToken();
    const failedBooking = {
      _id: idA,
      bookingNumber: 'NX-FAIL-NO-REOPEN',
      user: null,
      paymentStatus: 'FAILED',
      bookingStatus: 'CANCELLED',
      checkoutTokenHash: issued.tokenHash,
      checkoutTokenExpiresAt: issued.expiresAt,
    };
    Booking.findById = () => makeQuery(failedBooking);

    let serviceCalled = false;
    paymentService.createOrReuseCheckout = async () => {
      serviceCalled = true;
      throw new Error('Should never be called on unauthorized request');
    };

    const res = createMockRes();
    await paymentController.createPayment(
      { body: { bookingId: idA }, headers: { 'x-checkout-token': 'invalid-token-value-1234567890' } },
      res,
      (err) => { if (err) throw err; },
    );
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(serviceCalled, false);
    assert.strictEqual(failedBooking.bookingStatus, 'CANCELLED');
    assert.strictEqual(failedBooking.paymentStatus, 'FAILED');
  });

  // 10. Token hash and expiry never appear in public, checkout, or payment responses
  await check('10. Token hash and expiry never appear in public, checkout, or payment responses', async () => {
    Booking.findOne = async () => null;
    Booking.prototype.save = async function saveStub() {
      return this;
    };

    const resCreateBooking = createMockRes();
    await bookingController.createBooking(
      {
        body: {
          serviceType: 'airport_transfer',
          vehicleCategory: 'ford_taurus',
          vehicleName: 'Ford Taurus',
          airport: 'King Abdulaziz International Airport',
          origin: 'King Abdulaziz International Airport',
          destination: 'Makkah',
          pickupPlace: { id: 'jeddah-airport', iata: 'JED', nameEn: 'King Abdulaziz International Airport', cityEn: 'Jeddah', kind: 'airport' },
          dropoffPlace: { id: 'mecca', nameEn: 'Makkah', cityEn: 'Makkah', kind: 'place' },
          travelDate: '2026-12-20',
          travelTime: '15:00',
          customer: { name: 'Token Privacy Test', email: 'privacy@example.com', mobile: '0555992937' },
        },
        headers: {},
      },
      resCreateBooking,
      (err) => { if (err) throw err; },
    );

    assert.strictEqual(resCreateBooking.statusCode, 201);
    const createdToken = resCreateBooking.body?.data?.checkoutToken;
    const createdBooking = resCreateBooking.body?.data?.booking;
    assert.ok(typeof createdToken === 'string' && createdToken.length >= 43);
    assert.strictEqual(createdBooking.checkoutTokenHash, undefined);
    assert.strictEqual(createdBooking.checkoutTokenExpiresAt, undefined);

    const rawBookingJson = JSON.stringify(resCreateBooking.body);
    assert.ok(!rawBookingJson.includes('checkoutTokenHash'));
    assert.ok(!rawBookingJson.includes('checkoutTokenExpiresAt'));
    assert.ok(!rawBookingJson.includes(hashCheckoutToken(createdToken)));

    // Schema fields must be select: false
    assert.strictEqual(Booking.schema.path('checkoutTokenHash').options.select, false);
    assert.strictEqual(Booking.schema.path('checkoutTokenExpiresAt').options.select, false);
  });

  // 11. Invalid token input & missing booking never crash and return consistent 403
  await check('11. Invalid token input and missing booking do not crash and return consistent 403', async () => {
    const issued = generateCheckoutToken();
    for (const bad of [null, undefined, '', 'short', 'x'.repeat(500), ['arr'], { obj: 1 }, 12345]) {
      assert.strictEqual(verifyCheckoutToken(bad, issued.tokenHash, issued.expiresAt), false);
      assert.strictEqual(verifyCheckoutToken(issued.rawToken, bad, issued.expiresAt), false);
    }
    assert.strictEqual(verifyCheckoutToken(issued.rawToken, 'not-64-hex', issued.expiresAt), false);
    assert.strictEqual(verifyCheckoutToken(issued.rawToken, issued.tokenHash, 'invalid-date'), false);

    // Missing booking returns same 403 message as invalid token (no booking existence disclosure)
    Booking.findById = () => makeQuery(null);
    const resMissing = createMockRes();
    await bookingController.getPublicPayBooking(
      { params: { id: idA }, headers: { 'x-checkout-token': issued.rawToken } },
      resMissing,
      (err) => { if (err) throw err; },
    );
    assert.strictEqual(resMissing.statusCode, 403);
    assert.strictEqual(resMissing.body?.message, CHECKOUT_UNAUTHORIZED_MESSAGE);

    // Malformed booking id returns same 403 without crashing Mongoose
    const resBadId = createMockRes();
    await bookingController.getPublicPayBooking(
      { params: { id: 'not-an-object-id' }, headers: { 'x-checkout-token': issued.rawToken } },
      resBadId,
      (err) => { if (err) throw err; },
    );
    assert.strictEqual(resBadId.statusCode, 403);
    assert.strictEqual(resBadId.body?.message, CHECKOUT_UNAUTHORIZED_MESSAGE);
  });

  // 12. Custom-quote bookings do not receive checkoutToken and remain ineligible for online payment
  await check('12. Custom-quote booking does not issue checkoutToken and payment creation rejects it', async () => {
    Booking.findOne = async () => null;
    Booking.prototype.save = async function saveStub() {
      return this;
    };

    const resQuote = createMockRes();
    await bookingController.createBooking(
      {
        body: {
          serviceType: 'chauffeur',
          vehicleCategory: 'mercedes_s',
          vehicleName: 'Mercedes S-Class',
          durationType: 'half_day',
          origin: 'Riyadh',
          destination: 'Riyadh',
          travelDate: '2026-12-20',
          travelTime: '15:00',
          customer: { name: 'Custom Quote Guest', email: 'cq@example.com', mobile: '0555992937' },
        },
        headers: {},
      },
      resQuote,
      (err) => { if (err) throw err; },
    );

    assert.strictEqual(resQuote.statusCode, 201);
    assert.strictEqual(resQuote.body?.data?.booking?.customQuoteRequired, true);
    assert.strictEqual(resQuote.body?.data?.checkoutToken, undefined);

    // Even an authenticated owner cannot create online payment for a custom-quote booking
    Booking.findById = () => makeQuery({
      _id: idA,
      user: ownerId,
      customQuoteRequired: true,
      paymentStatus: 'NOT_REQUIRED',
      bookingStatus: 'PENDING',
      pricing: { totalAmount: 0, breakdown: { quoteStatus: 'rate_on_request' } },
      checkoutTokenHash: '',
      checkoutTokenExpiresAt: null,
    });
    const resPay = createMockRes();
    await paymentController.createPayment(
      { body: { bookingId: idA }, headers: {}, user: { userId: ownerId, role: 'user' } },
      resPay,
      (err) => { if (err) throw err; },
    );
    assert.strictEqual(resPay.statusCode, 400);
  });

  // 13. Route wiring and CORS allowedHeaders verification
  await check('13. GET /api/bookings/pay/:id uses rate limiter + optionalJwt and CORS allows X-Checkout-Token', () => {
    const routesSrc = fs.readFileSync(path.join(__dirname, '../routes/route.js'), 'utf8');
    assert.match(
      routesSrc,
      /router\.get\(\s*'\/api\/bookings\/pay\/:id',\s*paymentCreateLimiter,\s*optionalJwtMiddleware,\s*bookingController\.getPublicPayBooking\s*\)/,
    );
    const cors = buildCorsOptions();
    assert.ok(cors.allowedHeaders.includes('X-Checkout-Token'));
    assert.ok(!cors.allowedHeaders.includes('*'));
  });

  // --- Stage 1.1: Checkout Token Invalidation After Payment ---

  function setupMoyasarEnv() {
    process.env.MOYASAR_ENV = 'test';
    process.env.MOYASAR_SECRET_KEY = 'sk_test_stage11_invalidation';
    process.env.MOYASAR_PUBLISHABLE_KEY = 'pk_test_stage11_invalidation';
    process.env.MOYASAR_WEBHOOK_SECRET = 'whsec_stage11_invalidation';
  }

  function stubMoyasarRetrieve(payload) {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => payload,
      text: async () => JSON.stringify(payload),
    });
  }

  // 14. Moyasar verifyPayment (paid) atomically invalidates checkout token
  await check('14. Moyasar verifyPayment (paid) clears checkoutTokenHash and checkoutTokenExpiresAt', async () => {
    setupMoyasarEnv();
    const issued = generateCheckoutToken();
    const paymentId = '507f191e810c19729de86101';
    const moyasarId = 'pay_stage11_paid_1';

    const bookingDoc = {
      _id: idA,
      bookingNumber: 'NX-S11-PAID',
      user: null,
      paymentStatus: 'PENDING',
      bookingStatus: 'PAYMENT_PENDING',
      checkoutTokenHash: issued.tokenHash,
      checkoutTokenExpiresAt: issued.expiresAt,
    };
    const paymentDoc = {
      _id: paymentId,
      booking: idA,
      bookingNumber: 'NX-S11-PAID',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: moyasarId,
      status: 'PENDING',
      metadata: { env: 'test' },
    };

    stubMoyasarRetrieve({
      id: moyasarId,
      status: 'paid',
      amount: 18000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: paymentId, booking_number: 'NX-S11-PAID' },
    });

    Payment.findOne = async (q) => {
      if (q.providerReference === moyasarId) return paymentDoc;
      return null;
    };
    Payment.findById = async () => paymentDoc;
    Payment.findOneAndUpdate = async (filter, update) => {
      if (paymentDoc.status === 'PAID') return null;
      Object.assign(paymentDoc, {
        status: update.$set.status,
        providerReference: update.$set.providerReference,
      });
      return paymentDoc;
    };
    Booking.findById = () => makeQuery(bookingDoc);
    let bookingUpdateSet = null;
    Booking.findOneAndUpdate = async (filter, update) => {
      if (bookingDoc.paymentStatus === 'PAID') return null;
      bookingUpdateSet = update.$set;
      Object.assign(bookingDoc, update.$set);
      return bookingDoc;
    };

    const result = await moyasarProvider.verifyPayment(moyasarId);
    assert.strictEqual(result.mappedStatus, 'PAID');
    assert.strictEqual(result.reused, false);
    assert.strictEqual(bookingUpdateSet.paymentStatus, 'PAID');
    assert.strictEqual(bookingUpdateSet.bookingStatus, 'CONFIRMED');
    assert.strictEqual(bookingUpdateSet.checkoutTokenHash, '');
    assert.strictEqual(bookingUpdateSet.checkoutTokenExpiresAt, null);
    assert.strictEqual(bookingDoc.checkoutTokenHash, '');
    assert.strictEqual(bookingDoc.checkoutTokenExpiresAt, null);

    // Previously valid token is now rejected
    const authAfterPaid = await authorizeBookingCheckout(
      { headers: { 'x-checkout-token': issued.rawToken } },
      bookingDoc,
    );
    assert.strictEqual(authAfterPaid.authorized, false);
    assert.strictEqual(authAfterPaid.statusCode, 403);
  });

  // 15. Moyasar webhook clears token on first delivery and remains idempotent on repeat
  await check('15. Moyasar webhook clears token on payment_paid and repeated delivery stays idempotent', async () => {
    setupMoyasarEnv();
    const issued = generateCheckoutToken();
    const paymentId = '507f191e810c19729de86102';
    const moyasarId = 'pay_stage11_wh_1';

    const bookingDoc = {
      _id: idA,
      bookingNumber: 'NX-S11-WH',
      user: null,
      paymentStatus: 'PENDING',
      bookingStatus: 'PAYMENT_PENDING',
      checkoutTokenHash: issued.tokenHash,
      checkoutTokenExpiresAt: issued.expiresAt,
    };
    const paymentDoc = {
      _id: paymentId,
      booking: idA,
      bookingNumber: 'NX-S11-WH',
      amount: 250,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: moyasarId,
      status: 'PENDING',
      metadata: { env: 'test' },
    };

    stubMoyasarRetrieve({
      id: moyasarId,
      status: 'paid',
      amount: 25000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: paymentId, booking_number: 'NX-S11-WH' },
    });

    Payment.findOne = async (q) => {
      if (q.providerReference === moyasarId) return paymentDoc;
      return null;
    };
    Payment.findById = async () => paymentDoc;
    Payment.findOneAndUpdate = async (filter, update) => {
      if (paymentDoc.status === 'PAID') return null;
      Object.assign(paymentDoc, {
        status: update.$set.status,
        providerReference: update.$set.providerReference,
      });
      return paymentDoc;
    };
    Booking.findById = () => makeQuery(bookingDoc);
    let bookingConfirmCalls = 0;
    Booking.findOneAndUpdate = async (filter, update) => {
      bookingConfirmCalls += 1;
      if (bookingDoc.paymentStatus === 'PAID') return null;
      Object.assign(bookingDoc, update.$set);
      return bookingDoc;
    };

    const webhookPayload = {
      type: 'payment_paid',
      secret_token: 'whsec_stage11_invalidation',
      live: false,
      data: { id: moyasarId, status: 'paid' },
    };

    const first = await moyasarProvider.handleWebhook(webhookPayload);
    assert.strictEqual(first.mappedStatus, 'PAID');
    assert.strictEqual(first.reused, false);
    assert.strictEqual(bookingConfirmCalls, 1);
    assert.strictEqual(bookingDoc.paymentStatus, 'PAID');
    assert.strictEqual(bookingDoc.bookingStatus, 'CONFIRMED');
    assert.strictEqual(bookingDoc.checkoutTokenHash, '');
    assert.strictEqual(bookingDoc.checkoutTokenExpiresAt, null);

    // Repeat webhook delivery must be idempotent and never error or re-write booking
    const second = await moyasarProvider.handleWebhook(webhookPayload);
    assert.strictEqual(second.mappedStatus, 'PAID');
    assert.strictEqual(second.reused, true);
    assert.strictEqual(second.duplicateCharge, false);
    assert.strictEqual(bookingConfirmCalls, 1);
    assert.strictEqual(bookingDoc.checkoutTokenHash, '');
    assert.strictEqual(bookingDoc.checkoutTokenExpiresAt, null);
  });

  // 16. Failed, cancelled, and pending Moyasar payments retain the valid checkout token
  await check('16. Failed, cancelled, and pending Moyasar payments retain valid checkout token', async () => {
    setupMoyasarEnv();

    for (const scenario of [
      { moyasarStatus: 'failed', expectedMapped: 'FAILED' },
      { moyasarStatus: 'voided', expectedMapped: 'CANCELLED' },
      { moyasarStatus: 'initiated', expectedMapped: 'PENDING' },
    ]) {
      const issued = generateCheckoutToken();
      const paymentId = '507f191e810c19729de86103';
      const moyasarId = `pay_stage11_${scenario.moyasarStatus}`;

      const bookingDoc = {
        _id: idA,
        bookingNumber: 'NX-S11-RETRY',
        user: null,
        paymentStatus: 'PENDING',
        bookingStatus: 'PAYMENT_PENDING',
        checkoutTokenHash: issued.tokenHash,
        checkoutTokenExpiresAt: issued.expiresAt,
      };
      const paymentDoc = {
        _id: paymentId,
        booking: idA,
        bookingNumber: 'NX-S11-RETRY',
        amount: 180,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: moyasarId,
        status: 'PENDING',
        metadata: { env: 'test' },
      };

      stubMoyasarRetrieve({
        id: moyasarId,
        status: scenario.moyasarStatus,
        amount: 18000,
        currency: 'SAR',
        live: false,
        metadata: { payment_id: paymentId, booking_number: 'NX-S11-RETRY' },
      });

      Payment.findOne = async (q) => (q.providerReference === moyasarId ? paymentDoc : null);
      Payment.findById = async () => paymentDoc;
      Payment.findOneAndUpdate = async (filter, update) => {
        Object.assign(paymentDoc, { status: update.$set.status });
        return paymentDoc;
      };
      Payment.updateOne = async () => ({ modifiedCount: 1 });
      Booking.findById = () => makeQuery(bookingDoc);
      Booking.updateOne = async (filter, update) => {
        Object.assign(bookingDoc, update.$set);
        return { modifiedCount: 1 };
      };

      const res = await moyasarProvider.verifyPayment(moyasarId);
      assert.strictEqual(res.mappedStatus, scenario.expectedMapped);
      assert.strictEqual(bookingDoc.checkoutTokenHash, issued.tokenHash);
      assert.strictEqual(bookingDoc.checkoutTokenExpiresAt, issued.expiresAt);

      const authStillValid = await authorizeBookingCheckout(
        { headers: { 'x-checkout-token': issued.rawToken } },
        bookingDoc,
      );
      assert.strictEqual(authStillValid.authorized, true);
      assert.strictEqual(authStillValid.via, 'checkout_token');
    }
  });

  // 17. Mock payment provider invalidates token on success and preserves it on fail/cancel
  await check('17. Mock payment completion clears token on success and retains it on fail/cancel', async () => {
    const paymentId = '507f191e810c19729de86104';

    // Success clears token
    const issuedOk = generateCheckoutToken();
    const bookingOk = {
      _id: idA,
      bookingNumber: 'NX-MOCK-OK',
      user: null,
      paymentStatus: 'PENDING',
      bookingStatus: 'PAYMENT_PENDING',
      checkoutTokenHash: issuedOk.tokenHash,
      checkoutTokenExpiresAt: issuedOk.expiresAt,
      saveCalled: false,
      async save() {
        this.saveCalled = true;
        return this;
      },
    };
    const paymentOk = {
      _id: paymentId,
      booking: idA,
      status: 'PENDING',
      async save() { return this; },
    };
    Payment.findById = async () => paymentOk;
    Booking.findById = async () => bookingOk;

    await mockProvider.completePayment(paymentId, 'success');
    assert.strictEqual(bookingOk.saveCalled, true);
    assert.strictEqual(bookingOk.paymentStatus, 'PAID');
    assert.strictEqual(bookingOk.bookingStatus, 'CONFIRMED');
    assert.strictEqual(bookingOk.checkoutTokenHash, '');
    assert.strictEqual(bookingOk.checkoutTokenExpiresAt, null);

    const authAfterMockPaid = await authorizeBookingCheckout(
      { headers: { 'x-checkout-token': issuedOk.rawToken } },
      bookingOk,
    );
    assert.strictEqual(authAfterMockPaid.authorized, false);
    assert.strictEqual(authAfterMockPaid.statusCode, 403);

    // Fail and cancel retain token
    for (const outcome of ['fail', 'cancel']) {
      const issuedRetry = generateCheckoutToken();
      const bookingRetry = {
        _id: idA,
        bookingNumber: 'NX-MOCK-RETRY',
        user: null,
        paymentStatus: 'PENDING',
        bookingStatus: 'PAYMENT_PENDING',
        checkoutTokenHash: issuedRetry.tokenHash,
        checkoutTokenExpiresAt: issuedRetry.expiresAt,
        async save() { return this; },
      };
      const paymentRetry = {
        _id: paymentId,
        booking: idA,
        status: 'PENDING',
        async save() { return this; },
      };
      Payment.findById = async () => paymentRetry;
      Booking.findById = async () => bookingRetry;

      await mockProvider.completePayment(paymentId, outcome);
      assert.strictEqual(bookingRetry.checkoutTokenHash, issuedRetry.tokenHash);
      assert.strictEqual(bookingRetry.checkoutTokenExpiresAt, issuedRetry.expiresAt);

      const authRetry = await authorizeBookingCheckout(
        { headers: { 'x-checkout-token': issuedRetry.rawToken } },
        bookingRetry,
      );
      assert.strictEqual(authRetry.authorized, true);
    }
  });

  // 18. Admin JWT with MongoDB lookup failure during authorizeBookingCheckout fails closed with 500
  await check('18. Admin JWT with MongoDB lookup failure during authorizeBookingCheckout fails closed with 500', async () => {
    const bookingA = {
      _id: idA,
      bookingNumber: 'NX-ADMIN-DB-ERR',
      user: null,
      paymentStatus: 'PENDING',
      bookingStatus: 'PAYMENT_PENDING',
      checkoutTokenHash: '',
      checkoutTokenExpiresAt: null,
    };
    Booking.findById = () => makeQuery(bookingA);
    User.findById = () => ({
      select() {
        return {
          lean: async () => {
            throw new Error('MongoNetworkError: ECONNREFUSED internal-atlas-host:27017');
          },
        };
      },
    });

    let createOrReuseCalls = 0;
    paymentService.createOrReuseCheckout = async () => {
      createOrReuseCalls += 1;
      throw new Error('createOrReuseCheckout must not be invoked when admin DB lookup fails');
    };

    const directAuth = await authorizeBookingCheckout(
      { user: { userId: adminId, role: 'admin' }, headers: {} },
      bookingA,
    );
    assert.strictEqual(directAuth.authorized, false);
    assert.strictEqual(directAuth.statusCode, 500);
    assert.ok(!String(directAuth.message).includes('MongoNetworkError'));
    assert.ok(!String(directAuth.message).includes('ECONNREFUSED'));
    assert.ok(!String(directAuth.message).includes('internal-atlas-host'));

    const res = createMockRes();
    await paymentController.createPayment(
      { body: { bookingId: idA }, user: { userId: adminId, role: 'admin' }, headers: {} },
      res,
      (err) => { if (err) throw err; },
    );
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.body?.success, false);
    const serialized = JSON.stringify(res.body);
    assert.ok(!serialized.includes('MongoNetworkError'));
    assert.ok(!serialized.includes('ECONNREFUSED'));
    assert.ok(!serialized.includes('internal-atlas-host'));
    assert.strictEqual(createOrReuseCalls, 0, 'payment creation service must not be invoked on DB error');
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\nResults: ${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
