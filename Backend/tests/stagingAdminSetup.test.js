/**
 * Tests for temporary staging-only admin setup endpoint:
 *   POST /api/internal/staging-admin-setup
 * Run: node Backend/tests/stagingAdminSetup.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/User');
const controller = require('../controllers/stagingAdminSetupController');

const results = [];

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function createMockReq({ token, body = {} } = {}) {
  const headers = {};
  if (token !== undefined) headers[controller.SETUP_TOKEN_HEADER] = token;
  return {
    headers,
    body,
    get(name) {
      return headers[String(name).toLowerCase()];
    },
  };
}

async function check(name, fn) {
  const origEnv = {
    STAGING_ADMIN_SETUP_ENABLED: process.env.STAGING_ADMIN_SETUP_ENABLED,
    STAGING_ADMIN_SETUP_TOKEN: process.env.STAGING_ADMIN_SETUP_TOKEN,
    EXPECTED_DB: process.env.EXPECTED_DB,
  };
  const origNameDesc = Object.getOwnPropertyDescriptor(mongoose.connection, 'name');
  const origReadyStateDesc = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
  const origFindOne = User.findOne;
  const origSave = User.prototype.save;

  try {
    controller._test.resetSetupCompleted();
    process.env.STAGING_ADMIN_SETUP_ENABLED = 'true';
    process.env.STAGING_ADMIN_SETUP_TOKEN = 'test_setup_token_value_32_chars_ok';
    process.env.EXPECTED_DB = 'Nextify_Staging';
    Object.defineProperty(mongoose.connection, 'name', { value: 'Nextify_Staging', configurable: true });
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
    await fn();
    results.push({ name, ok: true });
    console.log(`ok ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.log(`fail ${name} — ${err.message}`);
  } finally {
    controller._test.resetSetupCompleted();
    for (const [k, v] of Object.entries(origEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    if (origNameDesc) Object.defineProperty(mongoose.connection, 'name', origNameDesc);
    else delete mongoose.connection.name;
    if (origReadyStateDesc) Object.defineProperty(mongoose.connection, 'readyState', origReadyStateDesc);
    else delete mongoose.connection.readyState;
    User.findOne = origFindOne;
    User.prototype.save = origSave;
  }
}

async function run() {
  const VALID_TOKEN = 'test_setup_token_value_32_chars_ok';
  const VALID_PASS = 'StagingStrongPass2026!';

  await check('1. Missing setup token is rejected with 403 and performs no DB query', async () => {
    let dbTouched = false;
    User.findOne = async () => { dbTouched = true; return null; };
    const req = createMockReq({ body: { email: 'sales@nextifylimo.com', password: VALID_PASS } });
    const res = createMockRes();
    await controller.setupStagingAdmin(req, res);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(dbTouched, false);
  });

  await check('2. Incorrect setup token (different length and same length) is rejected with 403', async () => {
    let dbTouched = false;
    User.findOne = async () => { dbTouched = true; return null; };

    for (const badToken of ['short', 'test_setup_token_value_32_chars_XX']) {
      const req = createMockReq({
        token: badToken,
        body: { email: 'sales@nextifylimo.com', password: VALID_PASS },
      });
      const res = createMockRes();
      await controller.setupStagingAdmin(req, res);
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body.success, false);
    }
    assert.strictEqual(dbTouched, false);
  });

  await check('3. Setup disabled (unset or false) is rejected with 403', async () => {
    let dbTouched = false;
    User.findOne = async () => { dbTouched = true; return null; };

    for (const val of [undefined, 'false', '1']) {
      if (val === undefined) delete process.env.STAGING_ADMIN_SETUP_ENABLED;
      else process.env.STAGING_ADMIN_SETUP_ENABLED = val;

      const req = createMockReq({
        token: VALID_TOKEN,
        body: { email: 'sales@nextifylimo.com', password: VALID_PASS },
      });
      const res = createMockRes();
      await controller.setupStagingAdmin(req, res);
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body.success, false);
    }
    assert.strictEqual(dbTouched, false);
  });

  await check('4. Wrong database (Nextify_Production or mismatched EXPECTED_DB) is rejected with 403 and never leaks DB name', async () => {
    let dbTouched = false;
    User.findOne = async () => { dbTouched = true; return null; };

    // Case A: Connected to Nextify_Production
    Object.defineProperty(mongoose.connection, 'name', { value: 'Nextify_Production', configurable: true });
    const resA = createMockRes();
    await controller.setupStagingAdmin(
      createMockReq({ token: VALID_TOKEN, body: { email: 'sales@nextifylimo.com', password: VALID_PASS } }),
      resA
    );
    assert.strictEqual(resA.statusCode, 403);
    assert.ok(!JSON.stringify(resA.body).includes('Nextify_Production'));
    assert.ok(!JSON.stringify(resA.body).includes('Nextify_Staging'));

    // Case B: EXPECTED_DB != Nextify_Staging
    Object.defineProperty(mongoose.connection, 'name', { value: 'Nextify_Staging', configurable: true });
    process.env.EXPECTED_DB = 'Nextify_Production';
    const resB = createMockRes();
    await controller.setupStagingAdmin(
      createMockReq({ token: VALID_TOKEN, body: { email: 'sales@nextifylimo.com', password: VALID_PASS } }),
      resB
    );
    assert.strictEqual(resB.statusCode, 403);
    assert.strictEqual(dbTouched, false);
  });

  await check('5. Invalid password (<12 chars or placeholder) and disallowed email are rejected with 400', async () => {
    let dbTouched = false;
    User.findOne = async () => { dbTouched = true; return null; };

    for (const badPass of ['', 'short123', 'change_me_in_production']) {
      const res = createMockRes();
      await controller.setupStagingAdmin(
        createMockReq({ token: VALID_TOKEN, body: { email: 'sales@nextifylimo.com', password: badPass } }),
        res
      );
      assert.strictEqual(res.statusCode, 400);
    }

    const badEmailRes = createMockRes();
    await controller.setupStagingAdmin(
      createMockReq({ token: VALID_TOKEN, body: { email: 'attacker@example.com', password: VALID_PASS } }),
      badEmailRes
    );
    assert.strictEqual(badEmailRes.statusCode, 400);
    assert.strictEqual(dbTouched, false);
  });

  await check('6. Successful staging admin provisioning creates or updates admin with bcrypt hash and no DB info in response', async () => {
    const existingDoc = {
      username: 'Old Name',
      email: 'sales@nextifylimo.com',
      password: 'old',
      role: 'user',
      saved: false,
      async save() {
        this.saved = true;
        return this;
      },
    };
    User.findOne = async (q) => {
      assert.strictEqual(q.email, 'sales@nextifylimo.com');
      return existingDoc;
    };

    const res = createMockRes();
    await controller.setupStagingAdmin(
      createMockReq({
        token: VALID_TOKEN,
        body: { email: '  SALES@NEXTIFYLIMO.COM  ', password: VALID_PASS },
      }),
      res
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(existingDoc.saved, true);
    assert.strictEqual(existingDoc.role, 'admin');
    assert.strictEqual(existingDoc.username, 'Nextify Staging Admin');
    assert.strictEqual(await bcrypt.compare(VALID_PASS, existingDoc.password), true);
    const serialized = JSON.stringify(res.body);
    assert.ok(!serialized.includes('Nextify_Staging'), 'response must never expose database name');
    assert.ok(!serialized.includes(VALID_PASS), 'response must never expose password');
    assert.ok(!serialized.includes(VALID_TOKEN), 'response must never expose setup token');

    // Also test creating when user does not exist yet
    controller._test.resetSetupCompleted();
    let createdDoc = null;
    User.findOne = async () => null;
    User.prototype.save = async function saveStub() {
      createdDoc = {
        username: this.username,
        email: this.email,
        password: this.password,
        role: this.role,
      };
      return this;
    };
    const resCreate = createMockRes();
    await controller.setupStagingAdmin(
      createMockReq({
        token: VALID_TOKEN,
        body: { email: 'sales@nextifylimo.com', password: VALID_PASS },
      }),
      resCreate
    );
    assert.strictEqual(resCreate.statusCode, 201);
    assert.ok(createdDoc);
    assert.strictEqual(createdDoc.role, 'admin');
    assert.strictEqual(await bcrypt.compare(VALID_PASS, createdDoc.password), true);
  });

  await check('7. Repeated setup attempts after success are blocked with 409 without touching DB', async () => {
    let findCalls = 0;
    User.findOne = async () => {
      findCalls += 1;
      return {
        username: 'Nextify Staging Admin',
        email: 'sales@nextifylimo.com',
        password: 'old',
        role: 'admin',
        async save() { return this; },
      };
    };

    const res1 = createMockRes();
    await controller.setupStagingAdmin(
      createMockReq({ token: VALID_TOKEN, body: { email: 'sales@nextifylimo.com', password: VALID_PASS } }),
      res1
    );
    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(findCalls, 1);

    const res2 = createMockRes();
    await controller.setupStagingAdmin(
      createMockReq({ token: VALID_TOKEN, body: { email: 'sales@nextifylimo.com', password: VALID_PASS } }),
      res2
    );
    assert.strictEqual(res2.statusCode, 409);
    assert.strictEqual(res2.body.success, false);
    assert.strictEqual(findCalls, 1, 'repeated attempt must not query or write DB');
  });

  await check('8. Route is registered as POST-only with stagingAdminSetupLimiter', () => {
    const routeSrc = fs.readFileSync(path.join(__dirname, '../routes/route.js'), 'utf8');
    assert.match(
      routeSrc,
      /router\.post\(\s*'\/api\/internal\/staging-admin-setup',\s*stagingAdminSetupLimiter,\s*stagingAdminSetupController\.setupStagingAdmin\s*\)/
    );
  });

  await check('9. Disconnected MongoDB (readyState !== 1) is rejected with 403 without touching DB', async () => {
    let dbTouched = false;
    User.findOne = async () => { dbTouched = true; return null; };
    for (const state of [0, 2, 3]) {
      Object.defineProperty(mongoose.connection, 'readyState', { value: state, configurable: true });
      const res = createMockRes();
      await controller.setupStagingAdmin(
        createMockReq({ token: VALID_TOKEN, body: { email: 'sales@nextifylimo.com', password: VALID_PASS } }),
        res
      );
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body.success, false);
    }
    assert.strictEqual(dbTouched, false);
  });

  await check('10. Two simultaneous valid requests serialize via in-process lock: only one succeeds, other gets 409', async () => {
    let findCalls = 0;
    let saveCalls = 0;
    User.findOne = async () => {
      findCalls += 1;
      await new Promise((r) => setTimeout(r, 30));
      return {
        username: 'Nextify Staging Admin',
        email: 'sales@nextifylimo.com',
        password: 'old',
        role: 'admin',
        async save() {
          saveCalls += 1;
          return this;
        },
      };
    };

    const res1 = createMockRes();
    const res2 = createMockRes();
    await Promise.all([
      controller.setupStagingAdmin(
        createMockReq({ token: VALID_TOKEN, body: { email: 'sales@nextifylimo.com', password: VALID_PASS } }),
        res1
      ),
      controller.setupStagingAdmin(
        createMockReq({ token: VALID_TOKEN, body: { email: 'sales@nextifylimo.com', password: VALID_PASS } }),
        res2
      ),
    ]);

    const statuses = [res1.statusCode, res2.statusCode].sort();
    assert.deepStrictEqual(statuses, [200, 409]);
    assert.strictEqual(findCalls, 1, 'concurrent second request must not query DB');
    assert.strictEqual(saveCalls, 1, 'concurrent second request must not write DB');
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\nResults: ${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
