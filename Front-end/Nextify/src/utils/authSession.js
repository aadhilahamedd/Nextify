import axios from 'axios';
import serverURL from '../Services/serverURL';

export const AUTH_SESSION_EVENT = 'nextify:auth-changed';

function notifyAuthChanged(detail) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT, { detail }));
  }
}

export function readToken() {
  try {
    return localStorage.getItem('token') || '';
  } catch {
    return '';
  }
}

export function readStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function persistSession(token, user) {
  try {
    if (token) localStorage.setItem('token', token);
    if (user) localStorage.setItem('user', JSON.stringify(user));
  } catch {
    return false;
  }
  notifyAuthChanged({ authenticated: Boolean(token || readToken()) });
  return true;
}

export function clearSession({ expectedToken } = {}) {
  if (expectedToken !== undefined && readToken() !== expectedToken) {
    return false;
  }
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch {
    return false;
  }
  notifyAuthChanged({ authenticated: false });
  return true;
}

export function isAuthExpiredMessage(message) {
  return /token has expired|please login again|invalid token|no token provided/i.test(String(message || ''));
}

export function decodeJwtPayload(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(parts[1])) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    if (base64.length % 4 === 1) return null;
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const parsed = JSON.parse(atob(padded));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function tokenNeedsRefresh(token, now = Date.now()) {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
    return true;
  }
  return payload.exp * 1000 <= now + 15000;
}

let refreshPromise = null;
let refreshingToken = '';

export async function refreshSession() {
  const attemptedToken = readToken();
  if (!attemptedToken) return null;
  if (refreshPromise && refreshingToken === attemptedToken) return refreshPromise;

  refreshingToken = attemptedToken;
  const promise = axios.post(`${serverURL}/api/auth/refresh`, {}, {
    headers: { Authorization: `Bearer ${attemptedToken}` },
  }).then((res) => {
    const data = res.data?.data || res.data;
    const nextToken = data?.token;
    const nextUser = data?.user;
    if (
      typeof nextToken !== 'string'
      || !nextToken
      || !decodeJwtPayload(nextToken)
      || !nextUser
      || typeof nextUser !== 'object'
      || Array.isArray(nextUser)
    ) {
      return null;
    }
    if (readToken() !== attemptedToken) {
      return readToken() || null;
    }
    persistSession(nextToken, nextUser);
    return nextToken;
  }).catch((err) => {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      clearSession({ expectedToken: attemptedToken });
    }
    return null;
  }).finally(() => {
    if (refreshPromise === promise) {
      refreshPromise = null;
      refreshingToken = '';
    }
  });

  refreshPromise = promise;
  return promise;
}

export async function ensureAuthToken() {
  const token = readToken();
  if (!token) return null;
  if (!tokenNeedsRefresh(token)) return token;
  return refreshSession();
}
