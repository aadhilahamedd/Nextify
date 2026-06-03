const serverURL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://nextify-egkj.onrender.com";

export default serverURL;