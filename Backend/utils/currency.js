const SAR_PER_USD = 3.75;

function sarToUsd(sar) {
  const n = Number(sar);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round((n / SAR_PER_USD) * 100) / 100;
}

/**
 * Validates an optional manual USD override.
 * - Empty / null / undefined => { valid: true, value: null } (automatic SAR / 3.75 conversion).
 * - Positive finite number (optionally prefixed with $) => { valid: true, value: rounded2dp }.
 * - Text, negative, zero, or NaN => { valid: false, message }.
 */
function parseOptionalPositiveUsd(raw) {
  if (raw === undefined || raw === null) {
    return { valid: true, value: null };
  }
  const str = String(raw).trim();
  if (str === '') {
    return { valid: true, value: null };
  }
  const cleaned = str.replace(/^\$\s*/, '').replace(/,/g, '');
  if (!/^\d+(?:\.\d+)?$/.test(cleaned)) {
    return { valid: false, message: 'USD price must be a valid positive number.' };
  }
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num <= 0) {
    return { valid: false, message: 'USD price must be a valid positive number.' };
  }
  return { valid: true, value: Math.round(num * 100) / 100 };
}

module.exports = {
  SAR_PER_USD,
  sarToUsd,
  parseOptionalPositiveUsd,
};
