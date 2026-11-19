const { error } = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((e) => e.message);
    return error(res, 400, 'Validation failed', errors);
  }

  if (err.code === 11000) {
    return error(res, 409, 'Duplicate record');
  }

  if (err.type === 'entity.too.large' || err.status === 413 || err.statusCode === 413) {
    return error(res, 413, 'Request body too large');
  }

  const status = err.statusCode || err.status || 500;
  if (status >= 500) {
    return error(res, 500, 'Internal server error');
  }

  return error(
    res,
    status,
    typeof err.message === 'string' && err.message ? err.message : 'Request failed',
  );
};

module.exports = errorHandler;
