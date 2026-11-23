const MIN_PHONE_DIGITS = 9;

/** Strip spaces, punctuation, and all non-digit characters. */
function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

/**
 * Controlled Saudi mobile canonical form: 9665XXXXXXXX.
 * Supports 05XXXXXXXX, 5XXXXXXXX, 9665XXXXXXXX, +9665..., and 96605...
 * Unrecognized shapes keep digits as-is (exact compare only; no suffix matching).
 */
function canonicalizePhone(digits) {
  if (!digits || digits.length < MIN_PHONE_DIGITS) return null;
  if (/^9665\d{8}$/.test(digits)) return digits;
  if (/^96605\d{8}$/.test(digits)) return `966${digits.slice(4)}`;
  if (/^05\d{8}$/.test(digits)) return `966${digits.slice(1)}`;
  if (/^5\d{8}$/.test(digits)) return `966${digits}`;
  return digits;
}

function phonesMatch(storedRaw, providedRaw) {
  const storedDigits = normalizePhone(storedRaw);
  const providedDigits = normalizePhone(providedRaw);
  if (storedDigits.length < MIN_PHONE_DIGITS) return false;
  if (providedDigits.length < MIN_PHONE_DIGITS) return false;

  const stored = canonicalizePhone(storedDigits);
  const provided = canonicalizePhone(providedDigits);
  if (!stored || !provided) return false;
  return stored === provided;
}

module.exports = {
  MIN_PHONE_DIGITS,
  normalizePhone,
  canonicalizePhone,
  phonesMatch,
};
