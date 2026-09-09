const { error } = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return error(res, 400, 'Validation failed', errors);
  }

  if (err.code === 11000) {
    return error(res, 409, 'Duplicate record', [err.message]);
  }

  return error(res, err.statusCode || 500, err.message || 'Internal server error');
};

module.exports = errorHandler;
