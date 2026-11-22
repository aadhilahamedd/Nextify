/**
 * Final Moyasar Payment Security Hardening Tests
 * Run: node Backend/tests/moyasarHardening.test.js
 * Uses in-memory Mongoose stubs and mocked global.fetch (no live MongoDB or Moyasar API calls).
 */
const assert = require('assert');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const moyasarProvider = require('../services/paymentProviders/moyasarPaymentProvider');
const { assertPaymentMode, assertWebhookMode } = require('../services/paymentProviders/moyasarConfig');
const { generateCheckoutToken } = require('../utils/checkoutToken');

const results = [];

async function check(name, fn) {
  const origEnv = {
    NODE_ENV: process.env.NODE_ENV,
    MOYASAR_ENV: process.env.MOYASAR_ENV,
    MOYASAR_SECRET_KEY: process.env.MOYASAR_SECRET_KEY,
    MOYASAR_PUBLISHABLE_KEY: process.env.MOYASAR_PUBLISHABLE_KEY,
    MOYASAR_WEBHOOK_SECRET: process.env.MOYASAR_WEBHOOK_SECRET,
    MOYASAR_LOG_WEBHOOK_VERIFICATION_CODE: process.env.MOYASAR_LOG_WEBHOOK_VERIFICATION_CODE,
  };
  const origFetch = global.fetch;
  const origStartSession = mongoose.startSession;
  const origPaymentFindOne = Payment.findOne;
  const origPaymentFindById = Payment.findById;
  const origPaymentFindOneAndUpdate = Payment.findOneAndUpdate;
  const origPaymentUpdateOne = Payment.updateOne;
  const origPaymentCreate = Payment.create;
  const origBookingFindById = Booking.findById;
  const origBookingFindOneAndUpdate = Booking.findOneAndUpdate;
  const origBookingUpdateOne = Booking.updateOne;

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
    mongoose.startSession = origStartSession;
    Payment.findOne = origPaymentFindOne;
    Payment.findById = origPaymentFindById;
    Payment.findOneAndUpdate = origPaymentFindOneAndUpdate;
    Payment.updateOne = origPaymentUpdateOne;
    Payment.create = origPaymentCreate;
    Booking.findById = origBookingFindById;
    Booking.findOneAndUpdate = origBookingFindOneAndUpdate;
    Booking.updateOne = origBookingUpdateOne;
  }
}

function setMoyasarMode(mode) {
  process.env.MOYASAR_ENV = mode;
  process.env.MOYASAR_SECRET_KEY = mode === 'live' ? 'sk_live_hardening_test' : 'sk_test_hardening_test';
  process.env.MOYASAR_PUBLISHABLE_KEY = mode === 'live' ? 'pk_live_hardening_test' : 'pk_test_hardening_test';
  process.env.MOYASAR_WEBHOOK_SECRET = 'whsec_hardening_test_secret';
}

function stubMoyasar(payload) {
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => payload,
  });
}

