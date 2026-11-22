import { readToken } from './authSession';

export const CHECKOUT_TOKEN_KEY_PREFIX = 'nextify_checkout_token_';
export const PENDING_BOOKING_STORAGE_KEY = 'nextify_pending_booking';
export const CHECKOUT_TOKEN_MISSING_MESSAGE =
  'Your checkout session has expired or is unavailable. Please start a new booking or track your booking.';

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
const memoryTokens = new Map();

export function isValidBookingId(bookingId) {
  return OBJECT_ID_RE.test(String(bookingId || '').trim());
}

export function normalizeCheckoutToken(token) {
  if (typeof token !== 'string') return '';
  const trimmed = token.trim();
  if (trimmed.length < 16 || trimmed.length > 256) return '';
  if (/\s/.test(trimmed)) return '';
  return trimmed;
}

export function getCheckoutTokenStorageKey(bookingId) {
  const id = String(bookingId || '').trim();
  if (!isValidBookingId(id)) return '';
  return `${CHECKOUT_TOKEN_KEY_PREFIX}${id}`;
}

export function saveCheckoutToken(bookingId, token) {
  const id = String(bookingId || '').trim();
  const normalized = normalizeCheckoutToken(token);
  const key = getCheckoutTokenStorageKey(id);
  if (!key || !normalized) return false;

  memoryTokens.set(id, normalized);
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, normalized);
    }
  } catch {
    // Keep in-memory fallback if sessionStorage is unavailable or full.
  }
  return true;
}

export function readCheckoutToken(bookingId) {
  const id = String(bookingId || '').trim();
  const key = getCheckoutTokenStorageKey(id);
  if (!key) return '';

  try {
    if (typeof sessionStorage !== 'undefined') {
      const stored = normalizeCheckoutToken(sessionStorage.getItem(key));
      if (stored) {
        memoryTokens.set(id, stored);
        return stored;
      }
    }
  } catch {
    // Fall back to in-memory map below.
  }

  return normalizeCheckoutToken(memoryTokens.get(id) || '');
}

export function resolveCheckoutToken({ bookingId, stateToken, stateBookingId } = {}) {
  const id = String(bookingId || '').trim();
  if (!isValidBookingId(id)) return '';

  const normalizedStateToken = normalizeCheckoutToken(stateToken);
  const matchesStateBooking =
    !stateBookingId || String(stateBookingId).trim() === id;

  if (normalizedStateToken && matchesStateBooking) {
    saveCheckoutToken(id, normalizedStateToken);
    return normalizedStateToken;
  }

  return readCheckoutToken(id);
}

/**
 * Reads `#ct=<rawToken>` from the URL fragment (e.g. WhatsApp payment links),
 * immediately strips the fragment via history.replaceState, validates the
 * bookingId and token, and stores valid tokens in booking-scoped sessionStorage.
 */
export function consumeCheckoutTokenFromHash(
  bookingId,
  locationObj = typeof window !== 'undefined' ? window.location : null,
  historyObj = typeof window !== 'undefined' ? window.history : null,
) {
  const rawHash = String(locationObj?.hash || '');
  if (!rawHash || rawHash === '#') return '';

  const fragment = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
  let params;
  try {
    params = new URLSearchParams(fragment);
  } catch {
    return '';
  }

  if (!params.has('ct')) return '';

  const rawToken = params.get('ct') || '';

  if (historyObj && typeof historyObj.replaceState === 'function') {
    const cleanUrl = `${locationObj?.pathname || ''}${locationObj?.search || ''}`;
    try {
      historyObj.replaceState(historyObj.state ?? null, '', cleanUrl || '/');
    } catch {
      // Ignore SecurityError in restricted environments.
    }
  }

  const id = String(bookingId || '').trim();
  const normalized = normalizeCheckoutToken(rawToken);
  if (!isValidBookingId(id) || !normalized) {
    return '';
  }

  saveCheckoutToken(id, normalized);
  return normalized;
}

export function clearPendingBookingIfMatches(bookingId) {
  const id = String(bookingId || '').trim();
  try {
    if (typeof sessionStorage === 'undefined') return false;
    const raw = sessionStorage.getItem(PENDING_BOOKING_STORAGE_KEY);
    if (!raw) return false;
    if (!id) {
      sessionStorage.removeItem(PENDING_BOOKING_STORAGE_KEY);
      return true;
    }
    const parsed = JSON.parse(raw);
    if (parsed && String(parsed._id || '').trim() === id) {
      sessionStorage.removeItem(PENDING_BOOKING_STORAGE_KEY);
      return true;
    }
  } catch {
    // Ignore storage or JSON errors.
  }
  return false;
}

export function clearCheckoutToken(bookingId) {
  const id = String(bookingId || '').trim();
  const key = getCheckoutTokenStorageKey(id);
  if (!key) return false;

  memoryTokens.delete(id);
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors.
  }
  clearPendingBookingIfMatches(id);
  return true;
}

export function hasAuthSession() {
  return Boolean(readToken());
}

export function resetMemoryCheckoutTokensForTest() {
  memoryTokens.clear();
}
