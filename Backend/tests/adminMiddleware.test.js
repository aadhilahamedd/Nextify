/**
 * Admin middleware role revocation tests
 * Run: node Backend/tests/adminMiddleware.test.js
 * Uses an in-memory stub for User.findById(...).select('role').lean() (no DB writes).
 */
const assert = require('assert');
const User = require('../models/User');
const adminMiddleware = require('../middleware/adminMiddleware');

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

function mockFindById(resolver) {
  let calledWith = null;
  let selectedFields = null;
  let leanCalled = false;

  User.findById = (id) => {
    calledWith = id;
    return {
      select(fields) {
        selectedFields = fields;
        return {
          lean() {
            leanCalled = true;
            return resolver(id);
          },
        };
      },
    };
  };

  return {
    get calledWith() { return calledWith; },
    get selectedFields() { return selectedFields; },
    get leanCalled() { return leanCalled; },
  };
}

const results = [];

async function check(name, fn) {
  const originalFindById = User.findById;
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`ok ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.log(`fail ${name} — ${err.message}`);
  } finally {
    User.findById = originalFindById;
  }
}

async function run() {
  await check('1. Valid admin in JWT and MongoDB is allowed', async () => {
    const spy = mockFindById(async () => ({ _id: '507f191e810c19729de860aa', role: 'admin' }));
    const res = createMockRes();
    let nextCalls = 0;

    await adminMiddleware(
      { user: { userId: '507f191e810c19729de860aa', role: 'admin' } },
      res,
      () => { nextCalls += 1; },
    );

    assert.strictEqual(nextCalls, 1);
    assert.strictEqual(res.statusCode, null);
    assert.strictEqual(spy.calledWith, '507f191e810c19729de860aa');
    assert.strictEqual(spy.selectedFields, 'role');
    assert.strictEqual(spy.leanCalled, true);
  });

  await check('2. Ordinary user JWT is rejected with 403 without querying DB', async () => {
    const spy = mockFindById(async () => {
      throw new Error('DB should not be queried for non-admin JWT');
    });
    const res = createMockRes();
    let nextCalls = 0;

    await adminMiddleware(
      { user: { userId: '507f191e810c19729de860ab', role: 'user' } },
      res,
      () => { nextCalls += 1; },
    );

    assert.strictEqual(nextCalls, 0);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body?.message, 'Admin access required.');
    assert.strictEqual(spy.calledWith, null);
  });

  await check('3. Admin demoted to normal user in MongoDB is rejected with 403', async () => {
    const spy = mockFindById(async () => ({ _id: '507f191e810c19729de860ac', role: 'user' }));
    const res = createMockRes();
    let nextCalls = 0;

    await adminMiddleware(
      { user: { userId: '507f191e810c19729de860ac', role: 'admin' } },
      res,
      () => { nextCalls += 1; },
    );

    assert.strictEqual(nextCalls, 0);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body?.message, 'Admin access required.');
    assert.strictEqual(spy.calledWith, '507f191e810c19729de860ac');
  });

  await check('4. Deleted admin account in MongoDB is rejected with 403', async () => {
    mockFindById(async () => null);
    const res = createMockRes();
    let nextCalls = 0;

    await adminMiddleware(
      { user: { userId: '507f191e810c19729de860ad', role: 'admin' } },
      res,
      () => { nextCalls += 1; },
    );

    assert.strictEqual(nextCalls, 0);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body?.message, 'Admin access required.');
  });

  await check('5. Missing userId in JWT is rejected with 403 without querying DB', async () => {
    const spy = mockFindById(async () => {
      throw new Error('DB should not be queried when userId is missing');
    });
    const res = createMockRes();
    let nextCalls = 0;

    await adminMiddleware(
      { user: { role: 'admin' } },
      res,
      () => { nextCalls += 1; },
    );

    assert.strictEqual(nextCalls, 0);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body?.message, 'Admin access required.');
    assert.strictEqual(spy.calledWith, null);
  });

  await check('6. MongoDB lookup failure returns 500 safely without leaking internal details or calling next', async () => {
    mockFindById(async () => {
      throw new Error('MongoNetworkError: ECONNREFUSED internal-atlas-host:27017');
    });
    const res = createMockRes();
    let nextCalls = 0;

    await adminMiddleware(
      { user: { userId: '507f191e810c19729de860ae', role: 'admin' } },
      res,
      () => { nextCalls += 1; },
    );

    assert.strictEqual(nextCalls, 0);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.body?.success, false);
    const serialized = JSON.stringify(res.body);
    assert.ok(!serialized.includes('MongoNetworkError'));
    assert.ok(!serialized.includes('ECONNREFUSED'));
    assert.ok(!serialized.includes('internal-atlas-host'));
  });

  await check('7. Missing JWT user object is rejected with 403 without querying DB', async () => {
    const spy = mockFindById(async () => {
      throw new Error('DB should not be queried when req.user is missing');
    });
    const res = createMockRes();
    let nextCalls = 0;

    await adminMiddleware({}, res, () => { nextCalls += 1; });

    assert.strictEqual(nextCalls, 0);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body?.message, 'Admin access required.');
    assert.strictEqual(spy.calledWith, null);
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
