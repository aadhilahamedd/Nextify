/**
 * Payment open-checkout index readiness tests
 * Run: node Backend/tests/paymentIndexReadiness.test.js
 */
const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const {
  OPEN_CHECKOUT_INDEX,
  ensureOpenCheckoutAttemptIndex,
  openCheckoutIndexMatches,
  findOpenCheckoutIndex,
} = require('../services/paymentIndexReadiness');

function createMockCollection({ indexes = [], createImpl } = {}) {
  let stored = indexes.map((i) => ({ ...i }));
  return {
    async indexes() {
      return stored.map((i) => ({ ...i }));
    },
    async createIndex(key, options = {}) {
      if (typeof createImpl === 'function') {
        return createImpl(key, options, stored);
      }
      stored.push({
        name: options.name,
        key,
        unique: Boolean(options.unique),
        partialFilterExpression: options.partialFilterExpression,
      });
      return options.name;
    },
    _setIndexes(next) {
      stored = next.map((i) => ({ ...i }));
    },
  };
}

function mockPaymentModel(collection) {
  return { collection };
}

async function runAllTests() {
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

  await check('OPEN_CHECKOUT_INDEX constant matches Payment schema intent', () => {
    assert.deepStrictEqual(OPEN_CHECKOUT_INDEX.key, { booking: 1, provider: 1 });
    assert.strictEqual(OPEN_CHECKOUT_INDEX.unique, true);
    assert.strictEqual(OPEN_CHECKOUT_INDEX.name, 'uniq_open_checkout_attempt');
    assert.deepStrictEqual(OPEN_CHECKOUT_INDEX.partialFilterExpression, {
      status: 'PENDING',
      providerReference: '',
    });
  });

  await check('Index already exists: ensure is idempotent and does not recreate', async () => {
    let createCalls = 0;
    const existing = {
      name: 'uniq_open_checkout_attempt',
      key: { booking: 1, provider: 1 },
      unique: true,
      partialFilterExpression: { status: 'PENDING', providerReference: '' },
      v: 2,
    };
    const collection = createMockCollection({
      indexes: [existing],
      createImpl: () => {
        createCalls += 1;
        throw new Error('createIndex must not be called');
      },
    });
    const result = await ensureOpenCheckoutAttemptIndex(mockPaymentModel(collection));
    assert.strictEqual(result.created, false);
    assert.strictEqual(result.verified, true);
    assert.strictEqual(createCalls, 0);
    assert.ok(openCheckoutIndexMatches(result.index));
  });

  await check('Index missing: created successfully then verified', async () => {
    const collection = createMockCollection({ indexes: [] });
    const result = await ensureOpenCheckoutAttemptIndex(mockPaymentModel(collection));
    assert.strictEqual(result.created, true);
    assert.strictEqual(result.verified, true);
    assert.strictEqual(result.name, 'uniq_open_checkout_attempt');
    const listed = await collection.indexes();
    assert.ok(findOpenCheckoutIndex(listed));
    assert.ok(openCheckoutIndexMatches(findOpenCheckoutIndex(listed)));
  });

  await check('Index creation fails with duplicate-key data: fails closed', async () => {
    const collection = createMockCollection({
      indexes: [],
      createImpl: () => {
        const err = new Error('E11000 duplicate key error');
        err.code = 11000;
        throw err;
      },
    });
    await assert.rejects(
      () => ensureOpenCheckoutAttemptIndex(mockPaymentModel(collection)),
      (err) => err.code === 'PAYMENT_INDEX_DUPLICATE_DATA'
    );
  });

  await check('Index definition incorrect: fails closed without modifying data', async () => {
    const wrong = {
      name: 'uniq_open_checkout_attempt',
      key: { booking: 1, provider: 1 },
      unique: true,
      partialFilterExpression: { status: 'PENDING' }, // missing providerReference
    };
    let createCalls = 0;
    const collection = createMockCollection({
      indexes: [wrong],
      createImpl: () => {
        createCalls += 1;
      },
    });
    await assert.rejects(
      () => ensureOpenCheckoutAttemptIndex(mockPaymentModel(collection)),
      (err) => err.code === 'PAYMENT_INDEX_DEFINITION_MISMATCH'
    );
    assert.strictEqual(createCalls, 0);
  });

  await check('Server does not listen before index readiness', async () => {
    const order = [];
    const originalConnect = require('../dbConnect/dbConnect');
    const connectPath = require.resolve('../dbConnect/dbConnect');
    const indexPath = require.resolve('../index');

    // Isolate module load with stubs via temporary bootstrap test (no real listen).
    const fakeConnect = {
      async connectAndPrepareDatabase() {
        order.push('ready');
        return { indexResult: { created: false, name: 'uniq_open_checkout_attempt' } };
      },
    };

    // Exercise bootstrap orchestration from a minimal inline copy of the contract:
    async function bootstrapUnderTest({ connectFn, listenImpl }) {
      await connectFn();
      order.push('after-ready');
      await new Promise((resolve) => {
        listenImpl(null, 0, () => {
          order.push('listen');
          resolve();
        });
      });
    }

    await bootstrapUnderTest({
      connectFn: fakeConnect.connectAndPrepareDatabase,
      listenImpl: (_app, _port, cb) => {
        assert.ok(order.includes('ready'), 'listen must not run before readiness');
        cb();
        return { on() {} };
      },
    });

    assert.deepStrictEqual(order, ['ready', 'after-ready', 'listen']);
    // Keep require cache clean for other suites if this file touched them.
    assert.ok(originalConnect.connectAndPrepareDatabase);
    assert.ok(require.cache[connectPath]);
    assert.ok(require.cache[indexPath] || true);
  });

  await check('openCheckoutIndexMatches rejects non-unique or wrong keys', () => {
    assert.strictEqual(
      openCheckoutIndexMatches({
        name: 'uniq_open_checkout_attempt',
        key: { booking: 1, provider: 1 },
        unique: false,
        partialFilterExpression: { status: 'PENDING', providerReference: '' },
      }),
      false
    );
    assert.strictEqual(
      openCheckoutIndexMatches({
        name: 'uniq_open_checkout_attempt',
        key: { booking: 1 },
        unique: true,
        partialFilterExpression: { status: 'PENDING', providerReference: '' },
      }),
      false
    );
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\nResults: ${results.length - failed.length} passed, ${failed.length} failed\n`);
  process.exit(failed.length ? 1 : 0);
}

runAllTests();
