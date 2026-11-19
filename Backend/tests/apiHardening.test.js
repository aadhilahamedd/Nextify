/**
 * Phase D — API hardening
 * Run: node --test Backend/tests/apiHardening.test.js
 * Does not print secrets. Avoids MongoDB and live network.
 */
const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase_d_api_hardening_test_secret_value';
delete process.env.JWT_EXPIRES_IN;

// Fresh module loads for constants under test.
delete require.cache[require.resolve('../utils/authToken')];
const { TOKEN_EXPIRES_IN, REFRESH_WINDOW_MS, getJwtSecret, signAuthToken } = require('../utils/authToken');
const {
  AUTH_WINDOW_MS,
  AUTH_LOGIN_REGISTER_MAX,
  AUTH_REFRESH_MAX,
} = require('../middleware/rateLimiters');
const errorHandler = require('../middleware/errorHandler');
const { verifyWhatsAppSignature } = require('../middleware/whatsappSignature');

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
    sendStatus(code) {
      this.statusCode = code;
      return this;
    },
  };
}

async function run() {
  await check('JWT default expiry is 12h', () => {
    assert.strictEqual(TOKEN_EXPIRES_IN, '12h');
  });

  await check('refresh grace window is 24 hours', () => {
    assert.strictEqual(REFRESH_WINDOW_MS, 24 * 60 * 60 * 1000);
  });

  await check('rate limiter windows match Phase D defaults', () => {
    assert.strictEqual(AUTH_WINDOW_MS, 15 * 60 * 1000);
    assert.strictEqual(AUTH_LOGIN_REGISTER_MAX, 10);
    assert.strictEqual(AUTH_REFRESH_MAX, 30);
  });

  await check('refresh rejects tokens older than 24h grace', async () => {
    const users = new Map();
    class StubUser {
      constructor(doc) {
        Object.assign(this, doc);
      }
      static async findById(id) {
        return users.get(String(id)) || null;
      }
    }
    const user = { _id: 'u_refresh', username: 'Admin', email: 'a@example.com', role: 'admin' };
    users.set('u_refresh', user);

    const userModelPath = require.resolve('../models/User');
    require.cache[userModelPath] = {
      id: userModelPath,
      filename: userModelPath,
      loaded: true,
      exports: StubUser,
    };
    delete require.cache[require.resolve('../controllers/authController')];
    const authController = require('../controllers/authController');

    const expiredFarPast = Math.floor(Date.now() / 1000) - (25 * 60 * 60);
    const staleToken = jwt.sign(
      { userId: 'u_refresh', role: 'admin', exp: expiredFarPast },
      getJwtSecret(),
    );

    const res = createMockRes();
    await authController.refresh(
      { headers: { authorization: `Bearer ${staleToken}` } },
      res,
    );
    assert.strictEqual(res.statusCode, 401);
  });

  await check('refresh accepts token within 24h grace', async () => {
    const users = new Map();
    class StubUser {
      constructor(doc) {
        Object.assign(this, doc);
      }
      static async findById(id) {
        return users.get(String(id)) || null;
      }
    }
    const user = { _id: 'u_fresh', username: 'Admin', email: 'b@example.com', role: 'admin' };
    users.set('u_fresh', user);

    const userModelPath = require.resolve('../models/User');
    require.cache[userModelPath] = {
      id: userModelPath,
      filename: userModelPath,
      loaded: true,
      exports: StubUser,
    };
    delete require.cache[require.resolve('../controllers/authController')];
    const authController = require('../controllers/authController');

    const expiredRecently = Math.floor(Date.now() / 1000) - (60 * 60);
    const recentToken = jwt.sign(
      { userId: 'u_fresh', role: 'admin', exp: expiredRecently },
      getJwtSecret(),
    );

    const res = createMockRes();
    await authController.refresh(
      { headers: { authorization: `Bearer ${recentToken}` } },
      res,
    );
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body?.data?.token);
  });

  await check('error handler does not echo internal 500 messages', () => {
    const res = createMockRes();
    errorHandler(new Error('MongoServerError: secret connection string leaked'), {}, res, () => {});
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.body?.message, 'Internal server error');
    assert.ok(!JSON.stringify(res.body).includes('connection string'));
    assert.ok(!JSON.stringify(res.body).includes('MongoServerError'));
  });

  await check('error handler duplicate-key omits mongo detail', () => {
    const res = createMockRes();
    const err = new Error('E11000 duplicate key error collection: payments index: uniq');
    err.code = 11000;
    errorHandler(err, {}, res, () => {});
    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res.body?.message, 'Duplicate record');
    assert.ok(!JSON.stringify(res.body).includes('E11000'));
  });

  await check('review create forces approved false', async () => {
    let created = null;
    class StubReview {
      static async create(doc) {
        created = { _id: 'rev1', ...doc };
        return created;
      }
      static async find() {
        return { sort() { return { limit() { return []; } }; } };
      }
    }
    const reviewPath = require.resolve('../models/Review');
    require.cache[reviewPath] = {
      id: reviewPath,
      filename: reviewPath,
      loaded: true,
      exports: StubReview,
    };
    delete require.cache[require.resolve('../controllers/reviewController')];
    const reviewController = require('../controllers/reviewController');

    const res = createMockRes();
    await reviewController.createReview(
      { body: { name: 'Guest', quote: 'Great ride', rating: 5, approved: true } },
      res,
    );
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(created.approved, false);
    assert.strictEqual(res.body?.data?.review?.approved, false);
  });

  await check('Review schema source defaults approved to false', () => {
    const src = fs.readFileSync(path.join(__dirname, '../models/Review.js'), 'utf8');
    assert.ok(/approved:\s*\{\s*type:\s*Boolean,\s*default:\s*false/.test(src));
  });

  await check('WhatsApp signature accepts valid HMAC', async () => {
    const secret = 'test_whatsapp_app_secret';
    const body = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account' }));
    const hex = crypto.createHmac('sha256', secret).update(body).digest('hex');

    const prevSecret = process.env.WHATSAPP_APP_SECRET;
    const prevToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const prevPhone = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const prevNode = process.env.NODE_ENV;
    process.env.WHATSAPP_APP_SECRET = secret;
    process.env.WHATSAPP_ACCESS_TOKEN = 'token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123';
    process.env.NODE_ENV = 'production';

    delete require.cache[require.resolve('../config/whatsappConfig')];
    delete require.cache[require.resolve('../middleware/whatsappSignature')];
    const { verifyWhatsAppSignature: verify } = require('../middleware/whatsappSignature');

    const req = {
      rawBody: body,
      get(name) {
        if (name === 'X-Hub-Signature-256') return `sha256=${hex}`;
        return undefined;
      },
    };
    const res = createMockRes();
    let nextCalled = false;
    await new Promise((resolve) => {
      verify(req, res, () => {
        nextCalled = true;
        resolve();
      });
      setTimeout(resolve, 50);
    });
    assert.ok(nextCalled);
    assert.strictEqual(res.statusCode, null);

    process.env.WHATSAPP_APP_SECRET = prevSecret;
    process.env.WHATSAPP_ACCESS_TOKEN = prevToken;
    process.env.WHATSAPP_PHONE_NUMBER_ID = prevPhone;
    process.env.NODE_ENV = prevNode;
    delete require.cache[require.resolve('../config/whatsappConfig')];
    delete require.cache[require.resolve('../middleware/whatsappSignature')];
  });

  await check('WhatsApp signature rejects invalid HMAC', async () => {
    const secret = 'test_whatsapp_app_secret_2';
    const body = Buffer.from('{"object":"whatsapp_business_account"}');

    const prevSecret = process.env.WHATSAPP_APP_SECRET;
    const prevToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const prevPhone = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const prevNode = process.env.NODE_ENV;
    process.env.WHATSAPP_APP_SECRET = secret;
    process.env.WHATSAPP_ACCESS_TOKEN = 'token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123';
    process.env.NODE_ENV = 'production';

    delete require.cache[require.resolve('../config/whatsappConfig')];
    delete require.cache[require.resolve('../middleware/whatsappSignature')];
    const { verifyWhatsAppSignature: verify } = require('../middleware/whatsappSignature');

    const req = {
      rawBody: body,
      get() {
        return 'sha256=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
      },
    };
    const res = createMockRes();
    let nextCalled = false;
    await new Promise((resolve) => {
      verify(req, res, () => {
        nextCalled = true;
        resolve();
      });
      setTimeout(resolve, 50);
    });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);

    process.env.WHATSAPP_APP_SECRET = prevSecret;
    process.env.WHATSAPP_ACCESS_TOKEN = prevToken;
    process.env.WHATSAPP_PHONE_NUMBER_ID = prevPhone;
    process.env.NODE_ENV = prevNode;
    delete require.cache[require.resolve('../config/whatsappConfig')];
    delete require.cache[require.resolve('../middleware/whatsappSignature')];
  });

  await check('WhatsApp fails closed in production when configured without app secret', async () => {
    const prevSecret = process.env.WHATSAPP_APP_SECRET;
    const prevToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const prevPhone = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const prevNode = process.env.NODE_ENV;
    delete process.env.WHATSAPP_APP_SECRET;
    process.env.WHATSAPP_ACCESS_TOKEN = 'token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123';
    process.env.NODE_ENV = 'production';

    delete require.cache[require.resolve('../config/whatsappConfig')];
    delete require.cache[require.resolve('../middleware/whatsappSignature')];
    const { verifyWhatsAppSignature: verify } = require('../middleware/whatsappSignature');

    const res = createMockRes();
    let nextCalled = false;
    await new Promise((resolve) => {
      verify({ get() { return ''; }, rawBody: Buffer.from('{}') }, res, () => {
        nextCalled = true;
        resolve();
      });
      setTimeout(resolve, 50);
    });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 503);

    process.env.WHATSAPP_APP_SECRET = prevSecret;
    process.env.WHATSAPP_ACCESS_TOKEN = prevToken;
    process.env.WHATSAPP_PHONE_NUMBER_ID = prevPhone;
    process.env.NODE_ENV = prevNode;
    delete require.cache[require.resolve('../config/whatsappConfig')];
    delete require.cache[require.resolve('../middleware/whatsappSignature')];
  });

  await check('body limit and helmet are wired in index.js', () => {
    const src = fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8');
    assert.ok(src.includes("require('helmet')") || src.includes('require("helmet")'));
    assert.ok(src.includes("BODY_LIMIT = '100kb'") || src.includes('limit: BODY_LIMIT'));
    assert.ok(src.includes('100kb'));
    assert.ok(src.includes('rawBody'));
  });

  await check('auth routes use rate limiters', () => {
    const src = fs.readFileSync(path.join(__dirname, '../routes/route.js'), 'utf8');
    assert.ok(src.includes('authLoginRegisterLimiter'));
    assert.ok(src.includes('authRefreshLimiter'));
    assert.ok(src.includes('/api/reviews/admin'));
    assert.ok(src.includes('approveReview'));
  });

  await check('messageController no longer returns err.message', () => {
    const src = fs.readFileSync(path.join(__dirname, '../controllers/messageController.js'), 'utf8');
    assert.ok(!src.includes('error: err.message'));
  });

  await check('signed tokens use shortened default lifetime', () => {
    const token = signAuthToken({ _id: 'u1', role: 'user' });
    const decoded = jwt.decode(token);
    const lifetime = decoded.exp - decoded.iat;
    // 12h = 43200s (± a few seconds skew)
    assert.ok(lifetime >= 43100 && lifetime <= 43300, `lifetime=${lifetime}`);
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\nResults: ${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
