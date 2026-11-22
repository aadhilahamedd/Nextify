/**
 * Payment route rate-limit configuration
 * Run: node --test Backend/tests/paymentRateLimit.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  AUTH_WINDOW_MS,
  PAYMENT_CREATE_MAX,
  PAYMENT_VERIFY_MAX,
  PAYMENT_REFERENCE_MAX,
  paymentCreateLimiter,
  paymentVerifyLimiter,
  paymentReferenceLimiter,
} = require('../middleware/rateLimiters');

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
  await check('payment limiter constants match required windows', () => {
    assert.strictEqual(AUTH_WINDOW_MS, 15 * 60 * 1000);
    assert.strictEqual(PAYMENT_CREATE_MAX, 20);
    assert.strictEqual(PAYMENT_VERIFY_MAX, 30);
    assert.strictEqual(PAYMENT_REFERENCE_MAX, 15);
  });

  await check('payment limiter middleware functions are exported', () => {
    assert.strictEqual(typeof paymentCreateLimiter, 'function');
    assert.strictEqual(typeof paymentVerifyLimiter, 'function');
    assert.strictEqual(typeof paymentReferenceLimiter, 'function');
  });

  await check('payment limiters use safe generic 429 message shape', () => {
    const src = fs.readFileSync(path.join(__dirname, '../middleware/rateLimiters.js'), 'utf8');
    assert.ok(src.includes("message: 'Too many payment requests. Please try again later.'"));
    assert.ok(src.includes("message: 'Too many payment verification requests. Please try again later.'"));
    assert.ok(src.includes("message: 'Too many payment reference requests. Please try again later.'"));
    assert.ok(src.includes('standardHeaders: true'));
    assert.ok(src.includes('legacyHeaders: false'));
    assert.ok(src.includes('success: false'));
  });

  await check('payment routes apply limiters without requiring auth', () => {
    const src = fs.readFileSync(path.join(__dirname, '../routes/route.js'), 'utf8');
    assert.match(
      src,
      /router\.post\(\s*'\/api\/payments\/create',\s*paymentCreateLimiter,\s*optionalJwtMiddleware,\s*paymentController\.createPayment\s*\)/,
    );
    assert.match(
      src,
      /router\.post\(\s*'\/api\/payments\/moyasar\/reference',\s*paymentReferenceLimiter,\s*optionalJwtMiddleware,\s*paymentController\.attachMoyasarReference\s*\)/,
    );
    assert.match(
      src,
      /router\.get\(\s*'\/api\/payments\/verify\/:id',\s*paymentVerifyLimiter,\s*optionalJwtMiddleware,\s*paymentController\.verifyPayment\s*\)/,
    );
    assert.match(
      src,
      /router\.get\(\s*'\/api\/payment\/verify\/:paymentId',\s*paymentVerifyLimiter,\s*optionalJwtMiddleware,\s*paymentController\.verifyPayment\s*\)/,
    );
  });

  await check('both verify aliases share paymentVerifyLimiter', () => {
    const src = fs.readFileSync(path.join(__dirname, '../routes/route.js'), 'utf8');
    const verifyLines = src
      .split('\n')
      .filter((line) => line.includes('/api/payments/verify/:id') || line.includes('/api/payment/verify/:paymentId'));
    assert.strictEqual(verifyLines.length, 2);
    assert.ok(verifyLines.every((line) => line.includes('paymentVerifyLimiter')));
  });

  await check('webhook routes are not payment-rate-limited', () => {
    const src = fs.readFileSync(path.join(__dirname, '../routes/route.js'), 'utf8');
    const webhookLines = src
      .split('\n')
      .filter((line) => line.includes('/api/payments/webhook') || line.includes('/api/payment/webhook'));
    assert.ok(webhookLines.length >= 2);
    assert.ok(webhookLines.every((line) => !line.includes('paymentCreateLimiter')));
    assert.ok(webhookLines.every((line) => !line.includes('paymentVerifyLimiter')));
    assert.ok(webhookLines.every((line) => !line.includes('paymentReferenceLimiter')));
    assert.ok(webhookLines.every((line) => line.includes('paymentController.webhook')));
  });

  await check('trust proxy remains configured for Render IP accuracy', () => {
    const src = fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8');
    assert.ok(src.includes("set('trust proxy', 1)") || src.includes('set("trust proxy", 1)'));
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\nResults: ${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
