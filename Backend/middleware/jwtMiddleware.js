const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nextify_fallback_secret';

const jwtMiddleware = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please login again.' });
    }
    return res.status(403).json({ message: 'Invalid token.' });
  }
};

module.exports = jwtMiddleware;