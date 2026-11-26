/**
 * Moyasar Webhook Timeout, Race Condition & Reconciliation Tests
 * Run: node Backend/tests/moyasarWebhookReconciliation.test.js
 * Uses in-memory stubs and mocked global.fetch (no live MongoDB or Moyasar API calls).
 */
const assert = require('assert');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const paymentController = require('../controllers/paymentController');
const moyasarProvider = require('../services/paymentProviders/moyasarPaymentProvider');
const { retrievePayment } = require('../services/paymentProviders/moyasarClient');
const { webhookSecretAccepted } = require('../services/paymentProviders/moyasarConfig');

const results = [];

async function check(name, fn) {
  const origEnv = {
    MOYASAR_ENV: process.env.MOYASAR_ENV,
    MOYASAR_SECRET_KEY: process.env.MOYASAR_SECRET_KEY,
    MOYASAR_PUBLISHABLE_KEY: process.env.MOYASAR_PUBLISHABLE_KEY,
    MOYASAR_WEBHOOK_SECRET: process.env.MOYASAR_WEBHOOK_SECRET,
    MOYASAR_TEST_WEBHOOK_SECRET: process.env.MOYASAR_TEST_WEBHOOK_SECRET,
    MOYASAR_LIVE_WEBHOOK_SECRET: process.env.MOYASAR_LIVE_WEBHOOK_SECRET,
    MOYASAR_HTTP_TIMEOUT_MS: process.env.MOYASAR_HTTP_TIMEOUT_MS,
  };
  const origFetch = global.fetch;
  const origPaymentFindOne = Payment.findOne;
  const origPaymentFindById = Payment.findById;
  const origPaymentFindOneAndUpdate = Payment.findOneAndUpdate;
  const origPaymentUpdateOne = Payment.updateOne;
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
    Payment.findOne = origPaymentFindOne;
    Payment.findById = origPaymentFindById;
    Payment.findOneAndUpdate = origPaymentFindOneAndUpdate;
    Payment.updateOne = origPaymentUpdateOne;
    Booking.findById = origBookingFindById;
    Booking.findOneAndUpdate = origBookingFindOneAndUpdate;
    Booking.updateOne = origBookingUpdateOne;
  }
}

function setTestMoyasarEnv() {
  process.env.MOYASAR_ENV = 'test';
  process.env.MOYASAR_SECRET_KEY = 'sk_test_webhook_recon';
  process.env.MOYASAR_PUBLISHABLE_KEY = 'pk_test_webhook_recon';
  process.env.MOYASAR_WEBHOOK_SECRET = 'whsec_test_recon_secret';
  delete process.env.MOYASAR_TEST_WEBHOOK_SECRET;
  delete process.env.MOYASAR_LIVE_WEBHOOK_SECRET;
}

