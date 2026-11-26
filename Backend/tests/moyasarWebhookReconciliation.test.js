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
const {
  evaluateWebhookMode,
  webhookAllowedMode,
  webhookSecretAccepted,
} = require('../services/paymentProviders/moyasarConfig');

const results = [];

async function check(name, fn) {
  const origEnv = {
    MOYASAR_ENV: process.env.MOYASAR_ENV,
    MOYASAR_SECRET_KEY: process.env.MOYASAR_SECRET_KEY,
    MOYASAR_PUBLISHABLE_KEY: process.env.MOYASAR_PUBLISHABLE_KEY,
    MOYASAR_WEBHOOK_SECRET: process.env.MOYASAR_WEBHOOK_SECRET,
    MOYASAR_WEBHOOK_ALLOWED_MODE: process.env.MOYASAR_WEBHOOK_ALLOWED_MODE,
    MOYASAR_TEST_WEBHOOK_SECRET: process.env.MOYASAR_TEST_WEBHOOK_SECRET,
    MOYASAR_LIVE_WEBHOOK_SECRET: process.env.MOYASAR_LIVE_WEBHOOK_SECRET,
    MOYASAR_HTTP_TIMEOUT_MS: process.env.MOYASAR_HTTP_TIMEOUT_MS,
    PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
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
  delete process.env.MOYASAR_WEBHOOK_ALLOWED_MODE;
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

  await check('5. Endpoint-scoped webhook secret ignores payload.live and rejects malformed payloads', async () => {
    setTestMoyasarEnv();
    process.env.MOYASAR_WEBHOOK_SECRET = 'whsec_endpoint_primary';
    process.env.MOYASAR_TEST_WEBHOOK_SECRET = 'whsec_only_test';
    process.env.MOYASAR_LIVE_WEBHOOK_SECRET = 'whsec_only_live';

    // Primary endpoint secret is used regardless of incoming payload.live
    assert.strictEqual(webhookSecretAccepted('whsec_endpoint_primary'), true);
    assert.strictEqual(webhookSecretAccepted('whsec_only_test'), false);
    assert.strictEqual(webhookSecretAccepted('whsec_only_live'), false);

    // Without MOYASAR_WEBHOOK_SECRET, fallback uses server MOYASAR_ENV only (never payload.live)
    delete process.env.MOYASAR_WEBHOOK_SECRET;
    process.env.MOYASAR_ENV = 'test';
    assert.strictEqual(webhookSecretAccepted('whsec_only_test'), true);
    assert.strictEqual(webhookSecretAccepted('whsec_only_live'), false);

    process.env.MOYASAR_ENV = 'live';
    assert.strictEqual(webhookSecretAccepted('whsec_only_live'), true);
    assert.strictEqual(webhookSecretAccepted('whsec_only_test'), false);

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

  await check('7. Staging (MOYASAR_WEBHOOK_ALLOWED_MODE=test) processes live:false and ignores live:true with 200 and zero API/DB calls', async () => {
    setTestMoyasarEnv();
    process.env.PAYMENT_PROVIDER = 'moyasar';
    process.env.MOYASAR_WEBHOOK_ALLOWED_MODE = 'test';

    let fetchCalls = 0;
    let dbCalls = 0;
    global.fetch = async () => {
      fetchCalls += 1;
      throw new Error('Moyasar API must not be called for ignored cross-environment webhook');
    };
    Payment.findOne = async () => { dbCalls += 1; return null; };
    Payment.findById = async () => { dbCalls += 1; return null; };
    Booking.findById = async () => { dbCalls += 1; return null; };

    const makeRes = () => ({
      statusCode: 0,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.body = payload; return this; },
    });

    const res = makeRes();
    await paymentController.webhook(
      {
        body: {
          id: 'evt_live_on_staging',
          type: 'payment_paid',
          secret_token: 'whsec_test_recon_secret',
          live: true,
          data: { id: 'pay_live_other_env' },
        },
      },
      res,
      (err) => { if (err) throw err; }
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.ignored, true);
    assert.strictEqual(res.body.data.reason, 'other_environment');
    assert.strictEqual(fetchCalls, 0, 'Ignored live event on staging must not call Moyasar API');
    assert.strictEqual(dbCalls, 0, 'Ignored live event on staging must not query MongoDB');

    // Verify live:false is allowed in test mode
    const allowedCheck = evaluateWebhookMode({ live: false });
    assert.strictEqual(allowedCheck.allowed, true);
    assert.strictEqual(allowedCheck.eventMode, 'test');
  });

  await check('8. Production WhatsApp-only (MOYASAR_WEBHOOK_ALLOWED_MODE=none) ignores both live:false and live:true with 200 and zero API/DB calls', async () => {
    setTestMoyasarEnv();
    process.env.PAYMENT_PROVIDER = 'moyasar';
    process.env.MOYASAR_WEBHOOK_ALLOWED_MODE = 'none';

    let fetchCalls = 0;
    let dbCalls = 0;
    global.fetch = async () => {
      fetchCalls += 1;
      throw new Error('Moyasar API must not be called when MOYASAR_WEBHOOK_ALLOWED_MODE=none');
    };
    Payment.findOne = async () => { dbCalls += 1; return null; };
    Payment.findById = async () => { dbCalls += 1; return null; };
    Booking.findById = async () => { dbCalls += 1; return null; };

    const makeRes = () => ({
      statusCode: 0,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.body = payload; return this; },
    });

    for (const liveFlag of [false, true]) {
      const res = makeRes();
      await paymentController.webhook(
        {
          body: {
            id: `evt_none_${liveFlag}`,
            type: 'payment_paid',
            secret_token: 'whsec_test_recon_secret',
            live: liveFlag,
            data: { id: `pay_none_${liveFlag}` },
          },
        },
        res,
        (err) => { if (err) throw err; }
      );
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.ignored, true);
      assert.strictEqual(res.body.data.reason, 'webhook_mode_disabled');
    }

    assert.strictEqual(fetchCalls, 0, 'none mode must not call Moyasar API');
    assert.strictEqual(dbCalls, 0, 'none mode must not query MongoDB');
  });

  await check('9. Live mode (MOYASAR_WEBHOOK_ALLOWED_MODE=live) processes live:true and ignores live:false with 200 and zero API/DB calls', async () => {
    process.env.PAYMENT_PROVIDER = 'moyasar';
    process.env.MOYASAR_ENV = 'live';
    process.env.MOYASAR_SECRET_KEY = 'sk_live_webhook_recon';
    process.env.MOYASAR_PUBLISHABLE_KEY = 'pk_live_webhook_recon';
    process.env.MOYASAR_WEBHOOK_SECRET = 'whsec_prod_endpoint_secret';
    process.env.MOYASAR_WEBHOOK_ALLOWED_MODE = 'live';
    delete process.env.MOYASAR_TEST_WEBHOOK_SECRET;
    delete process.env.MOYASAR_LIVE_WEBHOOK_SECRET;

    let fetchCalls = 0;
    let dbCalls = 0;
    global.fetch = async () => {
      fetchCalls += 1;
      throw new Error('Moyasar API must not be called for ignored test event on live endpoint');
    };
    Payment.findOne = async () => { dbCalls += 1; return null; };
    Payment.findById = async () => { dbCalls += 1; return null; };
    Booking.findById = async () => { dbCalls += 1; return null; };

    const ignored = await moyasarProvider.handleWebhook({
      id: 'evt_test_on_prod',
      type: 'payment_paid',
      secret_token: 'whsec_prod_endpoint_secret',
      live: false,
      data: { id: 'pay_staging_test_123' },
    });

    assert.strictEqual(ignored.ignored, true);
    assert.strictEqual(ignored.reason, 'other_environment');
    assert.strictEqual(ignored.mappedStatus, 'IGNORED');
    assert.strictEqual(fetchCalls, 0);
    assert.strictEqual(dbCalls, 0);

    // Live event proceeds to Moyasar retrieve & reconciliation
    const localPayment = {
      _id: PAY_1_ID,
      booking: BOOKING_ID,
      bookingNumber: 'NXT-LIVE-OK-1',
      amount: 180,
      currency: 'SAR',
      provider: 'moyasar',
      providerReference: '',
      status: 'PENDING',
      metadata: { env: 'live' },
    };
    const booking = {
      _id: BOOKING_ID,
      bookingNumber: 'NXT-LIVE-OK-1',
      paymentStatus: 'PENDING',
      bookingStatus: 'PAYMENT_PENDING',
    };

    global.fetch = async () => {
      fetchCalls += 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'pay_live_real_1',
          status: 'paid',
          amount: 18000,
          currency: 'SAR',
          live: true,
          metadata: { payment_id: PAY_1_ID, booking_number: 'NXT-LIVE-OK-1' },
        }),
      };
    };
    Payment.findOne = async () => null;
    Payment.findById = async () => localPayment;
    Payment.findOneAndUpdate = async () => ({ ...localPayment, status: 'PAID', providerReference: 'pay_live_real_1' });
    Booking.findById = async () => booking;
    Booking.findOneAndUpdate = async (_filter, update) => ({ ...booking, ...(update?.$set || {}) });
    Booking.updateOne = async () => ({ modifiedCount: 1 });

    const processed = await moyasarProvider.handleWebhook({
      id: 'evt_live_on_prod',
      type: 'payment_paid',
      secret_token: 'whsec_prod_endpoint_secret',
      live: true,
      data: { id: 'pay_live_real_1' },
    });

    assert.strictEqual(processed.mappedStatus, 'PAID');
    assert.strictEqual(fetchCalls, 1);
  });

  await check('10. Invalid secret returns 401 (even in none/opposite mode), non-boolean live returns 409, invalid allowed mode fails closed with 500', async () => {
    setTestMoyasarEnv();
    process.env.MOYASAR_WEBHOOK_ALLOWED_MODE = 'none';

    // Invalid secret must fail with 401 even when allowed mode is none or opposite env
    await assert.rejects(
      () => moyasarProvider.handleWebhook({
        type: 'payment_paid',
        secret_token: 'whsec_wrong_secret',
        live: true,
        data: { id: 'pay_bad_secret' },
      }),
      (err) => err.statusCode === 401
    );

    // Valid secret with missing or non-boolean live must fail with 409
    for (const badLive of [undefined, null, 'true', 'false', 0, 1]) {
      const payload = {
        type: 'payment_paid',
        secret_token: 'whsec_test_recon_secret',
        ...(badLive !== undefined ? { live: badLive } : {}),
        data: { id: 'pay_bad_live' },
      };
      await assert.rejects(
        () => moyasarProvider.handleWebhook(payload),
        (err) => err.statusCode === 409
      );
    }

    // Invalid MOYASAR_WEBHOOK_ALLOWED_MODE must fail closed with 500
    process.env.MOYASAR_WEBHOOK_ALLOWED_MODE = 'both';
    assert.throws(() => webhookAllowedMode(), (err) => err.statusCode === 500);
    await assert.rejects(
      () => moyasarProvider.handleWebhook({
        type: 'payment_paid',
        secret_token: 'whsec_test_recon_secret',
        live: false,
        data: { id: 'pay_invalid_allowed_mode' },
      }),
      (err) => err.statusCode === 500
    );
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
