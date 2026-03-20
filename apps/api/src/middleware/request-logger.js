/**
 * Request Logger Middleware
 * Logs every HTTP request with unique request ID and performance metrics
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../services/logger');

// Configuration
const SLOW_REQUEST_THRESHOLD_MS = parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS) || 500;
const REQUEST_ID_HEADER = 'x-request-id';
const REQUEST_ID_RESPONSE_HEADER = 'x-request-id';

// In-memory store for active requests (for metrics)
const activeRequests = new Map();

// Request ID middleware - runs first
const requestIdMiddleware = (req, res, next) => {
  // Get or generate request ID
  const requestId = req.get(REQUEST_ID_HEADER) || uuidv4();
  
  // Attach to request object
  req.id = requestId;
  req.requestId = requestId;
  
  // Add to response headers
  res.setHeader(REQUEST_ID_RESPONSE_HEADER, requestId);
  
  // Store start time
  req.startTime = Date.now();
  
  // Add request ID to logger context
  req.log = logger.withRequest(requestId);
  
  next();
};

// Main request logging middleware
const requestLoggerMiddleware = (req, res, next) => {
  // Skip logging for certain paths
  const skipPaths = ['/health', '/health/ready', '/health/live', '/metrics', '/favicon.ico'];
  if (skipPaths.includes(req.path)) {
    return next();
  }
  
  // Track active request
  const requestKey = `${req.method}:${req.path}:${req.id}`;
  activeRequests.set(requestKey, { start: Date.now(), id: req.id });
  
  // Capture original end function
  const originalEnd = res.end;
  
  res.end = function(chunk, encoding) {
    // Calculate duration
    const duration = Date.now() - req.startTime;
    const durationMs = parseFloat(duration);
    
    // Remove from active requests
    activeRequests.delete(requestKey);
    
    // Prepare log data
    const logData = {
      requestId: req.id,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl || req.url,
      path: req.path,
      route: req.route?.path || null,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      responseTime: durationMs,
      responseTimeMs: durationMs,
      ip: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      contentLength: parseInt(res.get('content-length') || 0),
      referer: req.get('referer') || req.get('referrer') || null,
      protocol: req.protocol,
      httpVersion: req.httpVersion,
      query: Object.keys(req.query || {}).length,
      params: Object.keys(req.params || {}).length
    };
    
    // Add user info if authenticated
    if (req.user) {
      logData.userId = req.user.id;
      logData.userRole = req.user.role;
      logData.userEmail = req.user.email;
    }
    
    // Add custom request context if available
    if (req.loggingContext) {
      Object.assign(logData, req.loggingContext);
    }
    
    // Determine log level based on status and duration
    let logLevel = 'info';
    let logMessage = 'Request completed';
    
    if (res.statusCode >= 500) {
      logLevel = 'error';
      logMessage = 'Request completed with server error';
    } else if (res.statusCode >= 400) {
      logLevel = 'warn';
      logMessage = 'Request completed with client error';
    }
    
    if (durationMs > SLOW_REQUEST_THRESHOLD_MS) {
      logLevel = 'warn';
      logMessage = 'Slow request detected';
      logData.slowRequest = true;
      logData.threshold = SLOW_REQUEST_THRESHOLD_MS;
      logData.exceededBy = durationMs - SLOW_REQUEST_THRESHOLD_MS;
    }
    
    // Log the request
    if (logLevel === 'error') {
      logger.error(logData, logMessage);
    } else if (logLevel === 'warn') {
      logger.warn(logData, logMessage);
    } else {
      logger.info(logData, logMessage);
    }
    
    // Call original end
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Add context to request (call from routes)
const addRequestContext = (req, context) => {
  req.loggingContext = { ...req.loggingContext, ...context };
};

// Get active request count
const getActiveRequestCount = () => activeRequests.size;

// Get slow requests (older than threshold)
const getSlowRequests = () => {
  const now = Date.now();
  const slowRequests = [];
  
  for (const [key, value] of activeRequests) {
    const duration = now - value.start;
    if (duration > SLOW_REQUEST_THRESHOLD_MS) {
      slowRequests.push({
        key,
        requestId: value.id,
        durationMs: duration,
        startedAt: new Date(value.start).toISOString()
      });
    }
  }
  
  return slowRequests;
};

// Request logging stats
const getRequestStats = () => ({
  activeRequests: activeRequests.size,
  slowRequests: getSlowRequests().length,
  threshold: SLOW_REQUEST_THRESHOLD_MS
});

module.exports = {
  requestIdMiddleware,
  requestLoggerMiddleware,
  addRequestContext,
  getActiveRequestCount,
  getSlowRequests,
  getRequestStats,
  REQUEST_ID_HEADER,
  REQUEST_ID_RESPONSE_HEADER
};
