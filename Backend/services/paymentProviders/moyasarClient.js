const MOYASAR_API_BASE = 'https://api.moyasar.com/v1';

// function getSecretKey() {
//   const secret = process.env.MOYASAR_SECRET_KEY;
//   if (!secret) {
//     const err = new Error('Moyasar secret key is not configured');
//     err.statusCode = 503;
//     throw err;
//   }
//   if ((process.env.MOYASAR_ENV || 'test') !== 'live' && secret.startsWith('sk_live_')) {
//     const err = new Error('Live Moyasar keys are not allowed while MOYASAR_ENV=test');
//     err.statusCode = 500;
//     throw err;
//   }
//   return secret;
// }

function getSecretKey() {
  const secret = process.env.MOYASAR_SECRET_KEY;

  console.log("========== MOYASAR KEY DEBUG ==========");
  console.log("Key exists:", !!secret);
  console.log("Key prefix:", secret ? secret.substring(0, 8) : "MISSING");
  console.log("Key length:", secret ? secret.length : 0);
  console.log("Key suffix:", secret ? secret.slice(-4) : "MISSING");
  console.log("========================================");

  if (!secret) {
    const err = new Error('Moyasar secret key is not configured');
    err.statusCode = 503;
    throw err;
  }

  if (
    (process.env.MOYASAR_ENV || 'test') !== 'live' &&
    secret.startsWith('sk_live_')
  ) {
    const err = new Error(
      'Live Moyasar keys are not allowed while MOYASAR_ENV=test'
    );
    err.statusCode = 500;
    throw err;
  }

  return secret;
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
