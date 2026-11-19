const rateLimit = require('express-rate-limit');

const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_LOGIN_REGISTER_MAX = 10;
const AUTH_REFRESH_MAX = 30;

const authLoginRegisterLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max: AUTH_LOGIN_REGISTER_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
    errors: [],
  },
});

const authRefreshLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max: AUTH_REFRESH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many session refresh attempts. Please try again later.',
    errors: [],
  },
});

module.exports = {
  AUTH_WINDOW_MS,
  AUTH_LOGIN_REGISTER_MAX,
  AUTH_REFRESH_MAX,
  authLoginRegisterLimiter,
  authRefreshLimiter,
};
