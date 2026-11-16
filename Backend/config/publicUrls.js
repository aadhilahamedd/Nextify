const PRODUCTION_FRONTEND_URL = 'https://www.nextifylimo.com';

function frontendBaseUrl() {
  const configured = String(process.env.FRONTEND_URL || process.env.CLIENT_URL || '').trim().replace(/\/$/, '');
  const local = !configured || /localhost|127\.0\.0\.1/i.test(configured);
  if (process.env.NODE_ENV === 'production' && local) return PRODUCTION_FRONTEND_URL;
  return configured || 'http://localhost:5173';
}

module.exports = { PRODUCTION_FRONTEND_URL, frontendBaseUrl };
