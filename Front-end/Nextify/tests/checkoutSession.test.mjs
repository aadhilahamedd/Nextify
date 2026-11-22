import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock Vite-specific serverURL.js (uses import.meta.env) so production modules load cleanly in Node.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier.endsWith('/Services/serverURL')
      || specifier.endsWith('/Services/serverURL.js')
      || specifier === './serverURL'
    ) {
      return {
        shortCircuit: true,
        url: 'mock://serverURL',
      };
    }
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.js`, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === 'mock://serverURL') {
      return {
        shortCircuit: true,
        format: 'module',
        source: "export default 'http://localhost:5000';",
      };
    }
    return nextLoad(url, context);
  },
});

function createStorageMock() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    keys() {
      return Array.from(store.keys());
    },
  };
}

globalThis.localStorage = createStorageMock();
globalThis.sessionStorage = createStorageMock();
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};
globalThis.window = {
  dispatchEvent() {
    return true;
  },
};

const axiosModule = await import('axios');
const axios = axiosModule.default;
const checkoutSession = await import('../src/utils/checkoutSession.js');
const allAPI = await import('../src/Services/allAPI.js');

const {
  CHECKOUT_TOKEN_KEY_PREFIX,
  PENDING_BOOKING_STORAGE_KEY,
  clearCheckoutToken,
  consumeCheckoutTokenFromHash,
  getCheckoutTokenStorageKey,
  hasAuthSession,
  normalizeCheckoutToken,
  readCheckoutToken,
  resetMemoryCheckoutTokensForTest,
  resolveCheckoutToken,
  saveCheckoutToken,
} = checkoutSession;

const { createPaymentAPI, getPublicPayBookingAPI } = allAPI;

const ID_A = '507f191e810c19729de860a1';
const ID_B = '507f191e810c19729de860b2';
const TOKEN_A = 'tok_booking_a_secret_value_1234567890abcdef';
const TOKEN_B = 'tok_booking_b_secret_value_0987654321fedcba';

describe('checkoutSession storage isolation & lifecycle', () => {
  const origSessionStorage = globalThis.sessionStorage;

  beforeEach(() => {
    globalThis.sessionStorage = origSessionStorage;
    localStorage.clear();
    sessionStorage.clear();
    resetMemoryCheckoutTokensForTest();
  });

  afterEach(() => {
    globalThis.sessionStorage = origSessionStorage;
  });

  it('stores tokens in sessionStorage under booking-scoped keys and never touches localStorage', () => {
    assert.equal(saveCheckoutToken(ID_A, TOKEN_A), true);
    assert.equal(sessionStorage.getItem(`${CHECKOUT_TOKEN_KEY_PREFIX}${ID_A}`), TOKEN_A);
    assert.deepEqual(localStorage.keys(), []);
    assert.equal(readCheckoutToken(ID_A), TOKEN_A);
  });

  it('prevents Booking A token from being read or resolved for Booking B', () => {
    saveCheckoutToken(ID_A, TOKEN_A);

    assert.equal(readCheckoutToken(ID_B), '');
    assert.equal(
      resolveCheckoutToken({ bookingId: ID_B, stateToken: TOKEN_A, stateBookingId: ID_A }),
      '',
    );

    saveCheckoutToken(ID_B, TOKEN_B);
    assert.equal(readCheckoutToken(ID_A), TOKEN_A);
    assert.equal(readCheckoutToken(ID_B), TOKEN_B);
  });

  it('resolves token from navigation state first, persists it for retries, and falls back to sessionStorage', () => {
    const resolvedFromState = resolveCheckoutToken({
      bookingId: ID_A,
      stateToken: TOKEN_A,
      stateBookingId: ID_A,
    });
    assert.equal(resolvedFromState, TOKEN_A);
    assert.equal(sessionStorage.getItem(getCheckoutTokenStorageKey(ID_A)), TOKEN_A);

    // Retry navigation without router state still resolves from sessionStorage
    const resolvedForRetry = resolveCheckoutToken({ bookingId: ID_A });
    assert.equal(resolvedForRetry, TOKEN_A);
  });

  it('clears only the paid booking token and matching pending booking without affecting unrelated bookings', () => {
    saveCheckoutToken(ID_A, TOKEN_A);
    saveCheckoutToken(ID_B, TOKEN_B);
    sessionStorage.setItem(PENDING_BOOKING_STORAGE_KEY, JSON.stringify({ _id: ID_B, bookingNumber: 'NX-B' }));

    assert.equal(clearCheckoutToken(ID_A), true);
    assert.equal(readCheckoutToken(ID_A), '');
    assert.equal(readCheckoutToken(ID_B), TOKEN_B);
    // Pending booking belonged to ID_B, so it must stay intact
    assert.ok(sessionStorage.getItem(PENDING_BOOKING_STORAGE_KEY));

    // Now clear ID_B — both ID_B token and matching pending booking should be cleared
    assert.equal(clearCheckoutToken(ID_B), true);
    assert.equal(readCheckoutToken(ID_B), '');
    assert.equal(sessionStorage.getItem(PENDING_BOOKING_STORAGE_KEY), null);
  });

  it('rejects invalid booking IDs and malformed tokens', () => {
    assert.equal(saveCheckoutToken('not-an-object-id', TOKEN_A), false);
    assert.equal(saveCheckoutToken(ID_A, 'short'), false);
    assert.equal(saveCheckoutToken(ID_A, 'has spaces in token value 12345'), false);
    assert.equal(normalizeCheckoutToken(''), '');
    assert.equal(normalizeCheckoutToken(null), '');
    assert.equal(readCheckoutToken('not-an-object-id'), '');
  });

  it('falls back to in-memory map if sessionStorage throws and clears cleanly', () => {
    globalThis.sessionStorage = {
      getItem() { throw new Error('SecurityError'); },
      setItem() { throw new Error('QuotaExceededError'); },
      removeItem() { throw new Error('SecurityError'); },
    };

    assert.equal(saveCheckoutToken(ID_A, TOKEN_A), true);
    assert.equal(readCheckoutToken(ID_A), TOKEN_A);
    assert.equal(clearCheckoutToken(ID_A), true);
    assert.equal(readCheckoutToken(ID_A), '');
  });

  it('detects logged-in auth session compatibility without exposing token', () => {
    assert.equal(hasAuthSession(), false);
    localStorage.setItem('token', 'header.payload.sig');
    assert.equal(hasAuthSession(), true);
  });

  it('consumes valid #ct= fragment token, stores under bookingId in sessionStorage, and strips fragment via replaceState', () => {
    const replaced = [];
    const mockLocation = {
      pathname: '/payment',
      search: `?bookingId=${ID_A}`,
      hash: `#ct=${TOKEN_A}`,
    };
    const mockHistory = {
      state: { idx: 1 },
      replaceState(state, title, url) {
        replaced.push({ state, title, url });
        mockLocation.hash = '';
      },
    };

    const consumed = consumeCheckoutTokenFromHash(ID_A, mockLocation, mockHistory);
    assert.equal(consumed, TOKEN_A);
    assert.equal(readCheckoutToken(ID_A), TOKEN_A);
    assert.equal(readCheckoutToken(ID_B), '');
    assert.deepEqual(localStorage.keys(), []);
    assert.equal(replaced.length, 1);
    assert.equal(replaced[0].url, `/payment?bookingId=${ID_A}`);
    assert.ok(!replaced[0].url.includes(TOKEN_A), 'stripped URL must not contain token');
    assert.equal(mockLocation.hash, '');
  });

  it('rejects malformed fragment token and invalid bookingId while still stripping #ct= fragment', () => {
    const replacedBadToken = [];
    const locBadToken = { pathname: '/payment', search: `?bookingId=${ID_A}`, hash: '#ct=short' };
    const histBadToken = {
      state: null,
      replaceState(_s, _t, url) {
        replacedBadToken.push(url);
        locBadToken.hash = '';
      },
    };
    assert.equal(consumeCheckoutTokenFromHash(ID_A, locBadToken, histBadToken), '');
    assert.equal(readCheckoutToken(ID_A), '');
    assert.equal(replacedBadToken.length, 1);
    assert.equal(replacedBadToken[0], `/payment?bookingId=${ID_A}`);

    const replacedBadId = [];
    const locBadId = { pathname: '/payment', search: '?bookingId=invalid', hash: `#ct=${TOKEN_A}` };
    const histBadId = {
      state: null,
      replaceState(_s, _t, url) {
        replacedBadId.push(url);
        locBadId.hash = '';
      },
    };
    assert.equal(consumeCheckoutTokenFromHash('invalid', locBadId, histBadId), '');
    assert.equal(readCheckoutToken(ID_A), '');
    assert.equal(replacedBadId.length, 1);
    assert.equal(replacedBadId[0], '/payment?bookingId=invalid');

    // L3 regression: missing bookingId with #ct= fragment must still strip fragment and never store token
    const replacedMissingId = [];
    const locMissingId = { pathname: '/payment', search: '', hash: `#ct=${TOKEN_A}` };
    const histMissingId = {
      state: null,
      replaceState(_s, _t, url) {
        replacedMissingId.push(url);
        locMissingId.hash = '';
      },
    };
    assert.equal(consumeCheckoutTokenFromHash('', locMissingId, histMissingId), '');
    assert.equal(sessionStorage.keys().length, 0);
    assert.equal(localStorage.keys().length, 0);
    assert.equal(replacedMissingId.length, 1);
    assert.equal(replacedMissingId[0], '/payment');
    assert.equal(locMissingId.hash, '');
  });
});