async function run() {
  const BOOKING_ID = '507f191e810c19729de861a1';
  const PAY_ID = '507f191e810c19729de861b1';

  // 1. TEST payment rejected in LIVE mode before any DB lookup or state change
  await check('1. TEST payment (live: false) rejected in LIVE mode before DB access', async () => {
    setMoyasarMode('live');
    stubMoyasar({
      id: 'pay_test_in_live',
      status: 'paid',
      amount: 18000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: PAY_ID, booking_number: 'NX-M1' },
    });

    let dbTouched = false;
    Payment.findOne = async () => { dbTouched = true; return null; };
    Payment.findById = async () => { dbTouched = true; return null; };
    Booking.findById = async () => { dbTouched = true; return null; };

    let caught = null;
    try {
      await moyasarProvider.verifyPayment('pay_test_in_live');
    } catch (err) {
      caught = err;
    }
    assert.ok(caught);
    assert.strictEqual(caught.statusCode, 409);
    assert.match(caught.message, /MOYASAR_ENV/i);
    assert.strictEqual(dbTouched, false, 'must reject mode mismatch before any DB read/write');
  });

  // 2. LIVE payment rejected in TEST mode before any DB lookup or state change
  await check('2. LIVE payment (live: true) rejected in TEST mode before DB access', async () => {
    setMoyasarMode('test');
    stubMoyasar({
      id: 'pay_live_in_test',
      status: 'paid',
      amount: 18000,
      currency: 'SAR',
      live: true,
      metadata: { payment_id: PAY_ID, booking_number: 'NX-M2' },
    });

    let dbTouched = false;
    Payment.findOne = async () => { dbTouched = true; return null; };
    Payment.findById = async () => { dbTouched = true; return null; };

    let caught = null;
    try {
      await moyasarProvider.verifyPayment('pay_live_in_test');
    } catch (err) {
      caught = err;
    }
    assert.ok(caught);
    assert.strictEqual(caught.statusCode, 409);
    assert.strictEqual(dbTouched, false);
  });

  // 3. Invalid live mode values rejected in both verifyPayment and attachReference
  await check('3. Invalid live mode values (null, strings, 0, 1) rejected with 409 in verifyPayment and attachReference', async () => {
    setMoyasarMode('test');
    for (const badLive of [null, 'false', 'true', 0, 1]) {
      assert.throws(() => assertPaymentMode({ live: badLive }), /invalid/i);

      stubMoyasar({
        id: 'pay_bad_mode',
        status: 'paid',
        amount: 18000,
        currency: 'SAR',
        live: badLive,
        metadata: { payment_id: PAY_ID, booking_number: 'NX-M3' },
      });

      let verifyErr = null;
      try {
        await moyasarProvider.verifyPayment('pay_bad_mode');
      } catch (err) {
        verifyErr = err;
      }
      assert.ok(verifyErr && verifyErr.statusCode === 409);

      Payment.findById = async () => ({
        _id: PAY_ID,
        booking: BOOKING_ID,
        bookingNumber: 'NX-M3',
        amount: 180,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: '',
        status: 'PENDING',
        metadata: { env: 'test' },
      });
      let attachErr = null;
      try {
        await moyasarProvider.attachReference(PAY_ID, 'pay_bad_mode');
      } catch (err) {
        attachErr = err;
      }
      assert.ok(attachErr && attachErr.statusCode === 409);
    }
  });

  // 4. Wrong booking metadata, local payment ID, amount, and currency rejected
  await check('4. Wrong metadata, payment ID, amount, and currency are rejected', async () => {
    setMoyasarMode('test');
    const local = {
      _id: PAY_ID,
      booking: BOOKING_ID,
      bookingNumber: 'NX-OWN',
      amount: 250,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: '',
      status: 'PENDING',
    };
    Payment.findById = async () => local;

    const badPayloads = [
      { id: 'pay_m_1', status: 'paid', amount: 25000, currency: 'SAR', live: false, metadata: { payment_id: PAY_ID, booking_number: 'NX-WRONG' } },
      { id: 'pay_m_2', status: 'paid', amount: 25000, currency: 'SAR', live: false, metadata: { payment_id: 'other_pay_id', booking_number: 'NX-OWN' } },
      { id: 'pay_m_3', status: 'paid', amount: 100, currency: 'SAR', live: false, metadata: { payment_id: PAY_ID, booking_number: 'NX-OWN' } },
      { id: 'pay_m_4', status: 'paid', amount: 25000, currency: 'USD', live: false, metadata: { payment_id: PAY_ID, booking_number: 'NX-OWN' } },
    ];

    for (const p of badPayloads) {
      stubMoyasar(p);
      let caught = null;
      try {
        await moyasarProvider.attachReference(PAY_ID, p.id);
      } catch (err) {
        caught = err;
      }
      assert.ok(caught && caught.statusCode === 409, `must reject ${p.id}`);
    }
  });

  // 5. Arbitrary / unverified Moyasar IDs cannot generate false duplicate-charge records on PAID payment
  await check('5. Arbitrary Moyasar IDs cannot pollute duplicateChargeIds on PAID payment via attachReference', async () => {
    setMoyasarMode('test');
    const paidLocal = {
      _id: PAY_ID,
      booking: BOOKING_ID,
      bookingNumber: 'NX-PAID-SAFE',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: 'pay_legit_first',
      status: 'PAID',
      metadata: { env: 'test' },
    };
    Payment.findById = async () => paidLocal;

    let updateOneCalls = 0;
    Payment.updateOne = async () => {
      updateOneCalls += 1;
      return { modifiedCount: 1 };
    };

    // Case A: Non-existent / forged Moyasar ID -> Moyasar returns 404
    global.fetch = async () => ({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not found' }),
    });
    let errA = null;
    try {
      await moyasarProvider.attachReference(PAY_ID, 'pay_forged_garbage_999');
    } catch (err) {
      errA = err;
    }
    assert.ok(errA && errA.statusCode === 404);
    assert.strictEqual(updateOneCalls, 0, 'forged ID must never record duplicate charge');

    // Case B: Moyasar ID belongs to a different booking -> 409 ownership error, no duplicate recorded
    stubMoyasar({
      id: 'pay_other_booking',
      status: 'paid',
      amount: 18000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: 'other_pay', booking_number: 'NX-OTHER' },
    });
    let errB = null;
    try {
      await moyasarProvider.attachReference(PAY_ID, 'pay_other_booking');
    } catch (err) {
      errB = err;
    }
    assert.ok(errB && errB.statusCode === 409);
    assert.strictEqual(updateOneCalls, 0, 'other-booking payment must never record duplicate charge');

    // Case C: Verified second PAID charge belonging to THIS same booking/payment -> DOES record duplicate charge
    stubMoyasar({
      id: 'pay_real_second_charge',
      status: 'paid',
      amount: 18000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: PAY_ID, booking_number: 'NX-PAID-SAFE' },
    });
    let errC = null;
    try {
      await moyasarProvider.attachReference(PAY_ID, 'pay_real_second_charge');
    } catch (err) {
      errC = err;
    }
    assert.ok(errC && errC.statusCode === 409 && errC.manualInterventionRequired === true);
    assert.strictEqual(updateOneCalls, 1, 'verified second PAID charge must record duplicate charge');
  });

  // 6. Repeated successful verification repairs booking whose previous DB update failed (reused: true)
  await check('6. Repeated PAID verification reconciles unconfirmed Booking and keeps reused: true', async () => {
    setMoyasarMode('test');
    const issued = generateCheckoutToken();
    const moyasarId = 'pay_reconcile_paid';
    const localPayment = {
      _id: PAY_ID,
      booking: BOOKING_ID,
      bookingNumber: 'NX-REC-PAID',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: moyasarId,
      status: 'PAID', // Already marked PAID before previous crash/failure
      metadata: { env: 'test' },
    };
    const bookingDoc = {
      _id: BOOKING_ID,
      bookingNumber: 'NX-REC-PAID',
      paymentStatus: 'PENDING', // Previous Booking update had failed!
      bookingStatus: 'PAYMENT_PENDING',
      checkoutTokenHash: issued.tokenHash,
      checkoutTokenExpiresAt: issued.expiresAt,
    };

    stubMoyasar({
      id: moyasarId,
      status: 'paid',
      amount: 18000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: PAY_ID, booking_number: 'NX-REC-PAID' },
    });

    Payment.findOne = async (q) => (q.providerReference === moyasarId ? localPayment : null);
    Payment.findById = async () => localPayment;
    Booking.findById = async () => bookingDoc;
    Booking.findOneAndUpdate = async (filter, update) => {
      assert.deepStrictEqual(filter.paymentStatus, { $nin: ['PAID', 'REFUNDED'] });
      Object.assign(bookingDoc, update.$set);
      return bookingDoc;
    };

    const res = await moyasarProvider.verifyPayment(moyasarId);
    assert.strictEqual(res.mappedStatus, 'PAID');
    assert.strictEqual(res.reused, true, 'recovery must keep reused: true so no duplicate WhatsApp notification fires');
    assert.strictEqual(res.booking.paymentStatus, 'PAID');
    assert.strictEqual(res.booking.bookingStatus, 'CONFIRMED');
    assert.strictEqual(res.booking.checkoutTokenHash, '');
    assert.strictEqual(res.booking.checkoutTokenExpiresAt, null);
  });

  // 7. Repeated failed/cancelled verification reconciles PENDING booking without touching PAID/REFUNDED or token
  await check('7. Repeated failed/cancelled verification reconciles PENDING booking safely', async () => {
    setMoyasarMode('test');
    const issued = generateCheckoutToken();
    const moyasarId = 'pay_reconcile_fail';
    const localPayment = {
      _id: PAY_ID,
      booking: BOOKING_ID,
      bookingNumber: 'NX-REC-FAIL',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: moyasarId,
      status: 'FAILED', // Already marked FAILED before previous Booking update failed
      metadata: { env: 'test' },
    };
    const bookingDoc = {
      _id: BOOKING_ID,
      bookingNumber: 'NX-REC-FAIL',
      paymentStatus: 'PENDING',
      bookingStatus: 'PAYMENT_PENDING',
      checkoutTokenHash: issued.tokenHash,
      checkoutTokenExpiresAt: issued.expiresAt,
    };

    stubMoyasar({
      id: moyasarId,
      status: 'failed',
      amount: 18000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: PAY_ID, booking_number: 'NX-REC-FAIL' },
    });

    Payment.findOne = async (q) => (q.providerReference === moyasarId ? localPayment : null);
    Payment.findById = async () => localPayment;
    Booking.findById = async () => bookingDoc;
    Booking.updateOne = async (filter, update) => {
      assert.deepStrictEqual(filter.paymentStatus, { $nin: ['PAID', 'REFUNDED'] });
      Object.assign(bookingDoc, update.$set);
      return { modifiedCount: 1 };
    };

    const res = await moyasarProvider.verifyPayment(moyasarId);
    assert.strictEqual(res.mappedStatus, 'FAILED');
    assert.strictEqual(res.reused, true);
    assert.strictEqual(bookingDoc.paymentStatus, 'FAILED');
    assert.strictEqual(bookingDoc.bookingStatus, 'CANCELLED');
    assert.strictEqual(bookingDoc.checkoutTokenHash, issued.tokenHash, 'failed retry must keep valid checkout token');
  });

  // 8. Concurrent verification of the same payment reconciles cleanly without duplicate-charge false positive
  await check('8. Concurrent verification of same PAID payment has one winner and one idempotent recovery', async () => {
    setMoyasarMode('test');
    const moyasarId = 'pay_concurrent_same';
    const localPayment = {
      _id: PAY_ID,
      booking: BOOKING_ID,
      bookingNumber: 'NX-CONC-V',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: moyasarId,
      status: 'PENDING',
      metadata: { env: 'test' },
    };
    const bookingDoc = {
      _id: BOOKING_ID,
      bookingNumber: 'NX-CONC-V',
      paymentStatus: 'PENDING',
      bookingStatus: 'PAYMENT_PENDING',
      checkoutTokenHash: 'a'.repeat(64),
      checkoutTokenExpiresAt: new Date(Date.now() + 60_000),
    };

    stubMoyasar({
      id: moyasarId,
      status: 'paid',
      amount: 18000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: PAY_ID, booking_number: 'NX-CONC-V' },
    });

    Payment.findOne = async (q) => (q.providerReference === moyasarId ? { ...localPayment } : null);
    Payment.findById = async () => ({ ...localPayment });
    Payment.findOneAndUpdate = async (filter, update) => {
      if (localPayment.status === 'PAID') return null;
      Object.assign(localPayment, {
        status: update.$set.status,
        providerReference: update.$set.providerReference,
      });
      return { ...localPayment };
    };
    Booking.findById = async () => ({ ...bookingDoc });
    Booking.findOneAndUpdate = async (filter, update) => {
      if (bookingDoc.paymentStatus === 'PAID') return null;
      Object.assign(bookingDoc, update.$set);
      return { ...bookingDoc };
    };

    const [r1, r2] = await Promise.all([
      moyasarProvider.verifyPayment(moyasarId),
      moyasarProvider.verifyPayment(moyasarId),
    ]);

    const winners = [r1, r2].filter((r) => r.reused === false);
    const idempotent = [r1, r2].filter((r) => r.reused === true);
    assert.strictEqual(winners.length, 1);
    assert.strictEqual(idempotent.length, 1);
    assert.strictEqual(r1.duplicateCharge, false);
    assert.strictEqual(r2.duplicateCharge, false);
    assert.strictEqual(bookingDoc.paymentStatus, 'PAID');
    assert.strictEqual(bookingDoc.bookingStatus, 'CONFIRMED');
    assert.strictEqual(bookingDoc.checkoutTokenHash, '');
  });

  // 9. Second payment cannot confirm a booking already paid by another payment
  await check('9. Second payment cannot confirm booking already paid by another payment', async () => {
    setMoyasarMode('test');
    const firstPaid = {
      _id: '507f191e810c19729de861c1',
      booking: BOOKING_ID,
      bookingNumber: 'NX-DUP-2',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: 'pay_first_winner',
      status: 'PAID',
    };
    const secondAttempt = {
      _id: '507f191e810c19729de861c2',
      booking: BOOKING_ID,
      bookingNumber: 'NX-DUP-2',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: 'pay_second_extra',
      status: 'PENDING',
      metadata: { env: 'test' },
    };
    const paidBooking = {
      _id: BOOKING_ID,
      bookingNumber: 'NX-DUP-2',
      paymentStatus: 'PAID',
      bookingStatus: 'CONFIRMED',
      checkoutTokenHash: '',
      checkoutTokenExpiresAt: null,
    };

    stubMoyasar({
      id: 'pay_second_extra',
      status: 'paid',
      amount: 18000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: secondAttempt._id, booking_number: 'NX-DUP-2' },
    });

    let dupRecordedFor = null;
    Payment.findOne = async (q) => {
      if (q.providerReference === 'pay_second_extra') return secondAttempt;
      if (q.status === 'PAID' && q._id?.$ne === secondAttempt._id) return firstPaid;
      return null;
    };
    Payment.updateOne = async (filter, update) => {
      if (update.$addToSet?.['metadata.duplicateChargeIds']) {
        dupRecordedFor = filter._id;
      }
      return { modifiedCount: 1 };
    };
    Booking.findById = async () => paidBooking;

    const res = await moyasarProvider.verifyPayment('pay_second_extra');
    assert.strictEqual(res.duplicateCharge, true);
    assert.strictEqual(res.manualInterventionRequired, true);
    assert.strictEqual(res.payment._id, firstPaid._id);
    assert.strictEqual(dupRecordedFor, firstPaid._id);
    assert.strictEqual(secondAttempt.status, 'PENDING');
  });

  // 10. Payment found by providerReference with mismatched payment_id metadata rejected before Booking lookup/state change
  await check('10. verifyPayment rejects providerReference match with mismatched payment_id metadata before DB writes', async () => {
    setMoyasarMode('test');
    const moyasarId = 'pay_ref_bad_pid';
    const localPayment = {
      _id: PAY_ID,
      booking: BOOKING_ID,
      bookingNumber: 'NX-REF-1',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: moyasarId,
      status: 'PENDING',
      metadata: { env: 'test' },
    };
    stubMoyasar({
      id: moyasarId,
      status: 'paid',
      amount: 18000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: 'different_local_payment_id', booking_number: 'NX-REF-1' },
    });

    let bookingLookupCalled = false;
    let writeCalled = false;
    Payment.findOne = async (q) => (q.providerReference === moyasarId ? localPayment : null);
    Booking.findById = async () => { bookingLookupCalled = true; return null; };
    Payment.findOneAndUpdate = async () => { writeCalled = true; return null; };
    Booking.findOneAndUpdate = async () => { writeCalled = true; return null; };

    let caught = null;
    try {
      await moyasarProvider.verifyPayment(moyasarId);
    } catch (err) {
      caught = err;
    }
    assert.ok(caught);
    assert.strictEqual(caught.statusCode, 409);
    assert.match(caught.message, /payment attempt/i);
    assert.strictEqual(bookingLookupCalled, false, 'must reject before looking up booking');
    assert.strictEqual(writeCalled, false, 'must reject before any DB state change');
  });

  // 11. Payment found by providerReference with mismatched booking_number metadata rejected before Booking lookup/state change
  await check('11. verifyPayment rejects providerReference match with mismatched booking_number metadata', async () => {
    setMoyasarMode('test');
    const moyasarId = 'pay_ref_bad_bno';
    const localPayment = {
      _id: PAY_ID,
      booking: BOOKING_ID,
      bookingNumber: 'NX-REF-2',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: moyasarId,
      status: 'PENDING',
      metadata: { env: 'test' },
    };
    stubMoyasar({
      id: moyasarId,
      status: 'paid',
      amount: 18000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: PAY_ID, booking_number: 'NX-OTHER-BOOKING' },
    });

    let bookingLookupCalled = false;
    Payment.findOne = async (q) => (q.providerReference === moyasarId ? localPayment : null);
    Booking.findById = async () => { bookingLookupCalled = true; return null; };

    let caught = null;
    try {
      await moyasarProvider.verifyPayment(moyasarId);
    } catch (err) {
      caught = err;
    }
    assert.ok(caught);
    assert.strictEqual(caught.statusCode, 409);
    assert.match(caught.message, /booking/i);
    assert.strictEqual(bookingLookupCalled, false);
  });

  // 12. Refunding the actual sole funded payment updates booking to REFUNDED
  await check('12. Refunding the sole funded payment transitions booking to REFUNDED', async () => {
    setMoyasarMode('test');
    const moyasarId = 'pay_sole_funded';
    const solePaid = {
      _id: PAY_ID,
      booking: BOOKING_ID,
      bookingNumber: 'NX-REFUND-SOLE',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: moyasarId,
      status: 'PAID',
      metadata: { env: 'test' },
    };
    const bookingDoc = {
      _id: BOOKING_ID,
      bookingNumber: 'NX-REFUND-SOLE',
      paymentStatus: 'PAID',
      bookingStatus: 'CONFIRMED',
    };
    stubMoyasar({
      id: moyasarId,
      status: 'refunded',
      amount: 18000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: PAY_ID, booking_number: 'NX-REFUND-SOLE' },
    });

    Payment.findOne = async (q) => {
      if (q.providerReference === moyasarId) return solePaid;
      return null; // No other PAID payment exists
    };
    Payment.findOneAndUpdate = async (filter, update) => {
      solePaid.status = update.$set.status;
      return { ...solePaid };
    };
    Payment.findById = async () => ({ ...solePaid });
    Booking.findById = async () => ({ ...bookingDoc });
    Booking.updateOne = async (filter, update) => {
      assert.strictEqual(filter.paymentStatus, 'PAID');
      Object.assign(bookingDoc, update.$set);
      return { modifiedCount: 1 };
    };

    const res = await moyasarProvider.verifyPayment(moyasarId);
    assert.strictEqual(res.mappedStatus, 'REFUNDED');
    assert.strictEqual(res.reused, false);
    assert.strictEqual(bookingDoc.paymentStatus, 'REFUNDED');
    assert.strictEqual(bookingDoc.bookingStatus, 'CONFIRMED');
  });

  // 13. Refunding a second payment attempt does NOT refund booking still funded by primary PAID payment
  await check('13. Refunding a duplicate/second payment does not refund booking still funded by primary PAID payment', async () => {
    setMoyasarMode('test');
    const primaryPaid = {
      _id: '507f191e810c19729de861d1',
      booking: BOOKING_ID,
      bookingNumber: 'NX-REFUND-DUP',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: 'pay_primary_funded',
      status: 'PAID',
    };
    const secondExtra = {
      _id: '507f191e810c19729de861d2',
      booking: BOOKING_ID,
      bookingNumber: 'NX-REFUND-DUP',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: 'pay_extra_refunded',
      status: 'PAID',
      metadata: { env: 'test' },
    };
    const bookingDoc = {
      _id: BOOKING_ID,
      bookingNumber: 'NX-REFUND-DUP',
      paymentStatus: 'PAID',
      bookingStatus: 'CONFIRMED',
    };

    stubMoyasar({
      id: 'pay_extra_refunded',
      status: 'refunded',
      amount: 18000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: secondExtra._id, booking_number: 'NX-REFUND-DUP' },
    });

    let bookingMarkedRefunded = false;
    Payment.findOne = async (q) => {
      if (q.providerReference === 'pay_extra_refunded') return secondExtra;
      if (q.status === 'PAID' && String(q._id?.$ne) === String(secondExtra._id)) return primaryPaid;
      return null;
    };
    Payment.findOneAndUpdate = async (filter, update) => {
      secondExtra.status = update.$set.status;
      return { ...secondExtra };
    };
    Payment.findById = async () => ({ ...secondExtra });
    Booking.findById = async () => ({ ...bookingDoc });
    Booking.updateOne = async (_filter, update) => {
      if (update?.$set?.paymentStatus === 'REFUNDED') bookingMarkedRefunded = true;
      Object.assign(bookingDoc, update?.$set || {});
      return { modifiedCount: 1 };
    };

    const res = await moyasarProvider.verifyPayment('pay_extra_refunded');
    assert.strictEqual(res.mappedStatus, 'REFUNDED');
    assert.strictEqual(secondExtra.status, 'REFUNDED');
    assert.strictEqual(bookingMarkedRefunded, false, 'booking must NOT be marked REFUNDED while primary payment is still PAID');
    assert.strictEqual(bookingDoc.paymentStatus, 'PAID');
  });

  // 14. Duplicate-payment race: another payment becomes PAID between initial check and post-refund funding check
  await check('14. Duplicate-payment race: post-refund funding check prevents incorrect REFUNDED booking update', async () => {
    setMoyasarMode('test');
    const firstPaid = {
      _id: '507f191e810c19729de861e1',
      booking: BOOKING_ID,
      bookingNumber: 'NX-REFUND-RACE',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: 'pay_first_refunding',
      status: 'PAID',
      metadata: { env: 'test' },
    };
    const concurrentSecondPaid = {
      _id: '507f191e810c19729de861e2',
      booking: BOOKING_ID,
      bookingNumber: 'NX-REFUND-RACE',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: 'pay_second_concurrent',
      status: 'PAID',
    };
    const bookingDoc = {
      _id: BOOKING_ID,
      bookingNumber: 'NX-REFUND-RACE',
      paymentStatus: 'PAID',
      bookingStatus: 'CONFIRMED',
    };

    stubMoyasar({
      id: 'pay_first_refunding',
      status: 'refunded',
      amount: 18000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: firstPaid._id, booking_number: 'NX-REFUND-RACE' },
    });

    let otherPaidQueryCount = 0;
    let bookingMarkedRefunded = false;
    Payment.findOne = async (q) => {
      if (q.providerReference === 'pay_first_refunding') return firstPaid;
      if (q.status === 'PAID' && String(q._id?.$ne) === String(firstPaid._id)) {
        otherPaidQueryCount += 1;
        // 1st call (before refund): no other PAID payment yet; 2nd call (after refund): concurrent payment is now PAID!
        return otherPaidQueryCount === 1 ? null : concurrentSecondPaid;
      }
      return null;
    };
    Payment.findOneAndUpdate = async (filter, update) => {
      firstPaid.status = update.$set.status;
      return { ...firstPaid };
    };
    Payment.findById = async () => ({ ...firstPaid });
    Booking.findById = async () => ({ ...bookingDoc });
    Booking.updateOne = async (_filter, update) => {
      if (update?.$set?.paymentStatus === 'REFUNDED') bookingMarkedRefunded = true;
      Object.assign(bookingDoc, update?.$set || {});
      return { modifiedCount: 1 };
    };

    await moyasarProvider.verifyPayment('pay_first_refunding');
    assert.strictEqual(otherPaidQueryCount, 2, 'must re-check funding payments after marking refund');
    assert.strictEqual(bookingMarkedRefunded, false, 'must not mark booking REFUNDED when concurrent payment now funds it');
    assert.strictEqual(bookingDoc.paymentStatus, 'PAID');
  });

  // 15. Repeated refund webhooks remain idempotent and reconcile booking if previous update failed
  await check('15. Repeated refund webhooks are idempotent and reconcile missed booking update', async () => {
    setMoyasarMode('test');
    const moyasarId = 'pay_refund_idem';
    const paidDoc = {
      _id: PAY_ID,
      booking: BOOKING_ID,
      bookingNumber: 'NX-REFUND-IDEM',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: moyasarId,
      status: 'REFUNDED', // Already marked REFUNDED by first attempt, but booking update had failed
      metadata: { env: 'test' },
    };
    const bookingDoc = {
      _id: BOOKING_ID,
      bookingNumber: 'NX-REFUND-IDEM',
      paymentStatus: 'PAID',
      bookingStatus: 'CONFIRMED',
    };
    stubMoyasar({
      id: moyasarId,
      status: 'refunded',
      amount: 18000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: PAY_ID, booking_number: 'NX-REFUND-IDEM' },
    });

    Payment.findOne = async (q) => (q.providerReference === moyasarId ? paidDoc : null);
    Payment.findOneAndUpdate = async () => null; // Already REFUNDED
    Payment.findById = async () => ({ ...paidDoc });
    Booking.findById = async () => ({ ...bookingDoc });
    let bookingUpdates = 0;
    Booking.updateOne = async (filter, update) => {
      if (bookingDoc.paymentStatus === filter.paymentStatus) {
        bookingUpdates += 1;
        Object.assign(bookingDoc, update.$set);
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    };

    const r1 = await moyasarProvider.verifyPayment(moyasarId);
    assert.strictEqual(r1.reused, true);
    assert.strictEqual(bookingDoc.paymentStatus, 'REFUNDED');
    assert.strictEqual(bookingUpdates, 1);

    // Repeat again: stays idempotent, 0 additional booking transitions
    const r2 = await moyasarProvider.verifyPayment(moyasarId);
    assert.strictEqual(r2.reused, true);
    assert.strictEqual(bookingDoc.paymentStatus, 'REFUNDED');
    assert.strictEqual(bookingUpdates, 1);
  });

  // 16. Multi-hop retry ownership (P0 -> P1 -> P2 -> P3) retains P0 as canonical owner and rejects intermediate retryOf
  await check('16. Multi-hop retry chain P0 -> P1 -> P2 -> P3 preserves P0 canonical owner and does not broaden via retryOf', async () => {
    setMoyasarMode('test');
    const store = new Map();
    const p0 = {
      _id: '507f191e810c19729de86200',
      booking: BOOKING_ID,
      bookingNumber: 'NX-CHAIN',
      amount: 250,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: 'pay_hop_0',
      status: 'FAILED',
      metadata: { env: 'test' },
    };
    store.set(p0._id, p0);

    let seq = 1;
    Payment.findById = async (id) => store.get(String(id)) || null;
    Payment.findOne = async (q) => {
      for (const doc of store.values()) {
        if (q.providerReference && doc.providerReference === q.providerReference) return doc;
      }
      return null;
    };
    Payment.create = async (doc) => {
      const created = { _id: `507f191e810c19729de8620${seq}`, ...doc };
      seq += 1;
      store.set(created._id, created);
      return created;
    };

    // P0 -> P1
    stubMoyasar({ id: 'pay_hop_1', status: 'failed', amount: 25000, currency: 'SAR', live: false, metadata: { payment_id: p0._id, booking_number: 'NX-CHAIN' } });
    const p1 = await moyasarProvider.attachReference(p0._id, 'pay_hop_1');
    assert.strictEqual(String(p1.metadata.retryOf), p0._id);
    assert.strictEqual(p1.metadata.ownedByPaymentId, p0._id);

    // P1 -> P2
    stubMoyasar({ id: 'pay_hop_2', status: 'failed', amount: 25000, currency: 'SAR', live: false, metadata: { payment_id: p0._id, booking_number: 'NX-CHAIN' } });
    const p2 = await moyasarProvider.attachReference(p1._id, 'pay_hop_2');
    assert.strictEqual(String(p2.metadata.retryOf), p1._id);
    assert.strictEqual(p2.metadata.ownedByPaymentId, p0._id);

    // P2 -> P3
    stubMoyasar({ id: 'pay_hop_3', status: 'paid', amount: 25000, currency: 'SAR', live: false, metadata: { payment_id: p0._id, booking_number: 'NX-CHAIN' } });
    const p3 = await moyasarProvider.attachReference(p2._id, 'pay_hop_3');
    assert.strictEqual(String(p3.metadata.retryOf), p2._id);
    assert.strictEqual(p3.metadata.ownedByPaymentId, p0._id);

    // Ownership check on P3 accepts P0 (canonical root owner)
    assert.doesNotThrow(() => moyasarProvider.assertMoyasarOwnership(p3, {
      id: 'pay_hop_3',
      amount: 25000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: p0._id, booking_number: 'NX-CHAIN' },
    }));

    // Ownership check on P3 REJECTS intermediate retryOf (P2._id) — proves retryOf does not broaden acceptance
    assert.throws(() => moyasarProvider.assertMoyasarOwnership(p3, {
      id: 'pay_hop_3',
      amount: 25000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: p2._id, booking_number: 'NX-CHAIN' },
    }), /payment attempt/i);
  });

  // 17. Hardened 11000 duplicate-key recovery in attachReference()
  await check('17. Duplicate-key (11000) recovery rejects mismatched bookingNumber/owner/provider and accepts exact valid match', async () => {
    setMoyasarMode('test');
    const p0 = {
      _id: '507f191e810c19729de86210',
      booking: BOOKING_ID,
      bookingNumber: 'NX-DUP-REC',
      amount: 250,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: 'pay_initial',
      status: 'FAILED',
      metadata: { env: 'test' },
    };
    const moyasarPayload = {
      id: 'pay_race_ref',
      status: 'pending',
      amount: 25000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: p0._id, booking_number: 'NX-DUP-REC' },
    };
    stubMoyasar(moyasarPayload);

    Payment.findById = async () => p0;
    Payment.create = async () => {
      const err = new Error('E11000 duplicate key');
      err.code = 11000;
      throw err;
    };

    const badCandidates = [
      { label: 'wrong bookingNumber', doc: { _id: 'p_x1', booking: BOOKING_ID, bookingNumber: 'NX-OTHER', amount: 250, currency: 'SAR', provider: 'moyasar', providerReference: 'pay_race_ref', metadata: { ownedByPaymentId: p0._id } } },
      { label: 'wrong owner chain', doc: { _id: 'p_x2', booking: BOOKING_ID, bookingNumber: 'NX-DUP-REC', amount: 250, currency: 'SAR', provider: 'moyasar', providerReference: 'pay_race_ref', metadata: { ownedByPaymentId: 'other_root_owner' } } },
      { label: 'wrong provider', doc: { _id: 'p_x3', booking: BOOKING_ID, bookingNumber: 'NX-DUP-REC', amount: 250, currency: 'SAR', provider: 'mock', providerReference: 'pay_race_ref', metadata: { ownedByPaymentId: p0._id } } },
      { label: 'wrong amount', doc: { _id: 'p_x4', booking: BOOKING_ID, bookingNumber: 'NX-DUP-REC', amount: 999, currency: 'SAR', provider: 'moyasar', providerReference: 'pay_race_ref', metadata: { ownedByPaymentId: p0._id } } },
    ];

    for (const c of badCandidates) {
      let findOneCalls = 0;
      Payment.findOne = async () => {
        findOneCalls += 1;
        return findOneCalls === 1 ? null : c.doc;
      };
      let caught = null;
      try {
        await moyasarProvider.attachReference(p0._id, 'pay_race_ref');
      } catch (err) {
        caught = err;
      }
      assert.ok(caught && caught.statusCode === 409, `must reject 11000 recovery with ${c.label}`);
    }

    // Valid matching record is accepted
    const validFound = {
      _id: 'p_valid_race',
      booking: BOOKING_ID,
      bookingNumber: 'NX-DUP-REC',
      amount: 250,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: 'pay_race_ref',
      metadata: { env: 'test', ownedByPaymentId: p0._id },
    };
    let findCalls = 0;
    Payment.findOne = async () => {
      findCalls += 1;
      return findCalls === 1 ? null : validFound;
    };
    const recovered = await moyasarProvider.attachReference(p0._id, 'pay_race_ref');
    assert.strictEqual(recovered._id, 'p_valid_race');
  });

  // 18. Transaction session propagation, WriteConflict retry, and production fail-closed
  await check('18. Transactions propagate session, retry WriteConflict with fresh state, and fail closed in production', async () => {
    setMoyasarMode('test');
    const moyasarId = 'pay_tx_prop';
    const localPayment = {
      _id: PAY_ID,
      booking: BOOKING_ID,
      bookingNumber: 'NX-TX-1',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: moyasarId,
      status: 'PENDING',
      metadata: { env: 'test' },
    };
    const bookingDoc = {
      _id: BOOKING_ID,
      bookingNumber: 'NX-TX-1',
      paymentStatus: 'PENDING',
      bookingStatus: 'PAYMENT_PENDING',
      checkoutTokenHash: 'b'.repeat(64),
      checkoutTokenExpiresAt: new Date(Date.now() + 60_000),
    };
    stubMoyasar({
      id: moyasarId,
      status: 'paid',
      amount: 18000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: PAY_ID, booking_number: 'NX-TX-1' },
    });

    const fakeSession = { id: 'mock_tx_session_1' };
    let txAttempts = 0;
    let ended = false;
    const seenSessions = [];

    const mockStartSession = async () => ({
      ...fakeSession,
      async withTransaction(fn) {
        txAttempts += 1;
        // Simulate first attempt hitting WriteConflict (TransientTransactionError) and retrying
        await fn();
        if (txAttempts === 1) {
          txAttempts += 1;
          // Reset state as if first attempt rolled back, then retry with fresh reads
          localPayment.status = 'PENDING';
          bookingDoc.paymentStatus = 'PENDING';
          await fn();
        }
      },
      async endSession() { ended = true; },
    });
    mockStartSession._isTestMock = true;
    mongoose.startSession = mockStartSession;

    Payment.findOne = async (q, _proj, opts) => {
      if (q.providerReference === moyasarId) return { ...localPayment };
      if (opts?.session) seenSessions.push('Payment.findOne');
      return null;
    };
    Payment.findById = async (_id, _proj, opts) => {
      if (opts?.session) seenSessions.push('Payment.findById');
      return { ...localPayment };
    };
    Payment.findOneAndUpdate = async (filter, update, opts) => {
      if (opts?.session) seenSessions.push('Payment.findOneAndUpdate');
      Object.assign(localPayment, update.$set);
      return { ...localPayment };
    };
    Booking.findById = async (_id, _proj, opts) => {
      if (opts?.session) seenSessions.push('Booking.findById');
      return { ...bookingDoc };
    };
    Booking.findOneAndUpdate = async (filter, update, opts) => {
      if (opts?.session) seenSessions.push('Booking.findOneAndUpdate');
      Object.assign(bookingDoc, update.$set);
      return { ...bookingDoc };
    };

    const res = await moyasarProvider.verifyPayment(moyasarId);
    assert.strictEqual(res.mappedStatus, 'PAID');
    assert.strictEqual(ended, true, 'session must always be ended');
    assert.ok(txAttempts >= 2, 'must retry on transient conflict');
    for (const op of ['Payment.findById', 'Payment.findOne', 'Payment.findOneAndUpdate', 'Booking.findById', 'Booking.findOneAndUpdate']) {
      assert.ok(seenSessions.includes(op), `expected ${op} to receive transaction session`);
    }

    // Production fail-closed when transactions are unavailable (disconnected or standalone mongod)
    process.env.NODE_ENV = 'production';
    const failStartSession = async () => ({
      async withTransaction() {
        const err = new Error('Transaction numbers are only allowed on a replica set member or mongos');
        err.code = 20;
        err.codeName = 'IllegalOperation';
        throw err;
      },
      async endSession() {},
    });
    failStartSession._isTestMock = true;
    mongoose.startSession = failStartSession;
    localPayment.status = 'PENDING';
    bookingDoc.paymentStatus = 'PENDING';

    let prodErr = null;
    try {
      await moyasarProvider.verifyPayment(moyasarId);
    } catch (err) {
      prodErr = err;
    }
    assert.ok(prodErr && prodErr.statusCode === 503, 'production must fail closed with 503 when transactions unavailable');
  });

  // 19. Concurrent mark_paid (P2) and mark_refunded (P1) serialize on Booking and preserve consistency
  await check('19. Concurrent mark_paid and mark_refunded serialize through transaction without corrupting Booking', async () => {
    setMoyasarMode('test');
    const p1 = {
      _id: '507f191e810c19729de86221',
      booking: BOOKING_ID,
      bookingNumber: 'NX-TX-RACE',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: 'pay_tx_p1',
      status: 'PAID',
      metadata: { env: 'test' },
    };
    const p2 = {
      _id: '507f191e810c19729de86222',
      booking: BOOKING_ID,
      bookingNumber: 'NX-TX-RACE',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: 'pay_tx_p2',
      status: 'PENDING',
      metadata: { env: 'test' },
    };
    const bookingDoc = {
      _id: BOOKING_ID,
      bookingNumber: 'NX-TX-RACE',
      paymentStatus: 'PAID',
      bookingStatus: 'CONFIRMED',
      checkoutTokenHash: '',
      checkoutTokenExpiresAt: null,
    };

    // Mock serialized transaction execution on Booking
    let txChain = Promise.resolve();
    const mockStartSession = async () => ({
      async withTransaction(fn) {
        const runTx = txChain.then(() => fn());
        txChain = runTx.catch(() => {});
        return runTx;
      },
      async endSession() {},
    });
    mockStartSession._isTestMock = true;
    mongoose.startSession = mockStartSession;

    global.fetch = async (url) => {
      const target = String(url);
      if (target.includes('pay_tx_p1')) {
        return { ok: true, status: 200, json: async () => ({ id: 'pay_tx_p1', status: 'refunded', amount: 18000, currency: 'SAR', live: false, metadata: { payment_id: p1._id, booking_number: 'NX-TX-RACE' } }) };
      }
      return { ok: true, status: 200, json: async () => ({ id: 'pay_tx_p2', status: 'paid', amount: 18000, currency: 'SAR', live: false, metadata: { payment_id: p2._id, booking_number: 'NX-TX-RACE' } }) };
    };

    const allPayments = [p1, p2];
    Payment.findOne = async (q) => {
      if (q.providerReference === 'pay_tx_p1') return { ...p1 };
      if (q.providerReference === 'pay_tx_p2') return { ...p2 };
      if (q.status === 'PAID') {
        return allPayments.find((p) => p.status === 'PAID' && String(p._id) !== String(q._id?.$ne)) || null;
      }
      return null;
    };
    Payment.findById = async (id) => {
      const found = allPayments.find((p) => String(p._id) === String(id));
      return found ? { ...found } : null;
    };
    Payment.findOneAndUpdate = async (filter, update) => {
      const target = allPayments.find((p) => String(p._id) === String(filter._id));
      if (!target) return null;
      if (filter.status === 'PAID' && target.status !== 'PAID') return null;
      if (filter.status?.$ne && target.status === filter.status.$ne) return null;
      Object.assign(target, update.$set);
      return { ...target };
    };
    Payment.updateOne = async () => ({ modifiedCount: 1 });
    Booking.findById = async () => ({ ...bookingDoc });
    Booking.findOneAndUpdate = async (filter, update) => {
      if (filter.paymentStatus?.$nin?.includes(bookingDoc.paymentStatus)) return null;
      Object.assign(bookingDoc, update.$set);
      return { ...bookingDoc };
    };
    Booking.updateOne = async (filter, update) => {
      if (filter.paymentStatus && bookingDoc.paymentStatus !== filter.paymentStatus) return { modifiedCount: 0 };
      Object.assign(bookingDoc, update.$set);
      return { modifiedCount: 1 };
    };

    await Promise.all([
      moyasarProvider.verifyPayment('pay_tx_p1'),
      moyasarProvider.verifyPayment('pay_tx_p2'),
    ]);

    // Invariant: if any Payment is PAID, Booking MUST NOT be REFUNDED; if none is PAID, Booking MUST be REFUNDED.
    const survivingPaid = allPayments.some((p) => p.status === 'PAID');
    if (survivingPaid) {
      assert.strictEqual(bookingDoc.paymentStatus, 'PAID', 'Booking must remain PAID while a PAID payment survives');
    } else {
      assert.strictEqual(bookingDoc.paymentStatus, 'REFUNDED', 'Booking must be REFUNDED when no PAID payment survives');
    }
  });

  // 20. Refunded booking cannot become PAID or CONFIRMED via later successful verification or webhook
  await check('20. Refunded booking rejects later PAID verification/webhook, preserves external reference, and flags manual intervention', async () => {
    setMoyasarMode('test');
    const moyasarId = 'pay_late_after_refund';
    const localPayment = {
      _id: PAY_ID,
      booking: BOOKING_ID,
      bookingNumber: 'NX-REFUNDED-LATE',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: '',
      status: 'PENDING',
      metadata: { env: 'test' },
    };
    const refundedBooking = {
      _id: BOOKING_ID,
      bookingNumber: 'NX-REFUNDED-LATE',
      paymentStatus: 'REFUNDED',
      bookingStatus: 'CANCELLED',
      checkoutTokenHash: '',
      checkoutTokenExpiresAt: null,
    };

    stubMoyasar({
      id: moyasarId,
      status: 'paid',
      amount: 18000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: PAY_ID, booking_number: 'NX-REFUNDED-LATE' },
    });

    let paymentMarkedPaid = false;
    let bookingUpdated = false;
    let recordedUpdate = null;

    Payment.findOne = async () => null;
    Payment.findById = async () => ({ ...localPayment });
    Payment.findOneAndUpdate = async (_filter, update) => {
      if (update?.$set?.status === 'PAID') paymentMarkedPaid = true;
      return null;
    };
    Payment.updateOne = async (filter, update) => {
      recordedUpdate = { filter, update };
      if (update?.$set?.providerReference) localPayment.providerReference = update.$set.providerReference;
      Object.assign(localPayment.metadata, {
        manualInterventionRequired: update?.$set?.['metadata.manualInterventionRequired'],
        manualIntervention: update?.$set?.['metadata.manualIntervention'],
        moyasarPaymentId: update?.$set?.['metadata.moyasarPaymentId'],
        lateChargeOnRefundedBookingIds: [update?.$addToSet?.['metadata.lateChargeOnRefundedBookingIds']],
      });
      return { modifiedCount: 1 };
    };
    Booking.findById = async () => ({ ...refundedBooking });
    Booking.findOneAndUpdate = async () => {
      bookingUpdated = true;
      return null;
    };

    // Direct verification callback path
    const verifyRes = await moyasarProvider.verifyPayment(moyasarId);
    assert.strictEqual(verifyRes.paidAfterRefund, true);
    assert.strictEqual(verifyRes.manualInterventionRequired, true);
    assert.strictEqual(verifyRes.mappedStatus, 'REFUNDED');
    assert.strictEqual(verifyRes.reused, true);
    assert.strictEqual(paymentMarkedPaid, false, 'local Payment must NOT be marked PAID');
    assert.strictEqual(bookingUpdated, false, 'refunded Booking must NOT be confirmed or marked PAID');
    assert.strictEqual(localPayment.status, 'PENDING');
    assert.strictEqual(localPayment.providerReference, moyasarId, 'external Moyasar reference must be preserved');
    assert.strictEqual(recordedUpdate.update.$set['metadata.manualInterventionRequired'], true);
    assert.strictEqual(recordedUpdate.update.$set['metadata.manualIntervention'], 'refund_charge_on_refunded_booking');
    assert.strictEqual(recordedUpdate.update.$addToSet['metadata.lateChargeOnRefundedBookingIds'], moyasarId);

    // Webhook path behaves identically
    const webhookRes = await moyasarProvider.handleWebhook({
      type: 'payment_paid',
      secret_token: 'whsec_hardening_test_secret',
      live: false,
      data: { id: moyasarId, status: 'paid' },
    });
    assert.strictEqual(webhookRes.paidAfterRefund, true);
    assert.strictEqual(webhookRes.manualInterventionRequired, true);
    assert.strictEqual(webhookRes.mappedStatus, 'REFUNDED');
    assert.strictEqual(webhookRes.reused, true);
    assert.strictEqual(paymentMarkedPaid, false);
    assert.strictEqual(bookingUpdated, false);
  });

  // 21. Disconnected database fails closed with 503 in BOTH development and production unless explicitly opted in for offline unit tests
  await check('21. runPaymentTransaction fails closed with 503 on disconnected DB in both development and production', async () => {
    setMoyasarMode('test');
    const moyasarId = 'pay_disconn_503';
    const localPayment = {
      _id: PAY_ID,
      booking: BOOKING_ID,
      bookingNumber: 'NX-DISCONN',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: moyasarId,
      status: 'PENDING',
      metadata: { env: 'test' },
    };
    const bookingDoc = {
      _id: BOOKING_ID,
      bookingNumber: 'NX-DISCONN',
      paymentStatus: 'PENDING',
      bookingStatus: 'PAYMENT_PENDING',
    };
    stubMoyasar({
      id: moyasarId,
      status: 'paid',
      amount: 18000,
      currency: 'SAR',
      live: false,
      metadata: { payment_id: PAY_ID, booking_number: 'NX-DISCONN' },
    });
    Payment.findOne = async (q) => (q.providerReference === moyasarId ? { ...localPayment } : null);
    Booking.findById = async () => ({ ...bookingDoc });

    // Non-production server with disconnected DB (offline unit-test mode OFF) -> must fail closed with 503
    process.env.NODE_ENV = 'development';
    moyasarProvider._setAllowOfflineUnitTestTransactions(false);
    let devErr = null;
    try {
      await moyasarProvider.verifyPayment(moyasarId);
    } catch (err) {
      devErr = err;
    }
    assert.ok(devErr && devErr.statusCode === 503, 'disconnected development server must fail closed with 503');

    // Production server with disconnected DB -> fails closed with 503 EVEN IF offline flag were set
    process.env.NODE_ENV = 'production';
    moyasarProvider._setAllowOfflineUnitTestTransactions(true);
    let prodErr = null;
    try {
      await moyasarProvider.verifyPayment(moyasarId);
    } catch (err) {
      prodErr = err;
    }
    assert.ok(prodErr && prodErr.statusCode === 503, 'disconnected production server must always fail closed with 503');
  });

  // 22. createPayment restores previous booking status on non-11000 Payment.create failure when no open PENDING attempt exists
  await check('22. createPayment restores previous booking status on non-11000 Payment.create failure', async () => {
    const bookingDoc = {
      _id: BOOKING_ID,
      bookingNumber: 'NX-CREATE-REC-1',
      paymentStatus: 'FAILED',
      bookingStatus: 'CANCELLED',
    };
    const dbErr = new Error('transient write error');
    dbErr.code = 11600;
    let restoreFilter = null;

    Booking.findOneAndUpdate = async (_filter, update, options) => {
      assert.strictEqual(options?.new, false, 'createPayment must read pre-update booking state atomically');
      const prev = { ...bookingDoc };
      Object.assign(bookingDoc, update.$set);
      return prev;
    };
    Payment.create = async () => { throw dbErr; };
    Payment.findOne = async (query) => {
      assert.deepStrictEqual(query, { booking: BOOKING_ID, provider: 'moyasar', status: 'PENDING' });
      return null;
    };
    Booking.updateOne = async (filter, update) => {
      restoreFilter = filter;
      if (
        filter._id === bookingDoc._id
        && filter.paymentStatus === bookingDoc.paymentStatus
        && filter.bookingStatus === bookingDoc.bookingStatus
      ) {
        Object.assign(bookingDoc, update.$set);
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    };

    let caught = null;
    try {
      await moyasarProvider.createPayment({ booking: { _id: BOOKING_ID }, amount: 180, currency: 'SAR' });
    } catch (err) {
      caught = err;
    }
    assert.strictEqual(caught, dbErr, 'original Payment.create error must be rethrown');
    assert.deepStrictEqual(restoreFilter, {
      _id: BOOKING_ID,
      paymentStatus: 'PENDING',
      bookingStatus: 'PAYMENT_PENDING',
    });
    assert.strictEqual(bookingDoc.paymentStatus, 'FAILED');
    assert.strictEqual(bookingDoc.bookingStatus, 'CANCELLED');
  });

  // 23. Recovery failure does not mask original Payment.create error and logs without secrets or PII
  await check('23. createPayment recovery failure does not mask original error and logs safely', async () => {
    const bookingDoc = {
      _id: BOOKING_ID,
      bookingNumber: 'NX-CREATE-REC-2',
      paymentStatus: 'FAILED',
      bookingStatus: 'CANCELLED',
    };
    const originalErr = new Error('primary payment create failure');
    const recoveryErr = new Error('recovery failed for secret=sk_live_leak customer=guest@example.com');
    recoveryErr.name = 'MongoNetworkError';
    recoveryErr.code = 9001;

    Booking.findOneAndUpdate = async (_filter, update) => {
      const prev = { ...bookingDoc };
      Object.assign(bookingDoc, update.$set);
      return prev;
    };
    Payment.create = async () => { throw originalErr; };
    Payment.findOne = async () => null;
    Booking.updateOne = async () => { throw recoveryErr; };

    const logged = [];
    const origConsoleError = console.error;
    console.error = (...args) => logged.push(args);

    let caught = null;
    try {
      await moyasarProvider.createPayment({ booking: { _id: BOOKING_ID }, amount: 180, currency: 'SAR' });
    } catch (err) {
      caught = err;
    } finally {
      console.error = origConsoleError;
    }

    assert.strictEqual(caught, originalErr, 'recovery failure must never mask the original Payment.create error');
    assert.strictEqual(logged.length, 1);
    const serializedLog = JSON.stringify(logged[0]);
    assert.ok(serializedLog.includes(BOOKING_ID));
    assert.ok(serializedLog.includes('MongoNetworkError'));
    assert.ok(!serializedLog.includes('sk_live_leak'), 'log must not contain secrets');
    assert.ok(!serializedLog.includes('guest@example.com'), 'log must not contain customer PII');
  });

  // 24. Concurrent open Moyasar PENDING payment skips booking status rollback
  await check('24. createPayment skips booking restore when an open Moyasar PENDING payment exists', async () => {
    const bookingDoc = {
      _id: BOOKING_ID,
      bookingNumber: 'NX-CREATE-REC-3',
      paymentStatus: 'FAILED',
      bookingStatus: 'CANCELLED',
    };
    const dbErr = new Error('transient create failure');
    let restoreCalls = 0;

    Booking.findOneAndUpdate = async (_filter, update) => {
      const prev = { ...bookingDoc };
      Object.assign(bookingDoc, update.$set);
      return prev;
    };
    Payment.create = async () => { throw dbErr; };
    Payment.findOne = async () => ({
      _id: PAY_ID,
      booking: BOOKING_ID,
      provider: 'moyasar',
      status: 'PENDING',
    });
    Booking.updateOne = async () => {
      restoreCalls += 1;
      return { modifiedCount: 1 };
    };

    let caught = null;
    try {
      await moyasarProvider.createPayment({ booking: { _id: BOOKING_ID }, amount: 180, currency: 'SAR' });
    } catch (err) {
      caught = err;
    }
    assert.strictEqual(caught, dbErr);
    assert.strictEqual(restoreCalls, 0, 'must not roll back booking when a concurrent Moyasar PENDING attempt exists');
    assert.strictEqual(bookingDoc.paymentStatus, 'PENDING');
    assert.strictEqual(bookingDoc.bookingStatus, 'PAYMENT_PENDING');
  });

  // 25. Concurrently PAID booking is never overwritten during failure recovery
  await check('25. createPayment failure recovery never overwrites a concurrently PAID booking', async () => {
    const bookingDoc = {
      _id: BOOKING_ID,
      bookingNumber: 'NX-CREATE-REC-4',
      paymentStatus: 'FAILED',
      bookingStatus: 'CANCELLED',
    };
    const dbErr = new Error('transient create failure');
    let updateOneCalls = 0;

    Booking.findOneAndUpdate = async (_filter, update) => {
      const prev = { ...bookingDoc };
      Object.assign(bookingDoc, update.$set);
      return prev;
    };
    Payment.create = async () => {
      // Simulate concurrent payment verification marking the booking PAID/CONFIRMED
      bookingDoc.paymentStatus = 'PAID';
      bookingDoc.bookingStatus = 'CONFIRMED';
      throw dbErr;
    };
    Payment.findOne = async () => null;
    Booking.updateOne = async (filter, update) => {
      updateOneCalls += 1;
      if (
        filter._id === bookingDoc._id
        && filter.paymentStatus === bookingDoc.paymentStatus
        && filter.bookingStatus === bookingDoc.bookingStatus
      ) {
        Object.assign(bookingDoc, update.$set);
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    };

    let caught = null;
    try {
      await moyasarProvider.createPayment({ booking: { _id: BOOKING_ID }, amount: 180, currency: 'SAR' });
    } catch (err) {
      caught = err;
    }
    assert.strictEqual(caught, dbErr);
    assert.strictEqual(updateOneCalls, 1);
    assert.strictEqual(bookingDoc.paymentStatus, 'PAID', 'concurrently PAID booking must never be overwritten');
    assert.strictEqual(bookingDoc.bookingStatus, 'CONFIRMED', 'concurrently CONFIRMED booking must never be overwritten');
  });

  // 26. webhook_verification runs after secret_token validation and before mode validation; logs 6-digit code only when flag=true
  await check('26. handleWebhook handles webhook_verification before mode check and logs 6-digit code only when flag is true', async () => {
    const verificationCode = '842193';
    const captureLogs = async (fn) => {
      const logs = [];
      const origLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));
      try {
        const res = await fn();
        return { res, output: logs.join('\n') };
      } finally {
        console.log = origLog;
      }
    };

    // Case 1: Valid secret + flag=true in production (TEST mode) -> accepted and logs 6-digit code only
    setMoyasarMode('test');
    process.env.NODE_ENV = 'production';
    process.env.MOYASAR_LOG_WEBHOOK_VERIFICATION_CODE = 'true';
    const c1 = await captureLogs(() => moyasarProvider.handleWebhook({
      type: 'webhook_verification',
      secret_token: 'whsec_hardening_test_secret',
      live: false,
      data: { verification_code: verificationCode, extra_field: 'do_not_dump_payload' },
    }));
    assert.deepStrictEqual(c1.res, { verification: true, mappedStatus: 'IGNORED' });
    assert.ok(c1.output.includes(verificationCode), 'must log 6-digit verification code when flag is true');
    assert.ok(!c1.output.includes('whsec_hardening_test_secret'), 'must never log secret_token');
    assert.ok(!c1.output.includes('do_not_dump_payload'), 'must never log full webhook payload');

    // Case 2: LIVE webhook_verification accepted while MOYASAR_ENV=test (valid secret) and logs 6-digit code when flag=true
    const cLiveInTest = await captureLogs(() => moyasarProvider.handleWebhook({
      type: 'webhook_verification',
      secret_token: 'whsec_hardening_test_secret',
      live: true,
      data: { verification_code: verificationCode },
    }));
    assert.deepStrictEqual(cLiveInTest.res, { verification: true, mappedStatus: 'IGNORED' });
    assert.ok(cLiveInTest.output.includes(verificationCode), 'must log 6-digit verification code for LIVE verification while MOYASAR_ENV=test');

    // Case 3: LIVE mode + NODE_ENV=production + flag=true -> logs 6-digit verification code only
    setMoyasarMode('live');
    process.env.NODE_ENV = 'production';
    process.env.MOYASAR_LOG_WEBHOOK_VERIFICATION_CODE = 'true';
    const cLiveProd = await captureLogs(() => moyasarProvider.handleWebhook({
      type: 'webhook_verification',
      secret_token: 'whsec_hardening_test_secret',
      live: true,
      data: { verification_code: verificationCode, customer_email: 'guest@example.com' },
    }));
    assert.deepStrictEqual(cLiveProd.res, { verification: true, mappedStatus: 'IGNORED' });
    assert.ok(cLiveProd.output.includes(verificationCode), 'must log 6-digit code in production when explicit flag is true');
    assert.ok(!cLiveProd.output.includes('guest@example.com'), 'must never log customer info');

    // Case 4: Flag unset or false -> does NOT log verification code
    setMoyasarMode('test');
    delete process.env.MOYASAR_LOG_WEBHOOK_VERIFICATION_CODE;
    const cUnset = await captureLogs(() => moyasarProvider.handleWebhook({
      type: 'webhook_verification',
      secret_token: 'whsec_hardening_test_secret',
      live: false,
      data: { verification_code: verificationCode },
    }));
    assert.deepStrictEqual(cUnset.res, { verification: true, mappedStatus: 'IGNORED' });
    assert.ok(!cUnset.output.includes(verificationCode), 'must not log code when flag is unset');

    process.env.MOYASAR_LOG_WEBHOOK_VERIFICATION_CODE = 'false';
    const cFalse = await captureLogs(() => moyasarProvider.handleWebhook({
      type: 'webhook_verification',
      secret_token: 'whsec_hardening_test_secret',
      live: true,
      data: { verification_code: verificationCode },
    }));
    assert.deepStrictEqual(cFalse.res, { verification: true, mappedStatus: 'IGNORED' });
    assert.ok(!cFalse.output.includes(verificationCode), 'must not log code when flag is false');

    // Case 5: Missing or non-6-digit verification_code -> does NOT log verification code line
    process.env.MOYASAR_LOG_WEBHOOK_VERIFICATION_CODE = 'true';
    for (const badCode of [undefined, '', '12345', '1234567', 'secret_leak']) {
      const cBad = await captureLogs(() => moyasarProvider.handleWebhook({
        type: 'webhook_verification',
        secret_token: 'whsec_hardening_test_secret',
        live: false,
        data: badCode !== undefined ? { verification_code: badCode } : {},
      }));
      assert.deepStrictEqual(cBad.res, { verification: true, mappedStatus: 'IGNORED' });
      assert.ok(!cBad.output.includes('dashboard verification code'), 'must only log a 6-digit verification code');
    }

    // Case 6: Invalid webhook secret is rejected with 401 even for webhook_verification
    let badSecretErr = null;
    try {
      await moyasarProvider.handleWebhook({
        type: 'webhook_verification',
        secret_token: 'wrong_secret',
        live: false,
        data: { verification_code: verificationCode },
      });
    } catch (err) {
      badSecretErr = err;
    }
    assert.ok(badSecretErr && badSecretErr.statusCode === 401);

    // Case 7: Actual LIVE payment event is STILL rejected with 409 while MOYASAR_ENV=test
    setMoyasarMode('test');
    let livePaymentErr = null;
    try {
      await moyasarProvider.handleWebhook({
        type: 'payment_paid',
        secret_token: 'whsec_hardening_test_secret',
        live: true,
        data: { id: 'pay_live_rejected_in_test', status: 'paid' },
      });
    } catch (err) {
      livePaymentErr = err;
    }
    assert.ok(livePaymentErr && livePaymentErr.statusCode === 409, 'actual LIVE payment event must still be rejected while MOYASAR_ENV=test');
  });

  // 27. REST payment response with omitted `live` succeeds with matching test or live credentials + matching metadata.env
  await check('27. REST payment with omitted live succeeds in test and live modes with matching credentials and metadata.env', async () => {
    for (const mode of ['test', 'live']) {
      setMoyasarMode(mode);
      const moyasarId = `pay_rest_no_live_${mode}`;
      const localPayment = {
        _id: PAY_ID,
        booking: BOOKING_ID,
        bookingNumber: `NX-NOLIVE-${mode.toUpperCase()}`,
        amount: 200,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: moyasarId,
        status: 'PENDING',
        metadata: { env: mode },
      };
      const bookingDoc = {
        _id: BOOKING_ID,
        bookingNumber: localPayment.bookingNumber,
        paymentStatus: 'PENDING',
        bookingStatus: 'PAYMENT_PENDING',
        checkoutTokenHash: 'c'.repeat(64),
        checkoutTokenExpiresAt: new Date(Date.now() + 60_000),
      };

      // Standard Moyasar GET /v1/payments/{id} response without `live` field
      stubMoyasar({
        id: moyasarId,
        status: 'paid',
        amount: 20000,
        currency: 'SAR',
        metadata: { payment_id: PAY_ID, booking_number: localPayment.bookingNumber },
      });

      assert.doesNotThrow(() => assertPaymentMode({ id: moyasarId, status: 'paid' }));

      Payment.findOne = async (q) => (q.providerReference === moyasarId ? { ...localPayment } : null);
      Payment.findById = async () => ({ ...localPayment });
      Payment.findOneAndUpdate = async (_filter, update) => {
        Object.assign(localPayment, update.$set);
        return { ...localPayment };
      };
      Booking.findById = async () => ({ ...bookingDoc });
      Booking.findOneAndUpdate = async (_filter, update) => {
        Object.assign(bookingDoc, update.$set);
        return { ...bookingDoc };
      };

      const res = await moyasarProvider.verifyPayment(moyasarId);
      assert.strictEqual(res.mappedStatus, 'PAID');
      assert.strictEqual(res.booking.paymentStatus, 'PAID');
      assert.strictEqual(res.booking.bookingStatus, 'CONFIRMED');
    }

    // Credential mismatch still fails closed even when `live` is omitted
    setMoyasarMode('live');
    process.env.MOYASAR_SECRET_KEY = 'sk_test_wrong_tier';
    assert.throws(() => assertPaymentMode({ id: 'pay_any' }), /live mode requires/i);
  });

  // 28. Missing, invalid, or mismatched local payment metadata.env rejected with 409 before Booking lookup
  await check('28. Missing or mismatched local metadata.env rejected with 409 in verifyPayment and attachReference', async () => {
    setMoyasarMode('test');
    const moyasarId = 'pay_bad_local_env';
    stubMoyasar({
      id: moyasarId,
      status: 'paid',
      amount: 18000,
      currency: 'SAR',
      metadata: { payment_id: PAY_ID, booking_number: 'NX-BAD-ENV' },
    });

    for (const badMeta of [undefined, {}, { env: '' }, { env: 'staging' }, { env: 'live' }]) {
      const localPayment = {
        _id: PAY_ID,
        booking: BOOKING_ID,
        bookingNumber: 'NX-BAD-ENV',
        amount: 180,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: moyasarId,
        status: 'PENDING',
        ...(badMeta !== undefined ? { metadata: badMeta } : {}),
      };
      let bookingTouched = false;
      Payment.findOne = async (q) => (q.providerReference === moyasarId ? localPayment : null);
      Payment.findById = async () => ({ ...localPayment, providerReference: '' });
      Booking.findById = async () => { bookingTouched = true; return null; };

      let verifyErr = null;
      try {
        await moyasarProvider.verifyPayment(moyasarId);
      } catch (err) {
        verifyErr = err;
      }
      assert.ok(verifyErr && verifyErr.statusCode === 409, 'verifyPayment must reject invalid/mismatched local metadata.env with 409');
      assert.strictEqual(bookingTouched, false, 'must reject before Booking lookup');

      let attachErr = null;
      try {
        await moyasarProvider.attachReference(PAY_ID, moyasarId);
      } catch (err) {
        attachErr = err;
      }
      assert.ok(attachErr && attachErr.statusCode === 409, 'attachReference must reject invalid/mismatched local metadata.env with 409');
    }
  });

  // 29. Webhook mode validation strictly requires boolean `live` matching MOYASAR_ENV
  await check('29. assertWebhookMode and handleWebhook reject missing, invalid, or mismatched live field with 409', async () => {
    setMoyasarMode('test');
    for (const badLive of [undefined, null, 'false', 'true', 0, 1, true]) {
      const payload = {
        type: 'payment_paid',
        secret_token: 'whsec_hardening_test_secret',
        ...(badLive !== undefined ? { live: badLive } : {}),
        data: { id: 'pay_wh_mode_check', status: 'paid' },
      };
      assert.throws(
        () => assertWebhookMode(payload),
        (err) => err.statusCode === 409,
        `assertWebhookMode must reject live=${String(badLive)} with 409`
      );
      let caught = null;
      try {
        await moyasarProvider.handleWebhook(payload);
      } catch (err) {
        caught = err;
      }
      assert.ok(caught && caught.statusCode === 409, `handleWebhook must reject live=${String(badLive)} with 409`);
    }

    // Valid live boolean in live mode accepted, false rejected
    setMoyasarMode('live');
    assert.doesNotThrow(() => assertWebhookMode({ live: true }));
    assert.throws(() => assertWebhookMode({ live: false }), (err) => err.statusCode === 409);
    assert.throws(() => assertWebhookMode({}), (err) => err.statusCode === 409);
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\nResults: ${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
