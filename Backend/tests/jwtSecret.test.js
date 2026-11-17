/**
 * Run: node Backend/tests/jwtSecret.test.js
 * Does not print secret values.
 */
const assert = require('assert');
const jwt = require('jsonwebtoken');
const {
  DEVELOPMENT_JWT_SECRET,
  assertProductionJwtSecret,
  getJwtSecret,
} = require('../utils/jwtSecret');
const { signAuthToken } = require('../utils/authToken');

const saved = {
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function setEnv(nodeEnv, secret) {
  if (nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = nodeEnv;
  if (secret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = secret;
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
  } finally {
    restoreEnv();
  }
}

check('production rejects a missing JWT secret', () => {
  setEnv('production', undefined);
  const err = throws(() => assertProductionJwtSecret());
  assert.ok(err);
  assert.strictEqual(err.statusCode, 500);
  assert.ok(!err.message.includes('nextify_fallback_secret'));
  assert.throws(() => getJwtSecret());
});

check('production rejects an empty JWT secret', () => {
  setEnv('production', '   ');
  const err = throws(() => getJwtSecret());
  assert.ok(err);
  assert.strictEqual(err.statusCode, 500);
});

check('production rejects the development fallback', () => {
  setEnv('production', DEVELOPMENT_JWT_SECRET);
  const err = throws(() => assertProductionJwtSecret());
  assert.ok(err);
  assert.ok(!err.message.includes(DEVELOPMENT_JWT_SECRET));
});

check('production rejects the example placeholder', () => {
  setEnv('production', 'your_secure_jwt_secret_here');
  assert.throws(() => assertProductionJwtSecret());
});

check('production accepts a unique JWT secret', () => {
  const secret = 'unit-test-production-jwt-secret';
  setEnv('production', secret);
  assert.doesNotThrow(() => assertProductionJwtSecret());
  assert.strictEqual(getJwtSecret(), secret);
});

check('development still uses the fallback when JWT_SECRET is unset', () => {
  setEnv(undefined, undefined);
  assert.doesNotThrow(() => assertProductionJwtSecret());
  assert.strictEqual(getJwtSecret(), DEVELOPMENT_JWT_SECRET);
});

check('development keeps an explicitly configured secret', () => {
  setEnv(undefined, 'unit-test-dev-jwt-secret');
  assert.strictEqual(getJwtSecret(), 'unit-test-dev-jwt-secret');
});

check('token payload and expiry option stay the same', () => {
  setEnv(undefined, 'unit-test-sign-jwt-secret');
  const token = signAuthToken({ _id: 'user-1', role: 'customer' });
  const decoded = jwt.verify(token, getJwtSecret());
  assert.strictEqual(decoded.userId, 'user-1');
  assert.strictEqual(decoded.role, 'customer');
  assert.ok(decoded.exp > decoded.iat);
});

const failed = results.filter((item) => !item.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
