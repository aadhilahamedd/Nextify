import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Mock Vite-specific serverURL.js (uses import.meta.env) so production modules load cleanly in Node.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith('/Services/serverURL') || specifier.endsWith('/Services/serverURL.js')) {
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
  };
}

const dispatchedEvents = [];
globalThis.localStorage = createStorageMock();
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};
globalThis.window = {
  dispatchEvent(event) {
    dispatchedEvents.push(event);
    return true;
  },
};

const axiosModule = await import('axios');
const axios = axiosModule.default;
const authSession = await import('../src/utils/authSession.js');
const commonAPIModule = await import('../src/Services/commonAPI.js');
const commonAPI = commonAPIModule.default;

const {
  AUTH_SESSION_EVENT,
  clearSession,
  decodeJwtPayload,
  ensureAuthToken,
  isAuthExpiredMessage,
  persistSession,
  readStoredUser,
  readToken,
  refreshSession,
  tokenNeedsRefresh,
} = authSession;

function toBase64Url(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function makeJwt(payload) {
  const header = toBase64Url({ alg: 'HS256', typ: 'JWT' });
  const body = toBase64Url(payload);
  return `${header}.${body}.signature_part`;
}

describe('JWT Base64URL decoding & tokenNeedsRefresh', () => {
  it('decodes Base64URL payloads containing - and _ without padding', () => {
    // Choose payload strings that force both '-' and '_' in base64url encoding.
    const payload = {
      userId: 'user?>>??>>',
      note: 'subjects?_d~',
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const encoded = toBase64Url(payload);
    assert.ok(encoded.includes('-') || encoded.includes('_'), 'test fixture should contain base64url chars');
    assert.ok(!encoded.includes('='), 'test fixture should omit padding');

    const token = makeJwt(payload);
    const decoded = decodeJwtPayload(token);
    assert.deepEqual(decoded, payload);
    assert.equal(tokenNeedsRefresh(token), false);
  });

  it('returns false for valid non-expiring JWT and avoids refresh request', async () => {
    const validToken = makeJwt({
      userId: 'u1',
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    localStorage.setItem('token', validToken);

    let postCalls = 0;
    const origPost = axios.post;
    axios.post = async () => {
      postCalls += 1;
      throw new Error('should not be called');
    };
    try {
      const result = await ensureAuthToken();
      assert.equal(result, validToken);
      assert.equal(postCalls, 0);
    } finally {
      axios.post = origPost;
    }
  });

  it('flags expired and near-expiry JWTs for refresh', () => {
    const now = Date.now();
    const expired = makeJwt({ userId: 'u1', role: 'user', exp: Math.floor(now / 1000) - 10 });
    const expiringSoon = makeJwt({ userId: 'u1', role: 'user', exp: Math.floor(now / 1000) + 5 });
    const fresh = makeJwt({ userId: 'u1', role: 'user', exp: Math.floor(now / 1000) + 60 });

    assert.equal(tokenNeedsRefresh(expired, now), true);
    assert.equal(tokenNeedsRefresh(expiringSoon, now), true);
    assert.equal(tokenNeedsRefresh(fresh, now), false);
  });

  it('handles malformed and invalid tokens safely without throwing', () => {
    const malformed = [
      '',
      'not-a-jwt',
      'only.two',
      'a.b.c.d',
      'a..c',
      'a.!!!invalid!!!.c',
      'a.YQ.c', // invalid base64 length mod 4 === 1 after trim or non-JSON 'a'
      `a.${Buffer.from('not-json').toString('base64url')}.c`,
      `a.${Buffer.from('[]').toString('base64url')}.c`,
      makeJwt({ userId: 'u1', role: 'user' }), // missing exp
      makeJwt({ userId: 'u1', role: 'user', exp: 'bad' }), // non-numeric exp
    ];

    for (const bad of malformed) {
      if (bad === '') {
        assert.equal(tokenNeedsRefresh(bad), false);
      } else {
        assert.equal(tokenNeedsRefresh(bad), true);
      }
    }
    assert.equal(decodeJwtPayload('not-a-jwt'), null);
    assert.equal(decodeJwtPayload(null), null);
  });
});

describe('refreshSession cleanup, error resilience, concurrency & events', () => {
  const originalPost = axios.post;

  beforeEach(() => {
    localStorage.clear();
    dispatchedEvents.length = 0;
  });

  afterEach(() => {
    axios.post = originalPost;
  });

  it('clears session and dispatches event on 401 refresh rejection', async () => {
    const oldToken = makeJwt({ userId: 'a1', role: 'admin', exp: 1 });
    persistSession(oldToken, { id: 'a1', username: 'Admin', role: 'admin' });
    dispatchedEvents.length = 0;

    axios.post = async () => {
      const err = new Error('Unauthorized');
      err.response = { status: 401, data: { message: 'Token has expired. Please login again.' } };
      throw err;
    };

    const result = await refreshSession();
    assert.equal(result, null);
    assert.equal(readToken(), '');
    assert.equal(readStoredUser(), null);
    assert.equal(dispatchedEvents.length, 1);
    assert.equal(dispatchedEvents[0].type, AUTH_SESSION_EVENT);
    assert.deepEqual(dispatchedEvents[0].detail, { authenticated: false });
  });

  it('clears session and dispatches event on 403 refresh rejection', async () => {
    const oldToken = makeJwt({ userId: 'a1', role: 'admin', exp: 1 });
    persistSession(oldToken, { id: 'a1', username: 'Admin', role: 'admin' });
    dispatchedEvents.length = 0;

    axios.post = async () => {
      const err = new Error('Forbidden');
      err.response = { status: 403, data: { message: 'Invalid token.' } };
      throw err;
    };

    const result = await refreshSession();
    assert.equal(result, null);
    assert.equal(readToken(), '');
    assert.equal(readStoredUser(), null);
    assert.equal(dispatchedEvents.length, 1);
    assert.equal(dispatchedEvents[0].type, AUTH_SESSION_EVENT);
  });

  it('preserves existing session on network failure and 5xx responses', async () => {
    const token = makeJwt({ userId: 'a1', role: 'admin', exp: 1 });
    const user = { id: 'a1', username: 'Admin', role: 'admin' };
    persistSession(token, user);
    dispatchedEvents.length = 0;

    // Network error (no err.response)
    axios.post = async () => {
      throw new Error('Network Error');
    };
    assert.equal(await refreshSession(), null);
    assert.equal(readToken(), token);
    assert.deepEqual(readStoredUser(), user);
    assert.equal(dispatchedEvents.length, 0);

    // 503 Service Unavailable
    axios.post = async () => {
      const err = new Error('Service Unavailable');
      err.response = { status: 503, data: { message: 'Server waking up' } };
      throw err;
    };
    assert.equal(await refreshSession(), null);
    assert.equal(readToken(), token);
    assert.deepEqual(readStoredUser(), user);
    assert.equal(dispatchedEvents.length, 0);
  });

  it('shares a single HTTP request for concurrent refreshes of the same token', async () => {
    const oldToken = makeJwt({ userId: 'a1', role: 'admin', exp: 1 });
    const nextToken = makeJwt({ userId: 'a1', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 });
    persistSession(oldToken, { id: 'a1', username: 'Admin', role: 'admin' });

    let postCalls = 0;
    let resolvePost;
    axios.post = () => {
      postCalls += 1;
      return new Promise((resolve) => {
        resolvePost = resolve;
      });
    };

    const p1 = refreshSession();
    const p2 = refreshSession();
    assert.equal(postCalls, 1);

    resolvePost({
      data: {
        success: true,
        data: { token: nextToken, user: { id: 'a1', username: 'Admin', role: 'admin' } },
      },
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    assert.equal(r1, nextToken);
    assert.equal(r2, nextToken);
    assert.equal(readToken(), nextToken);
  });

  it('does not clear a newer login session when an older refresh rejects with 401', async () => {
    const oldToken = makeJwt({ userId: 'a1', role: 'admin', exp: 1 });
    const newerToken = makeJwt({ userId: 'a1', role: 'admin', exp: Math.floor(Date.now() / 1000) + 7200 });
    const newerUser = { id: 'a1', username: 'AdminNew', role: 'admin' };
    persistSession(oldToken, { id: 'a1', username: 'AdminOld', role: 'admin' });

    let rejectPost;
    axios.post = () => new Promise((_, reject) => {
      rejectPost = reject;
    });

    const pendingRefresh = refreshSession();

    // User logs in again while the old refresh is still in flight
    persistSession(newerToken, newerUser);
    dispatchedEvents.length = 0;

    const err = new Error('Unauthorized');
    err.response = { status: 401, data: { message: 'Token has expired. Please login again.' } };
    rejectPost(err);

    const result = await pendingRefresh;
    assert.equal(result, null);
    assert.equal(readToken(), newerToken);
    assert.deepEqual(readStoredUser(), newerUser);
    assert.equal(dispatchedEvents.length, 0, 'must not dispatch logout event for newer session');
  });

  it('does not overwrite a newer login session when an older refresh succeeds', async () => {
    const oldToken = makeJwt({ userId: 'a1', role: 'admin', exp: 1 });
    const staleRefreshedToken = makeJwt({ userId: 'a1', role: 'user', exp: Math.floor(Date.now() / 1000) + 1800 });
    const newerToken = makeJwt({ userId: 'a2', role: 'admin', exp: Math.floor(Date.now() / 1000) + 7200 });
    const newerUser = { id: 'a2', username: 'FreshAdmin', role: 'admin' };
    persistSession(oldToken, { id: 'a1', username: 'OldUser', role: 'user' });

    let resolvePost;
    axios.post = () => new Promise((resolve) => {
      resolvePost = resolve;
    });

    const pendingRefresh = refreshSession();
    persistSession(newerToken, newerUser);

    resolvePost({
      data: {
        success: true,
        data: { token: staleRefreshedToken, user: { id: 'a1', username: 'OldUser', role: 'user' } },
      },
    });

    const result = await pendingRefresh;
    assert.equal(result, newerToken);
    assert.equal(readToken(), newerToken);
    assert.deepEqual(readStoredUser(), newerUser);
  });

  it('dispatches session events on persistSession and clearSession', () => {
    const token = makeJwt({ userId: 'u1', role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 });
    persistSession(token, { id: 'u1', username: 'NormalUser', role: 'user' });
    assert.equal(dispatchedEvents.length, 1);
    assert.equal(dispatchedEvents[0].type, AUTH_SESSION_EVENT);
    assert.deepEqual(dispatchedEvents[0].detail, { authenticated: true });
    assert.equal(readStoredUser().role, 'user');

    clearSession();
    assert.equal(dispatchedEvents.length, 2);
    assert.equal(dispatchedEvents[1].type, AUTH_SESSION_EVENT);
    assert.deepEqual(dispatchedEvents[1].detail, { authenticated: false });
    assert.equal(readToken(), '');
  });
});

describe('Admin/user role compatibility & non-expired 403 handling', () => {
  beforeEach(() => {
    localStorage.clear();
    dispatchedEvents.length = 0;
  });

  it('does not treat "Admin access required." as an expired token message', () => {
    assert.equal(isAuthExpiredMessage('Admin access required.'), false);
    assert.equal(isAuthExpiredMessage('Admin access denied'), false);
    assert.equal(isAuthExpiredMessage('Token has expired. Please login again.'), true);
    assert.equal(isAuthExpiredMessage('Invalid token.'), true);
    assert.equal(isAuthExpiredMessage('Access denied. No token provided.'), true);
  });

  it('does not clear a normal user session on 403 Admin access required', async () => {
    const userToken = makeJwt({ userId: 'u1', role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 });
    const normalUser = { id: 'u1', username: 'Customer', role: 'user' };
    persistSession(userToken, normalUser);
    dispatchedEvents.length = 0;

    const origAdapter = axios.defaults.adapter;
    let refreshCalls = 0;
    const origPost = axios.post;
    axios.post = async () => {
      refreshCalls += 1;
      throw new Error('refresh should not run for genuine 403 Admin access required');
    };
    axios.defaults.adapter = async (config) => {
      const err = new Error('Forbidden');
      err.config = config;
      err.response = {
        status: 403,
        data: { success: false, message: 'Admin access required.' },
      };
      throw err;
    };

    try {
      const res = await commonAPI('GET', 'http://localhost:5000/api/bookings', '', {
        Authorization: `Bearer ${userToken}`,
      });
      assert.equal(res.status, 403);
      assert.equal(refreshCalls, 0);
      assert.equal(readToken(), userToken);
      assert.deepEqual(readStoredUser(), normalUser);
      assert.equal(dispatchedEvents.length, 0);
    } finally {
      axios.defaults.adapter = origAdapter;
      axios.post = origPost;
    }
  });

  it('commonAPI refreshes once and retries on expired 401', async () => {
    // Use a non-expiring token so ensureAuthToken does not proactively refresh;
    // the server rejects the first request with 401 Token has expired.
    const oldToken = makeJwt({ userId: 'a1', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 });
    const freshToken = makeJwt({ userId: 'a1', role: 'admin', exp: Math.floor(Date.now() / 1000) + 7200 });
    const adminUser = { id: 'a1', username: 'Admin', role: 'admin' };
    persistSession(oldToken, adminUser);

    const origAdapter = axios.defaults.adapter;
    const origPost = axios.post;
    const seenAuthHeaders = [];
    let refreshCalls = 0;

    axios.post = async () => {
      refreshCalls += 1;
      return {
        data: { success: true, data: { token: freshToken, user: adminUser } },
      };
    };
    axios.defaults.adapter = async (config) => {
      seenAuthHeaders.push(config.headers.Authorization);
      if (seenAuthHeaders.length === 1) {
        const err = new Error('Unauthorized');
        err.config = config;
        err.response = {
          status: 401,
          data: { message: 'Token has expired. Please login again.' },
        };
        throw err;
      }
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: { success: true, data: { ok: true } },
      };
    };

    try {
      const res = await commonAPI('GET', 'http://localhost:5000/api/bookings', '', {
        Authorization: `Bearer ${oldToken}`,
      });
      assert.equal(res.status, 200);
      assert.equal(refreshCalls, 1);
      assert.deepEqual(seenAuthHeaders, [`Bearer ${oldToken}`, `Bearer ${freshToken}`]);
      assert.equal(readToken(), freshToken);
    } finally {
      axios.defaults.adapter = origAdapter;
      axios.post = origPost;
    }
  });

  it('commonAPI performs at most one retry when retried request also returns 401', async () => {
    const oldToken = makeJwt({ userId: 'a1', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 });
    const freshToken = makeJwt({ userId: 'a1', role: 'admin', exp: Math.floor(Date.now() / 1000) + 7200 });
    const adminUser = { id: 'a1', username: 'Admin', role: 'admin' };
    persistSession(oldToken, adminUser);

    const origAdapter = axios.defaults.adapter;
    const origPost = axios.post;
    let requestCalls = 0;
    let refreshCalls = 0;

    axios.post = async () => {
      refreshCalls += 1;
      return {
        data: { success: true, data: { token: freshToken, user: adminUser } },
      };
    };
    axios.defaults.adapter = async (config) => {
      requestCalls += 1;
      const err = new Error('Unauthorized');
      err.config = config;
      err.response = {
        status: 401,
        data: { message: 'Token has expired. Please login again.' },
      };
      throw err;
    };

    try {
      const res = await commonAPI('GET', 'http://localhost:5000/api/bookings', '', {
        Authorization: `Bearer ${oldToken}`,
      });
      assert.equal(res.status, 401);
      assert.equal(refreshCalls, 1, 'must refresh only once');
      assert.equal(requestCalls, 2, 'must send initial request + single retry only');
    } finally {
      axios.defaults.adapter = origAdapter;
      axios.post = origPost;
    }
  });

  it('commonAPI handles 403 Invalid token by refreshing and clearing rejected session', async () => {
    const badToken = makeJwt({ userId: 'a1', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 });
    persistSession(badToken, { id: 'a1', username: 'Admin', role: 'admin' });
    dispatchedEvents.length = 0;

    const origAdapter = axios.defaults.adapter;
    const origPost = axios.post;
    let refreshCalls = 0;

    axios.post = async () => {
      refreshCalls += 1;
      const err = new Error('Forbidden');
      err.response = { status: 403, data: { message: 'Invalid token.' } };
      throw err;
    };
    axios.defaults.adapter = async (config) => {
      const err = new Error('Forbidden');
      err.config = config;
      err.response = { status: 403, data: { message: 'Invalid token.' } };
      throw err;
    };

    try {
      const res = await commonAPI('GET', 'http://localhost:5000/api/bookings', '', {
        Authorization: `Bearer ${badToken}`,
      });
      assert.equal(res.status, 403);
      assert.equal(refreshCalls, 1);
      assert.equal(readToken(), '');
      assert.equal(readStoredUser(), null);
      assert.equal(dispatchedEvents.length, 1);
      assert.equal(dispatchedEvents[0].type, AUTH_SESSION_EVENT);
    } finally {
      axios.defaults.adapter = origAdapter;
      axios.post = origPost;
    }
  });
});

describe('Refresh response validation, clearSession guard & localStorage safety', () => {
  const originalPost = axios.post;
  const originalStorage = globalThis.localStorage;

  beforeEach(() => {
    globalThis.localStorage = originalStorage;
    localStorage.clear();
    dispatchedEvents.length = 0;
  });

  afterEach(() => {
    axios.post = originalPost;
    globalThis.localStorage = originalStorage;
  });

  it('rejects malformed or incomplete 200 refresh responses without overwriting session', async () => {
    const existingToken = makeJwt({ userId: 'a1', role: 'admin', exp: 1 });
    const existingUser = { id: 'a1', username: 'Admin', role: 'admin' };
    const validNextToken = makeJwt({ userId: 'a1', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 });

    const malformedPayloads = [
      { data: {} },
      { data: { token: '', user: existingUser } },
      { data: { token: 'not-a-valid-jwt', user: existingUser } },
      { data: { token: validNextToken } },
      { data: { token: validNextToken, user: null } },
      { data: { token: validNextToken, user: ['bad'] } },
    ];

    for (const payload of malformedPayloads) {
      persistSession(existingToken, existingUser);
      dispatchedEvents.length = 0;
      axios.post = async () => ({ data: { success: true, ...payload } });

      const result = await refreshSession();
      assert.equal(result, null);
      assert.equal(readToken(), existingToken);
      assert.deepEqual(readStoredUser(), existingUser);
      assert.equal(dispatchedEvents.length, 0);
    }
  });

  it('clearSession with mismatched expectedToken returns false and preserves storage', () => {
    const currentToken = makeJwt({ userId: 'a1', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 });
    const currentUser = { id: 'a1', username: 'Admin', role: 'admin' };
    persistSession(currentToken, currentUser);
    dispatchedEvents.length = 0;

    const cleared = clearSession({ expectedToken: 'some-older-token' });
    assert.equal(cleared, false);
    assert.equal(readToken(), currentToken);
    assert.deepEqual(readStoredUser(), currentUser);
    assert.equal(dispatchedEvents.length, 0);
  });

  it('handles localStorage SecurityError and QuotaExceededError safely without throwing', () => {
    globalThis.localStorage = {
      getItem() {
        const err = new Error('Storage blocked');
        err.name = 'SecurityError';
        throw err;
      },
      setItem() {
        const err = new Error('Quota exceeded');
        err.name = 'QuotaExceededError';
        throw err;
      },
      removeItem() {
        const err = new Error('Storage blocked');
        err.name = 'SecurityError';
        throw err;
      },
    };

    assert.equal(readToken(), '');
    assert.equal(readStoredUser(), null);
    assert.equal(persistSession('tok', { id: '1', role: 'admin' }), false);
    assert.equal(clearSession(), false);
    assert.equal(dispatchedEvents.length, 0);
  });
});
