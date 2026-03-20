/**
 * Structured Logging Service
 * Pino-based JSON logging for machine parsing and observability
 */

const pino = require('pino');

// Create child loggers for different contexts
const createLogger = (context = {}) => {
  return logger.child(context);
};

// Main logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  
  // Base logging configuration
  base: {
    service: 'hospital-queue-api',
    version: process.env.npm_package_version || '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  
  // Timestamp format
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  
  // Formatter for production (JSON)
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
    bindings: (bindings) => ({
      service: bindings.service,
      version: bindings.version,
      env: bindings.environment
    })
  },
  
  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'password_hash',
      'token',
      'accessToken',
      'refreshToken',
      'authorization',
      'cookie',
      'req.headers.x-api-key',
      'api_key',
      'secret'
    ],
    censor: '[REDACTED]'
  },
  
  // Pretty print in development
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      messageFormat: '[{service}] {msg}'
    }
  } : undefined,
  
  // Output to stdout (Docker compatible)
  stream: process.stdout
});

// Request context methods
logger.withRequest = (requestId, userId = null) => {
  return logger.child({
    requestId,
    userId,
    timestamp: new Date().toISOString()
  });
};

logger.withUser = (userId, role = null) => {
  return logger.child({ userId, role });
};

logger.withRequestContext = (context) => {
  return logger.child(context);
};

// Specialized logging methods
logger.logRequest = (req, res, duration, requestId) => {
  const logData = {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    statusCode: res.statusCode,
    responseTime: duration,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent') || 'unknown',
    contentLength: res.get('content-length') || 0
  };
  
  if (res.statusCode >= 500) {
    logger.error(logData, 'Request completed with server error');
  } else if (res.statusCode >= 400) {
    logger.warn(logData, 'Request completed with client error');
  } else if (duration > 500) {
    logger.warn({ ...logData, warning: 'SLOW_REQUEST' }, 'Slow request detected');
  } else {
    logger.info(logData, 'Request completed');
  }
};

logger.logError = (error, context = {}) => {
  const logData = {
    ...context,
    error: {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: error.code
    }
  };
  
  logger.error(logData, 'Error occurred');
};

logger.logAuth = (action, userId, success, details = {}) => {
  const logData = {
    authAction: action,
    userId,
    success,
    ...details
  };
  
  if (!success) {
    logger.warn(logData, `Authentication ${action} failed`);
  } else {
    logger.info(logData, `Authentication ${action} succeeded`);
  }
};

logger.logDatabase = (operation, table, duration, success = true) => {
  const logData = {
    dbOperation: operation,
    dbTable: table,
    dbDuration: duration,
    success
  };
  
  if (!success || duration > 1000) {
    logger.warn(logData, `Database ${operation} on ${table}`);
  } else {
    logger.debug(logData, `Database ${operation} on ${table}`);
  }
};

logger.logBusinessEvent = (event, data = {}) => {
  logger.info({ businessEvent: event, ...data }, `Business event: ${event}`);
};

// Health check logging
logger.logHealthCheck = (status, checks = {}) => {
  logger.info({ healthStatus: status, checks }, 'Health check completed');
};

module.exports = logger;
module.exports.createLogger = createLogger;
