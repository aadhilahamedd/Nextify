const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('./jwtSecret');

const TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
const REFRESH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function signAuthToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRES_IN },
  );
}

function publicUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
  };
}

module.exports = {
  getJwtSecret,
  TOKEN_EXPIRES_IN,
  REFRESH_WINDOW_MS,
  signAuthToken,
  publicUser,
};
