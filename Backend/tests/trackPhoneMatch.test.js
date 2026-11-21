/**
 * Public booking tracking — Saudi phone verification
 * Run: node --test Backend/tests/trackPhoneMatch.test.js
 */
const assert = require('assert');

// Avoid loading full app env side effects beyond the controller module graph.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'track_phone_match_test_secret_value';

delete require.cache[require.resolve('../controllers/bookingController')];
const {
  normalizeTrackPhone,
  canonicalizeTrackPhone,
  phonesMatchForTracking,
} = require('../controllers/bookingController')._test;

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

async function run() {
  await check('same number with spaces and punctuation matches', () => {
    assert.strictEqual(
      phonesMatchForTracking('+966 55 599-2937', '05 5599 2937'),
      true,
    );
    assert.strictEqual(
      normalizeTrackPhone('+966 (55) 599-2937'),
      '966555992937',
    );
  });

  await check('Saudi local 05 versus international 9665 match', () => {
    assert.strictEqual(phonesMatchForTracking('0555992937', '966555992937'), true);
    assert.strictEqual(phonesMatchForTracking('+966555992937', '0555992937'), true);
    assert.strictEqual(phonesMatchForTracking('555992937', '0555992937'), true);
    assert.strictEqual(canonicalizeTrackPhone('0555992937'), '966555992937');
    assert.strictEqual(canonicalizeTrackPhone('966555992937'), '966555992937');
    assert.strictEqual(canonicalizeTrackPhone('555992937'), '966555992937');
  });

  await check('different numbers sharing last nine digits do not match', () => {
    // Same last 9 digits (555992937) but different country / prefix — must not match via suffix.
    assert.strictEqual(
      phonesMatchForTracking('966555992937', '111555992937'),
      false,
    );
    assert.strictEqual(
      phonesMatchForTracking('0555992937', '9555992937'),
      false,
    );
    assert.strictEqual(
      phonesMatchForTracking('966555992937', '0555888777'),
      false,
    );
  });

  await check('short numbers are rejected', () => {
    assert.strictEqual(phonesMatchForTracking('0555992937', '2937'), false);
    assert.strictEqual(phonesMatchForTracking('0555992937', '55992937'), false); // 8 digits
    assert.strictEqual(phonesMatchForTracking('12345678', '12345678'), false);
    assert.strictEqual(canonicalizeTrackPhone('12345678'), null);
  });

  await check('empty numbers are rejected', () => {
    assert.strictEqual(phonesMatchForTracking('', ''), false);
    assert.strictEqual(phonesMatchForTracking('0555992937', ''), false);
    assert.strictEqual(phonesMatchForTracking('', '0555992937'), false);
    assert.strictEqual(phonesMatchForTracking(null, undefined), false);
    assert.strictEqual(normalizeTrackPhone(''), '');
  });

  await check('no general suffix matching for long shared tails', () => {
    // Provided is 9+ digits and equals the suffix of stored, but is not the same complete Saudi number.
    assert.strictEqual(
      phonesMatchForTracking('966511122233', '511122233'),
      true,
    ); // 511122233 is valid national form of same mobile
    assert.strictEqual(
      phonesMatchForTracking('966511122233', '111222333'),
      false,
    ); // different complete number that only shares a numeric tail pattern incorrectly if suffix-matched
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\nResults: ${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
