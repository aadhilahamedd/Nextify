/**
 * Secure one-shot admin provisioning (ops only).
 *
 * Usage:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_USERNAME="Nextify Admin" node scripts/provisionAdmin.js
 *
 * Requires ADMIN_EMAIL and ADMIN_PASSWORD in the environment (or Backend/.env).
 * Does not create admins from hardcoded defaults.
 * Never prints passwords or Mongo URIs.
 * Does not modify database records unless credentials are explicitly supplied.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const User = require('../models/User');

const PLACEHOLDER_PASSWORDS = new Set([
  'change_me_in_production',
  'nextify123',
  'password',
  'admin',
]);

function resolveMongoUri() {
  return (
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.connectionString ||
    ''
  ).trim();
}

function readAdminConfig() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  const username = String(process.env.ADMIN_USERNAME || 'Nextify Admin').trim() || 'Nextify Admin';

  if (!email || !email.includes('@')) {
    throw new Error('ADMIN_EMAIL is required and must be a valid email.');
  }
  if (!password || password.length < 12) {
    throw new Error('ADMIN_PASSWORD is required and must be at least 12 characters.');
  }
  if (PLACEHOLDER_PASSWORDS.has(password)) {
    throw new Error('ADMIN_PASSWORD must not be a known placeholder or default value.');
  }

  return { email, password, username };
}

async function main() {
  const uri = resolveMongoUri();
  if (!uri) {
    console.error('[provision-admin] MongoDB URI is not configured.');
    process.exit(1);
  }

  let config;
  try {
    config = readAdminConfig();
  } catch (err) {
    console.error('[provision-admin]', err.message);
    process.exit(1);
  }

  await mongoose.connect(uri);

  try {
    const existing = await User.findOne({ email: config.email });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(config.password, salt);

    if (existing) {
      existing.username = config.username;
      existing.password = hashedPassword;
      existing.role = 'admin';
      await existing.save();
      console.log('[provision-admin] Updated existing user to admin role.');
      console.log('[provision-admin] email=', config.email);
      return;
    }

    await new User({
      username: config.username,
      email: config.email,
      password: hashedPassword,
      role: 'admin',
    }).save();

    console.log('[provision-admin] Created admin user.');
    console.log('[provision-admin] email=', config.email);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main().catch((err) => {
  console.error('[provision-admin] failed:', err.message);
  process.exit(1);
});
