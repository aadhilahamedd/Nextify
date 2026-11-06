import axios from 'axios';
import serverURL from '../Services/serverURL';

export function readToken() {
  return localStorage.getItem('token') || '';
}

export function persistSession(token, user) {
  if (token) localStorage.setItem('token', token);
  if (user) localStorage.setItem('user', JSON.stringify(user));
}

export function isAuthExpiredMessage(message) {
  return /token has expired|please login again|invalid token|no token provided/i.test(String(message || ''));
}

function tokenNeedsRefresh(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return !payload.exp || payload.exp * 1000 <= Date.now() + 15000;
  } catch {
    return true;
  }
}

let refreshPromise = null;

export async function refreshSession() {
  const token = readToken();
  if (!token) return null;
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios.post(`${serverURL}/api/auth/refresh`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => {
    const data = res.data?.data || res.data;
    const nextToken = data?.token;
    if (!nextToken) return null;
    persistSession(nextToken, data.user);
    return nextToken;
  }).catch(() => null).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function ensureAuthToken() {
  const token = readToken();
  if (!token) return null;
  if (!tokenNeedsRefresh(token)) return token;
  return refreshSession();
}
