/**
 * Error Handler Middleware
 * Centralized error handling with proper logging and response formatting
 */

const logger = require('../services/logger');
const errorTracker = require('../services/error-tracker');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

// Request ID extractor
const getRequestId = (req) => {
  return req.id || req.requestId || req.headers['x-request-id'] || null;
};

// Error response formatter
const formatErrorResponse = (error, requestId = null) => {
  const response = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred'
    }
  };
  
  // Add request ID for tracking
  if (requestId) {
    response.error.requestId = requestId;
  }
  
  // Add details if available (for validation errors)
  if (error.details) {
    response.error.details = error.details;
  }
  
  // Add stack trace in development
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.error.stack = error.stack.split('\n');
  }
  
  return response;
};

// Determine if error should be logged
const shouldLogError = (error) => {
  // Don't log 404s for static assets
  if (error.statusCode === 404 && error.path?.includes('.')) {
    return false;
  }
  
  // Don't log authentication errors at error level
  if (error.statusCode === 401) {
    return false;
  }
  
  return true;
};

// Log error with context
const logError = (error, req = {}, context = {}) => {
  const logData = {
    requestId: getRequestId(req),
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    statusCode: error.statusCode || 500,
    errorCode: error.code,
    errorType: error.name,
    userId: req.user?.id || null,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
    ...context
  };
  
  if (error.statusCode >= 500) {
    logger.error({ ...logData, stack: error.stack }, error.message);
  } else if (error.statusCode >= 400) {
    logger.warn(logData, error.message);
  } else {
    logger.info(logData, error.message);
  }
};

// Main error handler middleware
const errorHandler = (err, req, res, next) => {
  // Extract request ID
  const requestId = getRequestId(req);
  
  // Default error values
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';
  let details = err.details || null;
  
  // Handle specific error types
  if (err.name === 'ValidationError' || err.name === 'SyntaxError') {
    if (err.status === 400 || err.type === 'entity.parse.failed') {
      statusCode = 400;
      code = 'INVALID_JSON';
      message = 'Invalid JSON in request body';
    }
  }
  
  if (err.type === 'entity.too.large') {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body too large';
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }
  
  // Handle database errors
  if (err.code === '23505') {
    // PostgreSQL unique violation
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'A record with this value already exists';
  }
  
  if (err.code === '23503') {
    // PostgreSQL foreign key violation
    statusCode = 400;
    code = 'REFERENCE_ERROR';
    message = 'Referenced record does not exist';
  }
  
  // Log the error
  if (shouldLogError({ statusCode, path: req.path })) {
    logError(
      { ...err, statusCode, code, message },
      req,
      { handler: 'errorHandler' }
    );
  }
  
  // Track error in error tracker
  try {
    errorTracker.captureError(err, {
      requestId,
      userId: req.user?.id,
      userEmail: req.user?.email,
      ip: req.ip,
      method: req.method,
      endpoint: req.path,
      userAgent: req.get('user-agent'),
      statusCode,
      severity: statusCode >= 500 ? 'critical' : 'error'
    });
  } catch (trackerError) {
    console.error('Failed to track error:', trackerError);
  }
  
  // Build response
  const errorResponse = formatErrorResponse(
    { statusCode, message, code, details },
    requestId
  );
  
  // Send response
  res.status(statusCode).json(errorResponse);
};

// Async handler wrapper (catches async errors)
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found handler (404)
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.method} ${req.path}`);
  errorTracker.captureError(error, {
    requestId: getRequestId(req),
    method: req.method,
    endpoint: req.path,
    ip: req.ip
  });
  
  res.status(404).json(formatErrorResponse(error, getRequestId(req)));
};

// Database error handler helper
const handleDatabaseError = (error, context = {}) => {
  logger.error({
    ...context,
    dbError: true,
    code: error.code,
    detail: error.detail,
    message: error.message
  }, 'Database error occurred');
  
  if (error.code === '23505') {
    return new ConflictError('Record already exists');
  }
  
  if (error.code === '23503') {
    return new ValidationError('Referenced record not found');
  }
  
  return new AppError('Database operation failed', 500, 'DB_ERROR');
};

// Validation error helper
const validateRequired = (data, fields, fieldName = 'body') => {
  const missing = [];
  
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      { field: fieldName, missingFields: missing }
    );
  }
};

// Validation type helper
const validateType = (value, type, fieldName) => {
  if (typeof value !== type) {
    throw new ValidationError(
      `${fieldName} must be of type ${type}`,
      { field: fieldName, expected: type, actual: typeof value }
    );
  }
};

// Validation range helper
const validateRange = (value, min, max, fieldName) => {
  if (value < min || value > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}`,
      { field: fieldName, min, max, actual: value }
    );
  }
};

module.exports = {
  // Custom error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  
  // Middleware
  errorHandler,
  notFoundHandler,
  asyncHandler,
  
  // Helpers
  formatErrorResponse,
  getRequestId,
  handleDatabaseError,
  validateRequired,
  validateType,
  validateRange
};
