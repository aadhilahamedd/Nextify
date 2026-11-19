const User = require('../models/User');
const { error } = require('../utils/apiResponse');

const adminMiddleware = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin' || !req.user.userId) {
    return error(res, 403, 'Admin access required.');
  }

  try {
    const user = await User.findById(req.user.userId).select('role').lean();
    if (!user || user.role !== 'admin') {
      return error(res, 403, 'Admin access required.');
    }
    return next();
  } catch (err) {
    if (err?.name === 'CastError') {
      return error(res, 403, 'Admin access required.');
    }
    return error(res, 500, 'Unable to verify admin authorization.');
  }
};

module.exports = adminMiddleware;
