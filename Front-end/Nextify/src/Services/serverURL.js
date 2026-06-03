const serverURL = import.meta.env.VITE_BACKEND_URL || (
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "https://nextify-1.onrender.com"
    : window.location.origin
);

export default serverURL;