/**
 * TEMPORARY STAGING-ONLY ADMIN SETUP ENDPOINT.
 * Remove this file, its route in Backend/routes/route.js, its limiter in
 * Backend/middleware/rateLimiters.js, and the Render staging env vars
 * (STAGING_ADMIN_SETUP_ENABLED, STAGING_ADMIN_SETUP_TOKEN) immediately after use.
 */
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/User');
const { success, error } = require('../utils/apiResponse');

const ALLOWED_DB = 'Nextify_Staging';
const ALLOWED_EMAIL = 'sales@nextifylimo.com';
const DEFAULT_USERNAME = 'Nextify Staging Admin';
const SETUP_TOKEN_HEADER = 'x-staging-setup-token';
const PLACEHOLDER_PASSWORDS = new Set([
  'change_me_in_production',
  'nextify123',
  'password',
  'admin',
]);

let setupCompleted = false;
let setupInProgress = false;

function tokensMatch(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length === 0 || b.length === 0) return false;
  if (a.length !== b.length) {
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

exports.setupStagingAdmin = async (req, res) => {
  let lockAcquired = false;
  try {
    if (setupCompleted || setupInProgress) {
      return error(res, 409, 'Staging admin setup is unavailable or already completed for this process');
    }

    const enabled = process.env.STAGING_ADMIN_SETUP_ENABLED === 'true';
    const configuredToken = String(process.env.STAGING_ADMIN_SETUP_TOKEN || '');
    const expectedDb = String(process.env.EXPECTED_DB || '').trim();
    const isConnected = mongoose.connection?.readyState === 1;
    const connectedDb = String(mongoose.connection?.name || '').trim();

    if (
      !enabled
      || !configuredToken
      || expectedDb !== ALLOWED_DB
      || !isConnected
      || connectedDb !== ALLOWED_DB
    ) {
      return error(res, 403, 'Staging admin setup is not available');
    }

    const providedToken = typeof req.get === 'function'
      ? String(req.get(SETUP_TOKEN_HEADER) || '')
      : String(req.headers?.[SETUP_TOKEN_HEADER] || '');

    if (!tokensMatch(providedToken, configuredToken)) {
      return error(res, 403, 'Invalid staging setup token');
    }

    const normalizedEmail = typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';
    if (normalizedEmail !== ALLOWED_EMAIL) {
      return error(res, 400, 'Requested email is not permitted for staging setup');
    }

    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (password.length < 12 || PLACEHOLDER_PASSWORDS.has(password.toLowerCase())) {
      return error(res, 400, 'Password must be at least 12 characters and not a placeholder');
    }

    const username = typeof req.body?.username === 'string' && req.body.username.trim()
      ? req.body.username.trim()
      : DEFAULT_USERNAME;

    // Acquire synchronous in-process lock before the first await so concurrent requests cannot race.
    if (setupCompleted || setupInProgress) {
      return error(res, 409, 'Staging admin setup is unavailable or already completed for this process');
    }
    setupInProgress = true;
    lockAcquired = true;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const existing = await User.findOne({ email: ALLOWED_EMAIL });
    if (existing) {
      existing.username = username;
      existing.password = hashedPassword;
      existing.role = 'admin';
      await existing.save();
      setupCompleted = true;
      console.log('[staging-admin-setup] Updated staging admin account.');
      return success(res, 200, 'Staging admin updated', {
        provisioned: true,
        email: ALLOWED_EMAIL,
        role: 'admin',
      });
    }

    await new User({
      username,
      email: ALLOWED_EMAIL,
      password: hashedPassword,
      role: 'admin',
    }).save();

    setupCompleted = true;
    console.log('[staging-admin-setup] Created staging admin account.');
    return success(res, 201, 'Staging admin created', {
      provisioned: true,
      email: ALLOWED_EMAIL,
      role: 'admin',
    });
  } catch (err) {
    console.error('[staging-admin-setup] failed:', err?.name || 'Error');
    return error(res, 500, 'Staging admin setup failed');
  } finally {
    if (lockAcquired) {
      setupInProgress = false;
    }
  }
};

exports.SETUP_TOKEN_HEADER = SETUP_TOKEN_HEADER;
exports._test = {
  resetSetupCompleted() {
    setupCompleted = false;
    setupInProgress = false;
  },
  tokensMatch,
};
