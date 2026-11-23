const crypto = require('crypto');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { phonesMatch } = require('./phoneMatch');

const DEFAULT_CHECKOUT_TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MIN_CHECKOUT_TOKEN_TTL_MS = 60 * 1000; // 1 minute
const MAX_CHECKOUT_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SHA256_HEX_RE = /^[a-f0-9]{64}$/i;
const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

const CHECKOUT_UNAUTHORIZED_MESSAGE = 'Invalid or expired checkout session';

function getCheckoutTokenTtlMs() {
  const raw = process.env.CHECKOUT_TOKEN_TTL_MS;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return DEFAULT_CHECKOUT_TOKEN_TTL_MS;
  }
  const parsed = Number(raw);
  if (
    !Number.isFinite(parsed)
    || parsed < MIN_CHECKOUT_TOKEN_TTL_MS
    || parsed > MAX_CHECKOUT_TOKEN_TTL_MS
  ) {
    return DEFAULT_CHECKOUT_TOKEN_TTL_MS;
  }
  return Math.floor(parsed);
}

function hashCheckoutToken(rawToken) {
  if (typeof rawToken !== 'string') return '';
  const trimmed = rawToken.trim();
  if (trimmed.length < 16 || trimmed.length > 256) return '';
  return crypto.createHash('sha256').update(trimmed).digest('hex');
}

function generateCheckoutToken({ now = Date.now(), ttlMs } = {}) {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashCheckoutToken(rawToken);
  const resolvedTtl =
    typeof ttlMs === 'number' && Number.isFinite(ttlMs) && ttlMs > 0
      ? Math.floor(ttlMs)
      : getCheckoutTokenTtlMs();
  const expiresAt = new Date(now + resolvedTtl);
  return { rawToken, tokenHash, expiresAt };
}