async function run() {
  const BOOKING_ID = '507f191e810c19729de86201';
  const PAY_1_ID = '507f191e810c19729de86211';
  const PAY_2_ID = '507f191e810c19729de86212';

  await check('1. retrievePayment aborts hung Moyasar API requests with 504 MOYASAR_TIMEOUT', async () => {
    setTestMoyasarEnv();
    process.env.MOYASAR_HTTP_TIMEOUT_MS = '500';

    global.fetch = (_url, opts) => new Promise((_resolve, reject) => {
      opts.signal.addEventListener('abort', () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });

    await assert.rejects(
      () => retrievePayment('pay_hung_123'),
      (err) => err.statusCode === 504 && err.code === 'MOYASAR_TIMEOUT'
    );
  });

  await check('2. Failed payment webhook (card_invalid / code 56 / SAR 180) persists failure & audit metadata and updates Booking', async () => {
    setTestMoyasarEnv();
    const localPayment = {
      _id: PAY_1_ID,
      booking: BOOKING_ID,
      bookingNumber: 'NXT-20261124-VA5U22X8QQ',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: '',
      status: 'PENDING',
      metadata: { env: 'test' },
    };
    const booking = {
      _id: BOOKING_ID,
      bookingNumber: 'NXT-20261124-VA5U22X8QQ',
      paymentStatus: 'PENDING',
      bookingStatus: 'PAYMENT_PENDING',
    };

    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'pay_failed_card_56',
        status: 'failed',
        amount: 18000,
        currency: 'SAR',
        live: false,
        source: {
          type: 'creditcard',
          company: 'visa',
          message: 'DECLINED: INVALID CARD OR NOT FOUND',
          response_code: '56',
        },
        metadata: {
          payment_id: PAY_1_ID,
          booking_number: 'NXT-20261124-VA5U22X8QQ',
        },
      }),
    });

    let savedSet = null;
    let bookingUpdated = null;
    Payment.findOne = async () => null;
    Payment.findById = async () => localPayment;
    Payment.findOneAndUpdate = async (filter, update) => {
      assert.deepStrictEqual(filter.status.$nin, ['PAID', 'REFUNDED', 'FAILED']);
      savedSet = update.$set;
      return { ...localPayment, status: 'FAILED', providerReference: 'pay_failed_card_56' };
    };
    Booking.findById = async () => ({ ...booking, ...(bookingUpdated || {}) });
    Booking.updateOne = async (_filter, update) => {
      bookingUpdated = update.$set;
      return { modifiedCount: 1 };
    };

    const res = await moyasarProvider.handleWebhook({
      id: 'evt_failed_56',
      type: 'payment_failed',
      secret_token: 'whsec_test_recon_secret',
      live: false,
      data: { id: 'pay_failed_card_56' },
    });

    assert.strictEqual(res.mappedStatus, 'FAILED');
    assert.strictEqual(res.reused, false);
    assert.strictEqual(savedSet['metadata.failureMessage'], 'DECLINED: INVALID CARD OR NOT FOUND');
    assert.strictEqual(savedSet['metadata.failureCode'], '56');
    assert.strictEqual(savedSet['metadata.sourceType'], 'creditcard');
    assert.strictEqual(savedSet['metadata.sourceCompany'], 'visa');
    assert.strictEqual(savedSet['metadata.lastWebhookEventId'], 'evt_failed_56');
    assert.strictEqual(savedSet['metadata.lastWebhookEventType'], 'payment_failed');
    assert.strictEqual(bookingUpdated.paymentStatus, 'FAILED');
    assert.strictEqual(bookingUpdated.bookingStatus, 'CANCELLED');
  });

  await check('3. Out-of-order delayed payment_failed webhook does NOT cancel a booking with a newer active PENDING retry', async () => {
    setTestMoyasarEnv();
    const attempt1 = {
      _id: PAY_1_ID,
      booking: BOOKING_ID,
      bookingNumber: 'NXT-RETRY-1',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: 'pay_attempt_1_failed',
      status: 'PENDING',
      metadata: { env: 'test' },
    };
    const attempt2 = {
      _id: PAY_2_ID,
      booking: BOOKING_ID,
      bookingNumber: 'NXT-RETRY-1',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: '',
      status: 'PENDING',
      metadata: { env: 'test' },
    };
    const booking = {
      _id: BOOKING_ID,
      bookingNumber: 'NXT-RETRY-1',
      paymentStatus: 'PENDING',
      bookingStatus: 'PAYMENT_PENDING',
    };

    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'pay_attempt_1_failed',
        status: 'failed',
        amount: 18000,
        currency: 'SAR',
        live: false,
        metadata: { payment_id: PAY_1_ID, booking_number: 'NXT-RETRY-1' },
      }),
    });

    let bookingCancelCalls = 0;
    Payment.findOne = async (filter) => {
      if (filter.providerReference === 'pay_attempt_1_failed') return attempt1;
      if (filter.status?.$in?.includes('PENDING')) return attempt2;
      return null;
    };
    Payment.findById = async () => attempt1;
    Payment.findOneAndUpdate = async () => ({ ...attempt1, status: 'FAILED' });
    Booking.findById = async () => booking;
    Booking.updateOne = async () => {
      bookingCancelCalls += 1;
      return { modifiedCount: 1 };
    };

    const res = await moyasarProvider.handleWebhook({
      id: 'evt_late_fail',
      type: 'payment_failed',
      secret_token: 'whsec_test_recon_secret',
      live: false,
      data: { id: 'pay_attempt_1_failed' },
    });

    assert.strictEqual(res.mappedStatus, 'FAILED');
    assert.strictEqual(bookingCancelCalls, 0, 'Late failure of attempt 1 must NOT cancel booking with active attempt 2');
  });

  await check('4. Concurrent E11000 on mark_failed for same booking returns reused: true cleanly', async () => {
    setTestMoyasarEnv();
    const localPayment = {
      _id: PAY_1_ID,
      booking: BOOKING_ID,
      bookingNumber: 'NXT-RACE-1',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: '',
      status: 'PENDING',
      metadata: { env: 'test' },
    };

    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'pay_race_fail',
        status: 'failed',
        amount: 18000,
        currency: 'SAR',
        live: false,
        metadata: { payment_id: PAY_1_ID, booking_number: 'NXT-RACE-1' },
      }),
    });

    let findOneCount = 0;
    Payment.findOne = async (filter) => {
      findOneCount += 1;
      if (filter.providerReference === 'pay_race_fail' && findOneCount > 1) {
        return { ...localPayment, status: 'FAILED', providerReference: 'pay_race_fail' };
      }
      return null;
    };
    Payment.findById = async () => localPayment;
    Payment.findOneAndUpdate = async () => {
      const err = new Error('E11000 duplicate key');
      err.code = 11000;
      throw err;
    };
    Booking.findById = async () => ({ _id: BOOKING_ID, bookingNumber: 'NXT-RACE-1', paymentStatus: 'FAILED', bookingStatus: 'CANCELLED' });

    const res = await moyasarProvider.handleWebhook({
      id: 'evt_race_1',
      type: 'payment_failed',
      secret_token: 'whsec_test_recon_secret',
      live: false,
      data: { id: 'pay_race_fail' },
    });

    assert.strictEqual(res.reused, true);
    assert.strictEqual(res.mappedStatus, 'FAILED');
  });

  await check('5. Separate MOYASAR_TEST_WEBHOOK_SECRET / MOYASAR_LIVE_WEBHOOK_SECRET and malformed payloads', async () => {
    setTestMoyasarEnv();
    process.env.MOYASAR_TEST_WEBHOOK_SECRET = 'whsec_only_test';
    process.env.MOYASAR_LIVE_WEBHOOK_SECRET = 'whsec_only_live';

    assert.strictEqual(webhookSecretAccepted('whsec_only_test', false), true);
    assert.strictEqual(webhookSecretAccepted('whsec_only_live', false), false);
    assert.strictEqual(webhookSecretAccepted('whsec_only_live', true), true);
    assert.strictEqual(webhookSecretAccepted('whsec_only_test', true), false);
    assert.strictEqual(webhookSecretAccepted('whsec_test_recon_secret', false), false);

    await assert.rejects(() => moyasarProvider.handleWebhook(null), (err) => err.statusCode === 401);
    await assert.rejects(() => moyasarProvider.handleWebhook([]), (err) => err.statusCode === 401);
  });

  await check('6. createPayment enforces expectedMode match against MOYASAR_ENV and getCheckoutConfig exposes active mode', async () => {
    setTestMoyasarEnv();
    process.env.PAYMENT_PROVIDER = 'moyasar';

    const makeRes = () => ({
      statusCode: 200,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.body = payload; return this; },
    });

    const mismatchRes = makeRes();
    await paymentController.createPayment(
      { body: { bookingId: BOOKING_ID, expectedMode: 'live' } },
      mismatchRes,
      (err) => { if (err) throw err; }
    );
    assert.strictEqual(mismatchRes.statusCode, 409);

    const invalidRes = makeRes();
    await paymentController.createPayment(
      { body: { bookingId: BOOKING_ID, expectedMode: 'sandbox' } },
      invalidRes,
      (err) => { if (err) throw err; }
    );
    assert.strictEqual(invalidRes.statusCode, 400);

    const cfg = moyasarProvider.getCheckoutConfig(
      { _id: PAY_1_ID, amount: 180, currency: 'SAR' },
      { bookingNumber: 'NXT-MODE-1' }
    );
    assert.strictEqual(cfg.mode, 'test');
    assert.strictEqual(cfg.publishableKey, 'pk_test_webhook_recon');
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
