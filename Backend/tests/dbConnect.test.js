/**
 * Focused tests for Backend/dbConnect/dbConnect.js URI resolution and safe DB-name logging.
 * Run: node Backend/tests/dbConnect.test.js
 */
const assert = require('assert');
const mongoose = require('mongoose');
const { resolveMongoUri } = require('../dbConnect/dbConnect');

const results = [];

async function check(name, fn) {
  const orig = {
    MONGODB_URI: process.env.MONGODB_URI,
    MONGO_URI: process.env.MONGO_URI,
    connectionString: process.env.connectionString,
  };
  try {
    delete process.env.MONGODB_URI;
    delete process.env.MONGO_URI;
    delete process.env.connectionString;
    await fn();
    results.push({ name, ok: true });
    console.log(`ok ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.log(`fail ${name} — ${err.message}`);
  } finally {
    for (const [k, v] of Object.entries(orig)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

async function run() {
  await check('1. MONGODB_URI takes precedence over MONGO_URI and connectionString and is trimmed', () => {
    process.env.MONGODB_URI = '  mongodb+srv://user:pass@cluster.example/Nextify_Staging  ';
    process.env.MONGO_URI = 'mongodb+srv://user:pass@cluster.example/Other_DB';
    process.env.connectionString = 'mongodb+srv://user:pass@cluster.example/Legacy_DB';
    assert.strictEqual(resolveMongoUri(), 'mongodb+srv://user:pass@cluster.example/Nextify_Staging');
  });

  await check('2. MONGO_URI is used when MONGODB_URI is unset and takes precedence over connectionString', () => {
    process.env.MONGO_URI = '\n mongodb+srv://user:pass@cluster.example/Nextify_Staging \t';
    process.env.connectionString = 'mongodb+srv://user:pass@cluster.example/Legacy_DB';
    assert.strictEqual(resolveMongoUri(), 'mongodb+srv://user:pass@cluster.example/Nextify_Staging');
  });

  await check('3. connectionString is used when MONGODB_URI and MONGO_URI are unset', () => {
    process.env.connectionString = ' mongodb+srv://user:pass@cluster.example/Legacy_DB ';
    assert.strictEqual(resolveMongoUri(), 'mongodb+srv://user:pass@cluster.example/Legacy_DB');
  });

  await check('4. returns empty string when no Mongo URI env vars are set', () => {
    assert.strictEqual(resolveMongoUri(), '');
  });

  await check('5. connectAndPrepareDatabase logs only mongoose.connection.name and never the URI', async () => {
    const dbConnectPath = require.resolve('../dbConnect/dbConnect');
    const readiness = require('../services/paymentIndexReadiness');
    const seedService = require('../services/seedService');
    const origConnect = mongoose.connect;
    const origEnsure = readiness.ensureOpenCheckoutAttemptIndex;
    const origSeed = seedService.seedDefaults;
    const origLog = console.log;
    const origReadyState = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
    const origName = Object.getOwnPropertyDescriptor(mongoose.connection, 'name');

    const logs = [];
    try {
      process.env.MONGO_URI = ' mongodb+srv://secret_user:secret_pass@cluster.example/Nextify_Staging ';
      Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });
      Object.defineProperty(mongoose.connection, 'name', { value: 'Nextify_Staging', configurable: true });
      mongoose.connect = async (uri) => {
        assert.strictEqual(uri, 'mongodb+srv://secret_user:secret_pass@cluster.example/Nextify_Staging');
        Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
      };
      seedService.seedDefaults = async () => {};
      readiness.ensureOpenCheckoutAttemptIndex = async () => ({ created: false, name: 'open_idx' });
      delete require.cache[dbConnectPath];
      const freshDbConnect = require('../dbConnect/dbConnect');
      console.log = (...args) => logs.push(args.join(' '));

      await freshDbConnect.connectAndPrepareDatabase();

      const output = logs.join('\n');
      assert.ok(output.includes('Nextify_Staging'), 'startup log must include database name');
      assert.ok(!output.includes('secret_user'), 'startup log must never include credentials');
      assert.ok(!output.includes('secret_pass'), 'startup log must never include password');
      assert.ok(!output.includes('mongodb+srv://'), 'startup log must never include URI');
    } finally {
      mongoose.connect = origConnect;
      readiness.ensureOpenCheckoutAttemptIndex = origEnsure;
      seedService.seedDefaults = origSeed;
      delete require.cache[dbConnectPath];
      console.log = origLog;
      if (origReadyState) Object.defineProperty(mongoose.connection, 'readyState', origReadyState);
      else delete mongoose.connection.readyState;
      if (origName) Object.defineProperty(mongoose.connection, 'name', origName);
      else delete mongoose.connection.name;
    }
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\nResults: ${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
