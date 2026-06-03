const serverURL = process.env.REACT_APP_BACKEND_URL || (
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://nextify-egkj.onrender.com"
);

export default serverURL;