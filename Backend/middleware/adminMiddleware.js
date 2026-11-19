const { error } = require('../utils/apiResponse');

const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return error(res, 403, 'Admin access required.');
  }
  next();
};

module.exports = adminMiddleware;
