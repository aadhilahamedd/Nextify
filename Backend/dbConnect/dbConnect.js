const path = require('path');
const mongoose = require('mongoose');

// Load Backend/.env before reading Mongo URI (cwd-independent).
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { ensureOpenCheckoutAttemptIndex } = require('../services/paymentIndexReadiness');

async function runSeed() {
  try {
    const { seedDefaults } = require('../services/seedService');
    await Promise.race([
      seedDefaults(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('seed-timeout')), 12000)),
    ]);
  } catch (err) {
    console.error('Seed skipped:', err.message);
  }
}

function resolveMongoUri() {
  // Prefer MONGODB_URI; fall back to MONGO_URI or legacy connectionString.
  return String(
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.connectionString ||
    ''
  ).trim();
}

/**
 * Connect to MongoDB, run non-fatal seed, then confirm payment open-checkout index.
 * Rejects (caller should exit) if connection or index readiness fails.
 */
async function connectAndPrepareDatabase() {
  const uri = resolveMongoUri();
  if (!uri) {
    const err = new Error('MONGODB_URI (or MONGO_URI / legacy connectionString) not found in environment');
    err.code = 'MONGO_URI_MISSING';
    throw err;
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 20000,
      maxPoolSize: 10,
    });
  }
  console.log(`✅ Successfully connected to MongoDB (db: ${mongoose.connection.name || 'unknown'})`);

  await runSeed();

  // Explicit readiness — do not rely solely on Mongoose autoIndex timing.
  const indexResult = await ensureOpenCheckoutAttemptIndex();
  console.log(
    indexResult.created
      ? `[payments] Created and verified index ${indexResult.name}`
      : `[payments] Verified existing index ${indexResult.name}`
  );

  return { mongoose, indexResult };
}

module.exports = {
  connectAndPrepareDatabase,
  resolveMongoUri,
};