describe('allAPI checkout token header transport', () => {
  const origAdapter = axios.defaults.adapter;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    axios.defaults.adapter = origAdapter;
  });

  it('getPublicPayBookingAPI sends X-Checkout-Token in headers and never in the URL', async () => {
    let capturedConfig = null;
    axios.defaults.adapter = async (config) => {
      capturedConfig = config;
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: { success: true, data: { booking: { _id: ID_A, bookingNumber: 'NX-A' } } },
      };
    };

    const res = await getPublicPayBookingAPI(ID_A, TOKEN_A);
    assert.equal(res.status, 200);
    assert.equal(res.data?.booking?._id, ID_A);
    assert.equal(capturedConfig.url, `http://localhost:5000/api/bookings/pay/${ID_A}`);
    assert.ok(!capturedConfig.url.includes(TOKEN_A), 'token must never appear in URL');
    assert.equal(capturedConfig.headers['X-Checkout-Token'], TOKEN_A);
    assert.equal(capturedConfig.headers.Authorization, undefined);
  });

  it('createPaymentAPI sends X-Checkout-Token in headers and preserves Authorization for logged-in users', async () => {
    const validJwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({
      userId: 'u1',
      role: 'user',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).toString('base64url')}.sig`;
    localStorage.setItem('token', validJwt);

    let capturedConfig = null;
    axios.defaults.adapter = async (config) => {
      capturedConfig = config;
      return {
        status: 201,
        statusText: 'Created',
        headers: {},
        config,
        data: { success: true, data: { payment: { _id: 'p1' }, booking: { _id: ID_A } } },
      };
    };

    const res = await createPaymentAPI(ID_A, TOKEN_A);
    assert.equal(res.status, 201);
    assert.equal(capturedConfig.url, 'http://localhost:5000/api/payments/create');
    assert.ok(!capturedConfig.url.includes(TOKEN_A), 'token must never appear in URL');
    assert.equal(capturedConfig.headers['X-Checkout-Token'], TOKEN_A);
    assert.equal(capturedConfig.headers.Authorization, `Bearer ${validJwt}`);
  });

  it('omits X-Checkout-Token header when not supplied (logged-in owner fallback)', async () => {
    const validJwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({
      userId: 'u1',
      role: 'user',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).toString('base64url')}.sig`;
    localStorage.setItem('token', validJwt);

    let capturedConfig = null;
    axios.defaults.adapter = async (config) => {
      capturedConfig = config;
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: { success: true, data: { booking: { _id: ID_A } } },
      };
    };

    await getPublicPayBookingAPI(ID_A);
    assert.equal(capturedConfig.headers['X-Checkout-Token'], undefined);
    assert.equal(capturedConfig.headers.Authorization, `Bearer ${validJwt}`);
  });
});

describe('Frontend checkout token static security invariants', () => {
  const srcRoot = path.resolve(__dirname, '../src');
  const targetFiles = [
    'utils/checkoutSession.js',
    'Services/allAPI.js',
    'components/booking/BookingWizard.jsx',
    'pages/MockPaymentCheckout.jsx',
    'pages/PaymentResult.jsx',
    'pages/BookingConfirmation.jsx',
  ];

  it('never logs checkoutToken or stores it in localStorage or URL query parameters', () => {
    for (const rel of targetFiles) {
      const content = fs.readFileSync(path.join(srcRoot, rel), 'utf8');
      assert.doesNotMatch(
        content,
        /console\.(log|info|warn|error|debug)\([^)]*checkoutToken/i,
        `${rel} must not log checkoutToken`,
      );
      assert.doesNotMatch(
        content,
        /localStorage\.(setItem|getItem)\([^)]*checkout/i,
        `${rel} must not store checkout token in localStorage`,
      );
      assert.doesNotMatch(
        content,
        /[?&]checkoutToken=/i,
        `${rel} must not place checkoutToken in URL query string`,
      );
    }
  });
});
