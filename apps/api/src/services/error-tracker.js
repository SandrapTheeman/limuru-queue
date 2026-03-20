/**
 * Error Tracker Service
 * Captures and tracks unhandled exceptions and errors
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Error storage configuration
const ERROR_LOG_DIR = process.env.ERROR_LOG_DIR || './logs';
const MAX_ERRORS_IN_MEMORY = parseInt(process.env.MAX_ERRORS_IN_MEMORY) || 1000;
const ERROR_FILE_ROTATION_SIZE = 10 * 1024 * 1024; // 10MB

// In-memory error store for quick access
const errorStore = {
  errors: [],
  stats: {
    totalErrors: 0,
    errorsByType: {},
    errorsByEndpoint: {},
    errorsLastHour: 0,
    criticalErrors: 0
  }
};

// Error frequency tracker (for rate limiting alerts)
const errorFrequency = {
  windowMs: 60000, // 1 minute window
  maxErrors: 10,   // Max errors per window
  recentErrors: []
};

// Ensure error log directory exists
const ensureErrorLogDir = () => {
  if (!fs.existsSync(ERROR_LOG_DIR)) {
    fs.mkdirSync(ERROR_LOG_DIR, { recursive: true });
  }
};

// Get current error log file path
const getErrorLogFile = () => {
  const date = new Date().toISOString().split('T')[0];
  return path.join(ERROR_LOG_DIR, `errors-${date}.log`);
};

// Write error to file
const writeErrorToFile = (errorLog) => {
  try {
    ensureErrorLogDir();
    const filePath = getErrorLogFile();
    const line = JSON.stringify(errorLog) + '\n';
    
    // Check file size for rotation
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size > ERROR_FILE_ROTATION_SIZE) {
        // Rotate file
        const rotatedPath = filePath.replace('.log', `-${Date.now()}.log`);
        fs.renameSync(filePath, rotatedPath);
      }
    }
    
    fs.appendFileSync(filePath, line);
  } catch (err) {
    console.error('Failed to write error to file:', err);
  }
};

// Update error statistics
const updateStats = (errorLog) => {
  errorStore.stats.totalErrors++;
  
  // By type
  const errorType = errorLog.errorType || 'UnknownError';
  errorStore.stats.errorsByType[errorType] = 
    (errorStore.stats.errorsByType[errorType] || 0) + 1;
  
  // By endpoint
  if (errorLog.endpoint) {
    errorStore.stats.errorsByEndpoint[errorLog.endpoint] =
      (errorStore.stats.errorsByEndpoint[errorLog.endpoint] || 0) + 1;
  }
  
  // Critical errors
  if (errorLog.severity === 'critical' || errorLog.statusCode >= 500) {
    errorStore.stats.criticalErrors++;
  }
  
  // Last hour errors (approximate)
  const oneHourAgo = Date.now() - 3600000;
  errorStore.stats.errorsLastHour = errorStore.errors.filter(
    e => e.timestamp > oneHourAgo
  ).length;
};

// Track error frequency
const isErrorSpamming = () => {
  const now = Date.now();
  const windowStart = now - errorFrequency.windowMs;
  
  // Clean old errors from window
  errorFrequency.recentErrors = errorFrequency.recentErrors.filter(
    t => t > windowStart
  );
  
  return errorFrequency.recentErrors.length >= errorFrequency.maxErrors;
};

// Add error to frequency tracker
const trackErrorFrequency = () => {
  errorFrequency.recentErrors.push(Date.now());
};

// Create error log entry
const createErrorLog = (error, context = {}) => {
  const errorLog = {
    id: require('crypto').randomUUID(),
    timestamp: new Date().toISOString(),
    errorType: error.constructor?.name || 'Error',
    message: error.message,
    stack: error.stack,
    code: error.code,
    statusCode: context.statusCode || 500,
    severity: context.severity || 'error',
    requestId: context.requestId || null,
    userId: context.userId || null,
    userEmail: context.userEmail || null,
    ip: context.ip || null,
    method: context.method || null,
    endpoint: context.endpoint || null,
    userAgent: context.userAgent || null,
    service: 'hospital-queue-api',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '2.0.0',
    additionalContext: context.additionalContext || {}
  };
  
  return errorLog;
};

// Main error capture function
const captureError = (error, context = {}) => {
  // Check for error spam
  if (isErrorSpamming()) {
    logger.error({
      msg: 'Error spam detected',
      errorCount: errorFrequency.recentErrors.length,
      windowMs: errorFrequency.windowMs
    });
  }
  
  // Create error log
  const errorLog = createErrorLog(error, context);
  
  // Update statistics
  updateStats(errorLog);
  
  // Track frequency
  trackErrorFrequency();
  
  // Add to in-memory store
  errorStore.errors.unshift(errorLog);
  if (errorStore.errors.length > MAX_ERRORS_IN_MEMORY) {
    errorStore.errors.pop();
  }
  
  // Write to file
  writeErrorToFile(errorLog);
  
  // Log to application logger
  logger.logError(error, context);
  
  return errorLog;
};

// Capture unhandled exception
const captureUnhandledException = (error, origin = 'unhandledException') => {
  const context = {
    severity: 'critical',
    origin,
    statusCode: 500
  };
  
  return captureError(error, context);
};

// Capture unhandled promise rejection
const captureUnhandledRejection = (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  const context = {
    severity: 'critical',
    origin: 'unhandledRejection',
    statusCode: 500
  };
  
  return captureError(error, context);
};

// Get recent errors
const getRecentErrors = (limit = 50, filters = {}) => {
  let errors = [...errorStore.errors];
  
  // Apply filters
  if (filters.type) {
    errors = errors.filter(e => e.errorType === filters.type);
  }
  if (filters.severity) {
    errors = errors.filter(e => e.severity === filters.severity);
  }
  if (filters.endpoint) {
    errors = errors.filter(e => e.endpoint === filters.endpoint);
  }
  if (filters.since) {
    const sinceDate = new Date(filters.since).getTime();
    errors = errors.filter(e => new Date(e.timestamp).getTime() > sinceDate);
  }
  
  return errors.slice(0, limit);
};

// Get error statistics
const getErrorStats = () => {
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  const oneDayAgo = now - 86400000;
  
  // Calculate errors in different windows
  const errorsLastHour = errorStore.errors.filter(
    e => new Date(e.timestamp).getTime() > oneHourAgo
  ).length;
  
  const errorsLastDay = errorStore.errors.filter(
    e => new Date(e.timestamp).getTime() > oneDayAgo
  ).length;
  
  // Calculate error rate per minute
  const errorRatePerMinute = errorsLastHour / 60;
  
  // Get top error types
  const topErrorTypes = Object.entries(errorStore.stats.errorsByType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([type, count]) => ({ type, count }));
  
  // Get top error endpoints
  const topErrorEndpoints = Object.entries(errorStore.stats.errorsByEndpoint)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([endpoint, count]) => ({ endpoint, count }));
  
  return {
    totalErrors: errorStore.stats.totalErrors,
    errorsLastHour,
    errorsLastDay,
    errorRatePerMinute: parseFloat(errorRatePerMinute.toFixed(4)),
    criticalErrors: errorStore.stats.criticalErrors,
    isSpamming: isErrorSpamming(),
    topErrorTypes,
    topErrorEndpoints,
    inMemoryCount: errorStore.errors.length,
    inMemoryLimit: MAX_ERRORS_IN_MEMORY
  };
};

// Clear old errors from memory
const clearOldErrors = (maxAge = 86400000) => {
  const cutoff = Date.now() - maxAge;
  const beforeCount = errorStore.errors.length;
  
  errorStore.errors = errorStore.errors.filter(
    e => new Date(e.timestamp).getTime() > cutoff
  );
  
  const cleared = beforeCount - errorStore.errors.length;
  
  if (cleared > 0) {
    logger.info({ msg: 'Cleared old errors from memory', count: cleared });
  }
  
  return cleared;
};

// Export error tracking data
const exportErrors = (format = 'json') => {
  const data = {
    exportedAt: new Date().toISOString(),
    stats: getErrorStats(),
    errors: errorStore.errors
  };
  
  if (format === 'csv') {
    // Convert to CSV format
    const headers = [
      'timestamp', 'errorType', 'message', 'statusCode', 'severity',
      'requestId', 'endpoint', 'method'
    ];
    const rows = errorStore.errors.map(e => 
      headers.map(h => JSON.stringify(e[h] || '')).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }
  
  return JSON.stringify(data, null, 2);
};

// Initialize error handlers
const initErrorHandlers = () => {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    captureUnhandledException(error, 'uncaughtException');
    
    // Give time to write error before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    captureUnhandledRejection(reason, promise);
  });
  
  // Periodic cleanup of old errors
  setInterval(() => clearOldErrors(), 3600000); // Every hour
  
  logger.info({ msg: 'Error handlers initialized' });
};

// Auto-cleanup old errors periodically
setInterval(() => clearOldErrors(), 3600000);

module.exports = {
  captureError,
  captureUnhandledException,
  captureUnhandledRejection,
  getRecentErrors,
  getErrorStats,
  clearOldErrors,
  exportErrors,
  initErrorHandlers,
  createErrorLog,
  ensureErrorLogDir
};
