/**
 * Auth security — Phase 1
 * Run: node Backend/tests/authSecurity.test.js
 * Does not print secrets. Uses an in-memory User stub (no DB writes).
 */
const assert = require('assert');
const path = require('path');
const bcrypt = require('bcrypt');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase1_auth_security_test_secret_value';
delete process.env.ADMIN_EMAIL;
delete process.env.ADMIN_PASSWORD;
delete process.env.ADMIN_USERNAME;

const users = new Map();

class StubUser {
  constructor(doc) {
    Object.assign(this, doc);
    this._id = doc._id || `stub_${users.size + 1}`;
  }

  async save() {
    users.set(String(this.email).toLowerCase(), this);
    return this;
  }

  static async findOne(query = {}) {
    if (query.email) {
      return users.get(String(query.email).toLowerCase()) || null;
    }
    return null;
  }

  static async findById(id) {
    for (const user of users.values()) {
      if (String(user._id) === String(id)) return user;
    }
    return null;
  }
}

const userModelPath = require.resolve('../models/User');
require.cache[userModelPath] = {
  id: userModelPath,
  filename: userModelPath,
  loaded: true,
  exports: StubUser,
};

delete require.cache[require.resolve('../controllers/authController')];
const authController = require('../controllers/authController');
const { buildRegisteredUserDocument } = authController._test;

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

function createMockReq(body = {}) {
  return { body };
}

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
  users.clear();

  await check('registration document builder always sets role user', () => {
    const doc = buildRegisteredUserDocument({
      username: 'Attacker',
      email: 'support@nextify.com',
      passwordHash: 'hash',
    });
    assert.strictEqual(doc.role, 'user');
  });

  await check('register ignores role/isAdmin and special admin-like email', async () => {
    const res = createMockRes();
    await authController.register(
      createMockReq({
        username: 'Escalator',
        email: 'support@nextify.com',
        password: 'NotADefaultPass99!',
        role: 'admin',
        isAdmin: true,
        admin: true,
      }),
      res,
    );

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body?.data?.user?.role, 'user');
    const stored = users.get('support@nextify.com');
    assert.ok(stored);
    assert.strictEqual(stored.role, 'user');
  });

  await check('register with manipulated body still creates user role only', async () => {
    const res = createMockRes();
    await authController.register(
      createMockReq({
        username: 'Normal',
        email: 'user.phase1@example.com',
        password: 'AnotherStrongPass1!',
        role: 'admin',
      }),
      res,
    );
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body?.data?.user?.role, 'user');
  });

  await check('login never auto-creates admin when credentials missing from env', async () => {
    users.clear();
    const res = createMockRes();
    await authController.userLogin(
      createMockReq({
        email: 'support@nextify.com',
        password: 'nextify123',
      }),
      res,
    );
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(users.size, 0);
  });

  await check('admin login rejects non-admin users', async () => {
    users.clear();
    const hash = await bcrypt.hash('ValidUserPass123!', 10);
    await new StubUser({
      username: 'User',
      email: 'user.only@example.com',
      password: hash,
      role: 'user',
    }).save();

    const res = createMockRes();
    await authController.adminLogin(
      createMockReq({
        email: 'user.only@example.com',
        password: 'ValidUserPass123!',
      }),
      res,
    );
    assert.strictEqual(res.statusCode, 403);
  });

  await check('existing admin can still log in via adminLogin', async () => {
    users.clear();
    const hash = await bcrypt.hash('ExistingAdminPass123!', 10);
    await new StubUser({
      username: 'Admin',
      email: 'existing.admin@example.com',
      password: hash,
      role: 'admin',
    }).save();

    const res = createMockRes();
    await authController.adminLogin(
      createMockReq({
        email: 'existing.admin@example.com',
        password: 'ExistingAdminPass123!',
      }),
      res,
    );
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.data?.user?.role, 'admin');
    assert.ok(res.body?.data?.token);
  });

  await check('authController source has no hardcoded default admin password', () => {
    const fs = require('fs');
    const src = fs.readFileSync(path.join(__dirname, '../controllers/authController.js'), 'utf8');
    assert.ok(!src.includes('nextify123'));
    assert.ok(!src.includes('support@nextify.com'));
    assert.ok(!src.includes('createDefaultAdmin'));
    assert.ok(!src.includes('DEFAULT_ADMIN_PASSWORD'));
  });

  await check('openai test route and services are removed', () => {
    const fs = require('fs');
    const routes = fs.readFileSync(path.join(__dirname, '../routes/route.js'), 'utf8');
    const chatController = fs.readFileSync(path.join(__dirname, '../controllers/chatController.js'), 'utf8');
    const chatService = fs.readFileSync(path.join(__dirname, '../services/chatService.js'), 'utf8');
    assert.ok(!routes.includes('test-openai'));
    assert.ok(!routes.includes('openaiService'));
    assert.ok(!routes.includes("require('openai')") && !routes.includes('require("openai")'));
    assert.ok(!chatController.includes('openaiService'));
    assert.ok(!chatController.includes('aiChatService'));
    assert.ok(!chatController.includes("require('openai')") && !chatController.includes('require("openai")'));
    assert.ok(chatController.includes('processMessage'));
    assert.ok(!chatService.includes("require('openai')") && !chatService.includes('require("openai")'));
    assert.ok(!fs.existsSync(path.join(__dirname, '../services/openaiService.js')));
    assert.ok(!fs.existsSync(path.join(__dirname, '../services/aiChatService.js')));
  });

  await check('BACKEND_SETUP.md does not embed mongodb credentials', () => {
    const fs = require('fs');
    const md = fs.readFileSync(path.join(__dirname, '../BACKEND_SETUP.md'), 'utf8');
    assert.ok(!/mongodb\+srv:\/\/[^:]+:[^@]+@/i.test(md));
    assert.ok(!md.includes('nextify123@'));
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
