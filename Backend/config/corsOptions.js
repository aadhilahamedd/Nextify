const LOCAL_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const PRODUCTION_ORIGINS = [
  'https://www.nextifylimo.com',
  'https://nextifylimo.com',
];

function allowedOriginSet() {
  const origins = new Set([...LOCAL_ORIGINS, ...PRODUCTION_ORIGINS]);
  for (const value of [process.env.FRONTEND_URL, process.env.CLIENT_URL]) {
    const normalized = String(value || '').trim().replace(/\/$/, '');
    if (normalized) origins.add(normalized);
  }
  return origins;
}

function corsOrigin(origin, callback) {
  if (!origin) {
    callback(null, true);
    return;
  }
  callback(null, allowedOriginSet().has(origin));
}

function buildCorsOptions() {
  return {
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Checkout-Token'],
    optionsSuccessStatus: 204,
  };
}

module.exports = {
  LOCAL_ORIGINS,
  PRODUCTION_ORIGINS,
  allowedOriginSet,
  buildCorsOptions,
};
