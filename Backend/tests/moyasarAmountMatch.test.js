/**
 * Moyasar assertAmountMatch — strict amount/currency validation
 * Run: node --test Backend/tests/moyasarAmountMatch.test.js
 */
const assert = require('assert');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'moyasar_amount_match_test_secret_value';
process.env.PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || 'moyasar';
process.env.MOYASAR_ENV = process.env.MOYASAR_ENV || 'test';
process.env.MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY || 'sk_test_amount_match_dummy';
process.env.MOYASAR_PUBLISHABLE_KEY = process.env.MOYASAR_PUBLISHABLE_KEY || 'pk_test_amount_match_dummy';

delete require.cache[require.resolve('../services/paymentProviders/moyasarPaymentProvider')];
const { assertAmountMatch } = require('../services/paymentProviders/moyasarPaymentProvider');

const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`ok ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.log(`fail ${name} — ${err.message}`);
  }
}

function expect409(fn, messagePattern) {
  try {
    fn();
    assert.fail('expected HTTP 409');
  } catch (err) {
    assert.strictEqual(err.statusCode, 409);
    if (messagePattern) {
      assert.match(String(err.message), messagePattern);
    }
  }
}

async function run() {
  await check('correct amount and currency accepted', () => {
    assert.doesNotThrow(() =>
      assertAmountMatch(
        { amount: 250, currency: 'SAR' },
        { amount: 25000, currency: 'SAR' },
      ),
    );
    assert.doesNotThrow(() =>
      assertAmountMatch(
        { amount: 130, currency: 'sar' },
        { amount: 13000, currency: 'Sar' },
      ),
    );
  });

  await check('incorrect amount rejected', () => {
    expect409(
      () => assertAmountMatch({ amount: 250, currency: 'SAR' }, { amount: 99900, currency: 'SAR' }),
      /amount mismatch/i,
    );
  });

  await check('incorrect currency rejected', () => {
    expect409(
      () => assertAmountMatch({ amount: 250, currency: 'SAR' }, { amount: 25000, currency: 'USD' }),
      /currency mismatch/i,
    );
  });

  await check('missing Moyasar amount rejected', () => {
    expect409(
      () => assertAmountMatch({ amount: 250, currency: 'SAR' }, { currency: 'SAR' }),
      /amount is missing/i,
    );
    expect409(
      () => assertAmountMatch({ amount: 250, currency: 'SAR' }, { amount: null, currency: 'SAR' }),
      /amount is missing/i,
    );
  });

  await check('missing Moyasar currency rejected', () => {
    expect409(
      () => assertAmountMatch({ amount: 250, currency: 'SAR' }, { amount: 25000 }),
      /currency is missing/i,
    );
    expect409(
      () => assertAmountMatch({ amount: 250, currency: 'SAR' }, { amount: 25000, currency: '' }),
      /currency is missing/i,
    );
  });

  await check('invalid Moyasar amount rejected', () => {
    expect409(
      () => assertAmountMatch({ amount: 250, currency: 'SAR' }, { amount: 0, currency: 'SAR' }),
      /amount is invalid/i,
    );
    expect409(
      () => assertAmountMatch({ amount: 250, currency: 'SAR' }, { amount: -100, currency: 'SAR' }),
      /amount is invalid/i,
    );
    expect409(
      () => assertAmountMatch({ amount: 250, currency: 'SAR' }, { amount: 25000.5, currency: 'SAR' }),
      /amount is invalid/i,
    );
    expect409(
      () => assertAmountMatch({ amount: 250, currency: 'SAR' }, { amount: 'abc', currency: 'SAR' }),
      /amount is invalid/i,
    );
  });

  await check('invalid local payment amount or currency rejected', () => {
    expect409(
      () => assertAmountMatch({ amount: 0, currency: 'SAR' }, { amount: 0, currency: 'SAR' }),
      /Local payment amount is invalid/i,
    );
    expect409(
      () => assertAmountMatch({ amount: -10, currency: 'SAR' }, { amount: 1000, currency: 'SAR' }),
      /Local payment amount is invalid/i,
    );
    expect409(
      () => assertAmountMatch({ amount: 'x', currency: 'SAR' }, { amount: 1000, currency: 'SAR' }),
      /Local payment amount is invalid/i,
    );
    expect409(
      () => assertAmountMatch({ amount: 250 }, { amount: 25000, currency: 'SAR' }),
      /Local payment currency is invalid/i,
    );
    expect409(
      () => assertAmountMatch({ amount: 250, currency: 'SA' }, { amount: 25000, currency: 'SAR' }),
      /Local payment currency is invalid/i,
    );
  });

  await check('valid two-decimal local amounts accepted', () => {
    assert.doesNotThrow(() =>
      assertAmountMatch({ amount: 250.01, currency: 'SAR' }, { amount: 25001, currency: 'SAR' }),
    );
    assert.doesNotThrow(() =>
      assertAmountMatch({ amount: 10.5, currency: 'SAR' }, { amount: 1050, currency: 'SAR' }),
    );
    assert.doesNotThrow(() =>
      assertAmountMatch({ amount: 10.50, currency: 'SAR' }, { amount: 1050, currency: 'SAR' }),
    );
    assert.doesNotThrow(() =>
      assertAmountMatch({ amount: 0.01, currency: 'SAR' }, { amount: 1, currency: 'SAR' }),
    );
  });

  await check('local amounts with more than two decimal places rejected', () => {
    expect409(
      () => assertAmountMatch({ amount: 250.001, currency: 'SAR' }, { amount: 25000, currency: 'SAR' }),
      /Local payment amount is invalid/i,
    );
    expect409(
      () => assertAmountMatch({ amount: 10.005, currency: 'SAR' }, { amount: 1001, currency: 'SAR' }),
      /Local payment amount is invalid/i,
    );
    expect409(
      () => assertAmountMatch({ amount: 1.999, currency: 'SAR' }, { amount: 200, currency: 'SAR' }),
      /Local payment amount is invalid/i,
    );
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\nResults: ${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
