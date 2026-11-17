const PRODUCTION_API_URL = 'https://nextify-1.onrender.com';

function developmentApiUrl() {
  const configured = String(
    import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '',
  ).replace(/\/$/, '');
  if (!configured || /:(3000)(\/|$)/.test(configured)) return 'http://localhost:5000';
  return configured;
}

const serverURL = import.meta.env.PROD ? PRODUCTION_API_URL : developmentApiUrl();

export default serverURL;
