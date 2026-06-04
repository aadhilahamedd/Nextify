const serverURL = import.meta.env.VITE_BACKEND_URL || (
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : window.location.origin
);

console.log("Backend URL:", serverURL);

export default serverURL;