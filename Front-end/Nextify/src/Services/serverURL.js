export const PRODUCTION_API_URL = 'https://nextify-1.onrender.com';
export const DEVELOPMENT_API_URL = 'http://localhost:5000';

export function resolveServerURL(env = {}) {
  const apiUrl = String(env?.VITE_API_URL || '').trim();
  const backendUrl = String(env?.VITE_BACKEND_URL || '').trim();
  const configured = (apiUrl || backendUrl).replace(/\/+$/, '');
  if (env?.PROD) {
    return configured || PRODUCTION_API_URL;
  }
  if (!configured || /:(3000)(\/|$)/.test(configured)) {
    return DEVELOPMENT_API_URL;
  }
  return configured;
}

const env = import.meta.env
  ? {
      VITE_API_URL: import.meta.env.VITE_API_URL,
      VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
      PROD: import.meta.env.PROD,
    }
  : {};

const serverURL = resolveServerURL(env);

export default serverURL;
