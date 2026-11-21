const crypto = require('crypto');

/** Crockford-like alphabet — no ambiguous 0/O/1/I. */
const BOOKING_SUFFIX_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const BOOKING_SUFFIX_LENGTH = 10;

function secureRandomSuffix(length = BOOKING_SUFFIX_LENGTH) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += BOOKING_SUFFIX_ALPHABET[bytes[i] % BOOKING_SUFFIX_ALPHABET.length];
  }
  return out;
}

/**
 * Format: NXT-YYYYMMDD-<10 crypto-secure chars>
 * Existing stored booking numbers are unchanged and remain valid.
 */
const generateBookingNumber = () => {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  return `NXT-${datePart}-${secureRandomSuffix()}`;
};

module.exports = { generateBookingNumber, BOOKING_SUFFIX_LENGTH };
