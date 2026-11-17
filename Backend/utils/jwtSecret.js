const DEVELOPMENT_JWT_SECRET = 'nextify_fallback_secret';

const KNOWN_JWT_FALLBACKS = new Set([
  DEVELOPMENT_JWT_SECRET,
  'your_secure_jwt_secret_here',
]);

function configuredJwtSecret() {
  const value = process.env.JWT_SECRET;
  if (typeof value !== 'string' || !value.trim()) return '';
  return value;
}

function assertProductionJwtSecret() {
  if (process.env.NODE_ENV !== 'production') return;
  const secret = configuredJwtSecret();
  if (!secret || KNOWN_JWT_FALLBACKS.has(secret.trim())) {
    const err = new Error('JWT_SECRET is missing or uses a development fallback. Set a unique JWT_SECRET before production startup.');
    err.statusCode = 500;
    throw err;
  }
}

function getJwtSecret() {
  if (process.env.NODE_ENV === 'production') {
    assertProductionJwtSecret();
    return configuredJwtSecret();
  }
  return configuredJwtSecret() || DEVELOPMENT_JWT_SECRET;
}

module.exports = {
  DEVELOPMENT_JWT_SECRET,
  assertProductionJwtSecret,
  getJwtSecret,
};
