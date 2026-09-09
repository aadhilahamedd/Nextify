const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nextify_fallback_secret';

/** Attaches req.user when a valid token is present; continues as guest otherwise */
const optionalJwtMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, JWT_SECRET);
    }
  } catch {
    // Invalid token on optional route — treat as guest
  }
  next();
};

module.exports = optionalJwtMiddleware;
