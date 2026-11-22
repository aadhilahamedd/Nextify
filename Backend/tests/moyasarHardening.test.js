/**
 * Focused Moyasar LIVE webhook verification tests.
 * Run: node Backend/tests/moyasarHardening.test.js
 */
const assert = require('assert');
const moyasarProvider = require('../services/paymentProviders/moyasarPaymentProvider');

const results = [];

async function check(name, fn) {
  const origEnv = {
    NODE_ENV: process.env.NODE_ENV,
    MOYASAR_ENV: process.env.MOYASAR_ENV,
    MOYASAR_WEBHOOK_SECRET: process.env.MOYASAR_WEBHOOK_SECRET,
    MOYASAR_LOG_WEBHOOK_VERIFICATION_CODE: process.env.MOYASAR_LOG_WEBHOOK_VERIFICATION_CODE,
  };
  try {
    process.env.NODE_ENV = 'production';
    process.env.MOYASAR_ENV = 'test';
    process.env.MOYASAR_WEBHOOK_SECRET = 'whsec_live_verification_unit_test_secret';
    delete process.env.MOYASAR_LOG_WEBHOOK_VERIFICATION_CODE;
    await fn();
    results.push({ name, ok: true });
    console.log(`ok ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.log(`fail ${name} — ${err.message}`);
  } finally {
    for (const [k, v] of Object.entries(origEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

async function captureLogs(fn) {
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    const res = await fn();
    return { res, output: logs.join('\n') };
  } finally {
    console.log = origLog;
  }
}

async function run() {
  const SECRET = 'whsec_live_verification_unit_test_secret';

  await check('1. Valid secret + LIVE verification event accepted while MOYASAR_ENV=test and logs 6-digit code only when flag=true', async () => {
    process.env.MOYASAR_LOG_WEBHOOK_VERIFICATION_CODE = 'true';

    // String 6-digit code
    const cStr = await captureLogs(() => moyasarProvider.handleWebhook({
      type: 'webhook_verification',
      secret_token: SECRET,
      live: true,
      data: { verification_code: '  842193  ', customer_email: 'guest@example.com' },
    }));
    assert.deepStrictEqual(cStr.res, { verification: true, mappedStatus: 'IGNORED' });
    assert.ok(cStr.output.includes('842193'), 'must log trimmed 6-digit code when flag=true');
    assert.ok(!cStr.output.includes(SECRET), 'must never log secret_token');
    assert.ok(!cStr.output.includes('guest@example.com'), 'must never log customer info');

    // Numeric 6-digit code
    const cNum = await captureLogs(() => moyasarProvider.handleWebhook({
      type: 'webhook_verification',
      secret_token: SECRET,
      live: true,
      data: { verification_code: 654321 },
    }));
    assert.deepStrictEqual(cNum.res, { verification: true, mappedStatus: 'IGNORED' });
    assert.ok(cNum.output.includes('654321'), 'must accept numeric 6-digit code');
  });

  await check('2. Unset or false flag does not log verification code', async () => {
    delete process.env.MOYASAR_LOG_WEBHOOK_VERIFICATION_CODE;
    const cUnset = await captureLogs(() => moyasarProvider.handleWebhook({
      type: 'webhook_verification',
      secret_token: SECRET,
      live: true,
      data: { verification_code: '842193' },
    }));
    assert.deepStrictEqual(cUnset.res, { verification: true, mappedStatus: 'IGNORED' });
    assert.ok(!cUnset.output.includes('842193'), 'must not log code when flag is unset');

    process.env.MOYASAR_LOG_WEBHOOK_VERIFICATION_CODE = 'false';
    const cFalse = await captureLogs(() => moyasarProvider.handleWebhook({
      type: 'webhook_verification',
      secret_token: SECRET,
      live: true,
      data: { verification_code: '842193' },
    }));
    assert.deepStrictEqual(cFalse.res, { verification: true, mappedStatus: 'IGNORED' });
    assert.ok(!cFalse.output.includes('842193'), 'must not log code when flag is false');
  });

  await check('3. Missing or non-6-digit verification code is not logged even when flag=true', async () => {
    process.env.MOYASAR_LOG_WEBHOOK_VERIFICATION_CODE = 'true';
    for (const badCode of [undefined, null, '', '12345', '1234567', 'abc123', { code: '123456' }]) {
      const cBad = await captureLogs(() => moyasarProvider.handleWebhook({
        type: 'webhook_verification',
        secret_token: SECRET,
        live: true,
        data: badCode !== undefined ? { verification_code: badCode } : {},
      }));
      assert.deepStrictEqual(cBad.res, { verification: true, mappedStatus: 'IGNORED' });
      assert.ok(!cBad.output.includes('dashboard verification code'), 'must not log invalid/missing code');
    }
  });

  await check('4. Invalid webhook secret is rejected with 401', async () => {
    process.env.MOYASAR_LOG_WEBHOOK_VERIFICATION_CODE = 'true';
    let caught = null;
    try {
      await moyasarProvider.handleWebhook({
        type: 'webhook_verification',
        secret_token: 'wrong_secret',
        live: true,
        data: { verification_code: '842193' },
      });
    } catch (err) {
      caught = err;
    }
    assert.ok(caught && caught.statusCode === 401);
  });

  await check('5. Actual LIVE payment event is still rejected with 409 while MOYASAR_ENV=test', async () => {
    let caught = null;
    try {
      await moyasarProvider.handleWebhook({
        type: 'payment_paid',
        secret_token: SECRET,
        live: true,
        data: { id: 'pay_live_rejected_in_test', status: 'paid' },
      });
    } catch (err) {
      caught = err;
    }
    assert.ok(caught && caught.statusCode === 409);
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\nResults: ${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