function verifyCheckoutToken(rawToken, storedHash, expiresAt, { now = Date.now() } = {}) {
  if (typeof rawToken !== 'string' || typeof storedHash !== 'string') return false;
  if (!SHA256_HEX_RE.test(storedHash)) return false;

  const expiryMs = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  if (!expiresAt || !Number.isFinite(expiryMs) || expiryMs <= now) {
    return false;
  }

  const candidateHash = hashCheckoutToken(rawToken);
  if (!SHA256_HEX_RE.test(candidateHash)) return false;

  try {
    const a = Buffer.from(candidateHash, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== 32 || b.length !== 32) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function extractCheckoutToken(req) {
  const header = req?.headers?.['x-checkout-token'] ?? req?.headers?.['X-Checkout-Token'];
  if (typeof header !== 'string') return '';
  return header.trim();
}

function isValidObjectIdString(value) {
  return typeof value === 'string' && OBJECT_ID_RE.test(value);
}

async function isDatabaseVerifiedAdmin(req) {
  if (!req?.user || req.user.role !== 'admin' || !req.user.userId) {
    return false;
  }
  try {
    const user = await User.findById(req.user.userId).select('role').lean();
    return Boolean(user && user.role === 'admin');
  } catch (err) {
    if (err?.name === 'CastError') return false;
    const failure = new Error('Unable to verify checkout authorization.');
    failure.statusCode = 500;
    throw failure;
  }
}

async function authorizeBookingCheckout(req, booking, { now = Date.now() } = {}) {
  if (!booking) {
    return {
      authorized: false,
      statusCode: 403,
      message: CHECKOUT_UNAUTHORIZED_MESSAGE,
    };
  }

  // 1. Guest checkout token proof
  const providedToken = extractCheckoutToken(req);
  if (
    providedToken
    && verifyCheckoutToken(providedToken, booking.checkoutTokenHash, booking.checkoutTokenExpiresAt, { now })
  ) {
    return { authorized: true, via: 'checkout_token' };
  }

  // 2. Authenticated owner of this booking
  if (req?.user?.userId && booking.user && String(booking.user) === String(req.user.userId)) {
    return { authorized: true, via: 'owner' };
  }

  // 3. Database-verified admin
  try {
    if (await isDatabaseVerifiedAdmin(req)) {
      return { authorized: true, via: 'admin' };
    }
  } catch (err) {
    return {
      authorized: false,
      statusCode: err.statusCode || 500,
      message: 'Unable to verify checkout authorization.',
    };
  }

  return {
    authorized: false,
    statusCode: 403,
    message: CHECKOUT_UNAUTHORIZED_MESSAGE,
  };
}

function buildCheckoutPaymentUrl(baseUrl, bookingId, rawToken) {
  const id = String(bookingId || '').trim();
  const token = typeof rawToken === 'string' ? rawToken.trim() : '';
  if (!isValidObjectIdString(id)) {
    throw new Error('Invalid booking id for checkout URL');
  }
  if (token.length < 16 || token.length > 256 || /\s/.test(token)) {
    throw new Error('Invalid checkout token for checkout URL');
  }
  const cleanBase = String(baseUrl || '').trim().replace(/\/+$/, '');
  return `${cleanBase}/payment?bookingId=${encodeURIComponent(id)}#ct=${encodeURIComponent(token)}`;
}

/**
 * Internal-only atomic checkout token rotation for a verified booking owner (e.g. WhatsApp).
 * Never expose this on a public HTTP route.
 */
async function rotateBookingCheckoutToken(bookingId, { verifiedPhone, now = Date.now(), ttlMs } = {}) {
  const id = String(bookingId || '').trim();
  if (!isValidObjectIdString(id)) {
    return { ok: false, reason: 'not_found' };
  }

  const booking = await Booking.findById(id)
    .select('_id bookingNumber customer paymentStatus bookingStatus customQuoteRequired pricing')
    .lean();

  if (!booking) {
    return { ok: false, reason: 'not_found' };
  }

  const registeredMobile = booking.customer?.mobile || '';
  if (!phonesMatch(registeredMobile, verifiedPhone)) {
    return { ok: false, reason: 'phone_mismatch' };
  }

  const paymentStatus = String(booking.paymentStatus || '').toUpperCase();
  const bookingStatus = String(booking.bookingStatus || '').toUpperCase();
  const quoteStatus = booking.pricing?.breakdown?.quoteStatus;

  if (paymentStatus === 'PAID') {
    return { ok: false, reason: 'already_paid', booking };
  }
  if (paymentStatus === 'REFUNDED') {
    return { ok: false, reason: 'ineligible', booking };
  }
  if (
    booking.customQuoteRequired
    || paymentStatus === 'NOT_REQUIRED'
    || quoteStatus === 'rate_on_request'
    || quoteStatus === 'long_distance'
  ) {
    return { ok: false, reason: 'not_payable', booking };
  }
  if (bookingStatus === 'CANCELLED' && paymentStatus !== 'FAILED') {
    return { ok: false, reason: 'cancelled', booking };
  }

  const issued = generateCheckoutToken({ now, ttlMs });

  const updated = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      'customer.mobile': registeredMobile,
      customQuoteRequired: { $ne: true },
      paymentStatus: { $nin: ['PAID', 'paid', 'REFUNDED', 'refunded', 'NOT_REQUIRED', 'not_required'] },
      'pricing.breakdown.quoteStatus': { $nin: ['rate_on_request', 'long_distance'] },
      $or: [
        { bookingStatus: { $nin: ['CANCELLED', 'cancelled'] } },
        { paymentStatus: { $in: ['FAILED', 'failed'] } },
      ],
    },
    {
      $set: {
        checkoutTokenHash: issued.tokenHash,
        checkoutTokenExpiresAt: issued.expiresAt,
      },
    },
    { new: true }
  );

  if (!updated) {
    const fresh = await Booking.findById(booking._id)
      .select('_id bookingNumber paymentStatus bookingStatus customQuoteRequired')
      .lean();
    const freshPaymentStatus = String(fresh?.paymentStatus || '').toUpperCase();
    return {
      ok: false,
      reason: freshPaymentStatus === 'PAID' ? 'already_paid' : 'ineligible',
      booking: fresh || booking,
    };
  }

  return {
    ok: true,
    booking: updated,
    checkoutToken: issued.rawToken,
    expiresAt: issued.expiresAt,
  };
}

module.exports = {
  DEFAULT_CHECKOUT_TOKEN_TTL_MS,
  CHECKOUT_UNAUTHORIZED_MESSAGE,
  getCheckoutTokenTtlMs,
  hashCheckoutToken,
  generateCheckoutToken,
  verifyCheckoutToken,
  extractCheckoutToken,
  isValidObjectIdString,
  isDatabaseVerifiedAdmin,
  authorizeBookingCheckout,
  buildCheckoutPaymentUrl,
  rotateBookingCheckoutToken,
};
