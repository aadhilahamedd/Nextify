const MOYASAR_API_BASE = 'https://api.moyasar.com/v1';
const DEFAULT_MOYASAR_TIMEOUT_MS = 8000;
const { assertMoyasarCredentials } = require('./moyasarConfig');

function getMoyasarTimeoutMs() {
  const configured = Number(process.env.MOYASAR_HTTP_TIMEOUT_MS);
  if (Number.isFinite(configured) && configured >= 500 && configured <= 30000) {
    return configured;
  }
  return DEFAULT_MOYASAR_TIMEOUT_MS;
}

function getSecretKey() {
  assertMoyasarCredentials({ force: true });
  return process.env.MOYASAR_SECRET_KEY;
}

function authHeader() {
  return `Basic ${Buffer.from(`${getSecretKey()}:`).toString('base64')}`;
}

async function moyasarRequest(method, path) {
  const timeoutMs = getMoyasarTimeoutMs();
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  let response;
  try {
    response = await fetch(`${MOYASAR_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: authHeader(),
        Accept: 'application/json',
      },
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch (err) {
    const isTimeout = err?.name === 'AbortError' || err?.code === 'ABORT_ERR';
    const wrapped = new Error(
      isTimeout
        ? `Moyasar API request timed out after ${timeoutMs}ms`
        : 'Unable to reach Moyasar API'
    );
    wrapped.statusCode = isTimeout ? 504 : 502;
    wrapped.code = isTimeout ? 'MOYASAR_TIMEOUT' : 'MOYASAR_NETWORK_ERROR';
    throw wrapped;
  } finally {
    if (timer) clearTimeout(timer);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const err = new Error(
      response.status === 401
        ? 'Moyasar authentication failed. Check MOYASAR_SECRET_KEY in backend .env'
        : data?.message || data?.error || 'Moyasar API request failed'
    );
    err.statusCode = response.status === 401 ? 502 : response.status;
    err.moyasarType = data?.type;
    throw err;
  }

  return data;
}

async function retrievePayment(moyasarPaymentId) {
  if (!moyasarPaymentId) {
    const err = new Error('Moyasar payment id is required');
    err.statusCode = 400;
    throw err;
  }
  return moyasarRequest('GET', `/payments/${encodeURIComponent(moyasarPaymentId)}`);
}

module.exports = {
  retrievePayment,
  MOYASAR_API_BASE,
  DEFAULT_MOYASAR_TIMEOUT_MS,
  getMoyasarTimeoutMs,
};
