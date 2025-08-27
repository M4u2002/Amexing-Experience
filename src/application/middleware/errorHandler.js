const logger = require('../../infrastructure/logger');

/**
 * Logs error details for debugging and monitoring.
 * @param {Error} err - The error object.
 * @param {object} req - Express request object.
 * @example
 * logError(new Error('Test error'), req);
 */
function logError(err, req) {
  logger.error('Error Handler:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
  });
}

/**
 * Handles Parse Server specific errors.
 * @param {Error} err - The error object.
 * @returns {object|null} Status and message object.
 * @example
 * const result = handleParseError({ code: 101 });
 * // Returns: { status: 400, message: 'Invalid username or password' }
 */
function handleParseError(err) {
  if (!err.code || err.code >= 600) {
    return null;
  }

  const parseErrors = {
    101: { status: 400, message: 'Invalid username or password' },
    202: { status: 400, message: 'Username already taken' },
    203: { status: 400, message: 'Email already taken' },
    209: { status: 401, message: 'Invalid session token' },
  };

  return parseErrors[err.code] || { status: 400, message: err.message };
}

/**
 * Handles MongoDB specific errors.
 * @param {Error} err - The error object.
 * @returns {object|null} Status and message object or null.
 * @example
 * const result = handleMongoError({ name: 'MongoError', code: 11000 });
 * // Returns: { status: 400, message: 'Duplicate key error' }
 */
function handleMongoError(err) {
  if (err.name !== 'MongoError' && err.name !== 'MongoServerError') {
    return null;
  }

  if (err.code === 11000) {
    return { status: 400, message: 'Duplicate key error' };
  }

  return { status: 500, message: 'Database error occurred' };
}

/**
 * Handles validation errors.
 * @param {Error} err - The error object.
 * @returns {object|null} Status and message object or null.
 * @example
 * const result = handleValidationError({ name: 'ValidationError', details: [{ message: 'Required field' }] });
 * // Returns: { status: 400, message: 'Required field' }
 */
function handleValidationError(err) {
  if (err.name !== 'ValidationError') {
    return null;
  }

  const message = err.details
    ? err.details.map((detail) => detail.message).join(', ')
    : 'Validation error';

  return { status: 400, message };
}

/**
 * Determines error status and message.
 * @param {Error} err - The error object.
 * @returns {object} Status and message object.
 * @example
 * const details = getErrorDetails(new Error('Custom error'));
 * // Returns: { status: 500, message: 'Custom error' }
 */
function getErrorDetails(err) {
  // Try each error handler in sequence
  let result = handleParseError(err);
  if (result) {
    return result;
  }

  result = handleMongoError(err);
  if (result) {
    return result;
  }

  result = handleValidationError(err);
  if (result) {
    return result;
  }

  return {
    status: err.status || err.statusCode || 500,
    message: err.message || 'Internal Server Error',
  };
}

/**
 * Main error handler middleware.
 * @param {Error} err - The error object.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {Function} _next - Express next function.
 * @returns {void} No return value.
 * @example
 * // Express error handling middleware
 * app.use(errorHandler);
 */
const errorHandler = (err, req, res, _next) => {
  logError(err, req);
  const { status, message } = getErrorDetails(err);
  const finalMessage = process.env.NODE_ENV === 'production' && status === 500
    ? 'An error occurred processing your request'
    : message;

  res.status(status);

  if (req.path.startsWith('/api') || req.path.startsWith('/parse')) {
    return res.json({
      error: true,
      message: finalMessage,
      status,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err,
      }),
    });
  }

  res.render('errors/error', {
    title: 'Error',
    status,
    message: finalMessage,
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
};

module.exports = errorHandler;
