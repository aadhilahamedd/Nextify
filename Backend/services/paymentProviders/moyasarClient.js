const MOYASAR_API_BASE = 'https://api.moyasar.com/v1';
const { assertMoyasarCredentials } = require('./moyasarConfig');

function getSecretKey() {
  assertMoyasarCredentials({ force: true });
  return process.env.MOYASAR_SECRET_KEY;
}

function authHeader() {
  return `Basic ${Buffer.from(`${getSecretKey()}:`).toString('base64')}`;
}

async function moyasarRequest(method, path) {
  const response = await fetch(`${MOYASAR_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      Accept: 'application/json',
    },
  });

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
};
