// Security and Performance Middleware for Limuru Cottage Hospital Queue System

// =====================================================
// PERFORMANCE: In-Memory Cache
// =====================================================
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
  }

  set(key, value, ttlSeconds = 30) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
    this.ttl.set(key, ttlSeconds * 1000);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    const ttl = this.ttl.get(key);
    if (Date.now() - item.timestamp > ttl) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }

    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  clear() {
    this.cache.clear();
    this.ttl.clear();
  }

  // Invalidate cache when data changes
  invalidatePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.delete(key);
      }
    }
  }
}

// Global cache instances with different TTLs
const departmentCache = new MemoryCache();
const queueSummaryCache = new MemoryCache();
const settingsCache = new MemoryCache();

// Cache TTL configurations (in seconds)
const CACHE_TTL = {
  DEPARTMENTS: 300,        // 5 minutes - departments rarely change
  QUEUE_SUMMARY: 10,       // 10 seconds - queue changes frequently
  HEALTH_CHECK: 5,        // 5 seconds
  SETTINGS: 60,           // 1 minute
  DOCTORS: 60,            // 1 minute
};

// =====================================================
// PERFORMANCE: Generate ETag
// =====================================================
function generateETag(data) {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  return '"' + hash + '"';
}

// =====================================================
// PERFORMANCE: Cache Middleware for GET Requests
// =====================================================
const cacheMiddleware = (cache, ttl) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = req.originalUrl || req.url;
    const cachedData = cache.get(cacheKey);

    // Check for If-None-Match header (ETag support)
    const clientETag = req.headers['if-none-match'];

    if (cachedData) {
      const etag = generateETag(cachedData);

      // If client has same ETag, return 304 Not Modified
      if (clientETag === etag) {
        res.status(304);
        res.set({
          'ETag': etag,
          'Cache-Control': 'public, max-age=' + ttl
        });
        return res.end();
      }

      // Return cached data with headers
      res.set({
        'ETag': etag,
        'Cache-Control': 'public, max-age=' + ttl + ', stale-while-revalidate=' + (ttl * 2),
        'X-Cache': 'HIT'
      });
      return res.json(cachedData);
    }

    // Store original json method to wrap caching
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      // Cache the response
      cache.set(cacheKey, data, ttl);
      
      // Add caching headers
      const etag = generateETag(data);
      res.set({
        'ETag': etag,
        'Cache-Control': 'public, max-age=' + ttl + ', stale-while-revalidate=' + (ttl * 2),
        'X-Cache': 'MISS'
      });

      return originalJson(data);
    };

    next();
  };
};

// =====================================================
// PERFORMANCE: Response Compression (Manual)
// =====================================================
const compressResponse = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Skip compression for non-GET or already compressed
    if (req.method !== 'GET' || res.get('Content-Encoding')) {
      return originalSend.call(this, data);
    }

    // Check if client accepts compression
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    // Simple compression for JSON responses
    if (acceptEncoding.includes('gzip') && typeof data === 'string' && data.length > 1024) {
      const zlib = require('zlib');
      const compressed = zlib.gzipSync(Buffer.from(data));
      
      res.set('Content-Encoding', 'gzip');
      res.set('X-Compressed', 'true');
      res.set('Content-Length', compressed.length);
      
      return originalSend.call(this, compressed);
    }

    return originalSend.call(this, data);
  };
  
  next();
};

// =====================================================
// SECURITY: Rate Limiting
// =====================================================
class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.loginAttempts = new Map();
  }

  // Clean up old entries periodically
  cleanup() {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window

    for (const [key, data] of this.requests.entries()) {
      if (now - data.timestamp > windowMs) {
        this.requests.delete(key);
      }
    }

    for (const [key, data] of this.loginAttempts.entries()) {
      if (now - data.timestamp > 900000) { // 15 minutes for login attempts
        this.loginAttempts.delete(key);
      }
    }
  }

  // Check rate limit
  check(key, maxRequests = 100, windowMs = 60000) {
    const now = Date.now();
    const requestData = this.requests.get(key) || { count: 0, timestamp: now };

    // Reset if outside window
    if (now - requestData.timestamp > windowMs) {
      requestData.count = 0;
      requestData.timestamp = now;
    }

    requestData.count++;
    this.requests.set(key, requestData);

    const remaining = Math.max(0, maxRequests - requestData.count);
    const resetTime = Math.ceil((requestData.timestamp + windowMs - now) / 1000);

    return {
      allowed: requestData.count <= maxRequests,
      remaining: remaining,
      reset: resetTime,
      total: requestData.count
    };
  }

  // Check login attempts (stricter limits)
  checkLoginAttempt(identifier) {
    const now = Date.now();
    const key = 'login:' + identifier;
    const maxAttempts = 5;
    const windowMs = 900000; // 15 minutes

    const attemptData = this.loginAttempts.get(key) || { count: 0, timestamp: now, locked: false };

    // Reset if outside window
    if (now - attemptData.timestamp > windowMs) {
      attemptData.count = 0;
      attemptData.timestamp = now;
      attemptData.locked = false;
    }

    if (attemptData.locked) {
      const retryAfter = Math.ceil((attemptData.timestamp + windowMs - now) / 1000);
      return {
        allowed: false,
        locked: true,
        retryAfter: retryAfter,
        message: 'Account temporarily locked due to too many failed attempts. Try again later.'
      };
    }

    attemptData.count++;
    this.loginAttempts.set(key, attemptData);

    if (attemptData.count >= maxAttempts) {
      attemptData.locked = true;
      return {
        allowed: false,
        locked: true,
        retryAfter: Math.ceil(windowMs / 1000),
        message: 'Too many failed login attempts. Account locked for 15 minutes.'
      };
    }

    return {
      allowed: true,
      attemptsRemaining: maxAttempts - attemptData.count
    };
  }

  // Reset login attempts on successful login
  resetLoginAttempt(identifier) {
    this.loginAttempts.delete('login:' + identifier);
  }
}

const rateLimiter = new RateLimiter();

// Clean up rate limit data every minute
setInterval(() => rateLimiter.cleanup(), 60000);

// Rate limiting middleware
const rateLimitMiddleware = (options = {}) => {
  const maxRequests = options.maxRequests || 100;
  const windowMs = options.windowMs || 60000;

  return (req, res, next) => {
    // Skip for health checks
    if (req.path === '/health') {
      return next();
    }

    const identifier = req.ip || req.connection.remoteAddress;
    const result = rateLimiter.check(identifier, maxRequests, windowMs);

    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': result.reset
    });

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Try again in ' + result.reset + ' seconds.',
        retryAfter: result.reset
      });
    }

    next();
  };
};

// Login rate limiting middleware
const loginRateLimitMiddleware = (req, res, next) => {
  const identifier = req.body?.email || req.body?.phone || req.ip;
  const result = rateLimiter.checkLoginAttempt(identifier);

  if (!result.allowed) {
    res.set('Retry-After', result.retryAfter);
    return res.status(429).json({
      error: 'Too many login attempts',
      message: result.message,
      retryAfter: result.retryAfter
    });
  }

  // Attach check function to req for use after authentication
  req.rateLimitLoginCheck = function() { return rateLimiter.checkLoginAttempt(identifier); };
  req.rateLimitLoginReset = function() { return rateLimiter.resetLoginAttempt(identifier); };

  next();
};

// =====================================================
// SECURITY: Security Headers Middleware
// =====================================================
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.set('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection (legacy but still useful)
  res.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' data:;");
  
  // Strict Transport Security (only in production)
  if (process.env.NODE_ENV === 'production') {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Cache control for sensitive pages
  if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/auth')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }

  next();
};

// =====================================================
// SECURITY: Input Validation & Sanitization
// =====================================================
const inputValidation = (req, res, next) => {
  // Check for common injection patterns
  const sanitizeValue = (value) => {
    if (typeof value !== 'string') return value;
    
    // Remove potential SQL injection patterns (basic)
    let sanitized = value.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi, '');
    
    // Remove script tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove event handlers
    sanitized = sanitized.replace(/\bon\w+\s*=/gi, '');
    
    return sanitized;
  };

  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeValue(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(v => sanitizeValue(v));
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  // Sanitize body
  if (req.body && Object.keys(req.body).length > 0) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && Object.keys(req.query).length > 0) {
    req.query = sanitizeObject(req.query);
  }

  // Validate content length
  const maxBodySize = 1024 * 100; // 100KB
  const contentLength = parseInt(req.headers['content-length'] || 0);
  
  if (contentLength > maxBodySize) {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request body is too large'
    });
  }

  // Check for malformed JSON (basic check)
  if (req.headers['content-type']?.includes('application/json')) {
    try {
      if (req.body && typeof req.body === 'string') {
        JSON.parse(req.body);
      }
    } catch (e) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid JSON in request body'
      });
    }
  }

  next();
};

// =====================================================
// SECURITY: Request Size Validation
// =====================================================
const requestSizeLimit = (maxSize) => {
  maxSize = maxSize || '100kb';
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || 0);
    const maxBytes = parseSize(maxSize);

    if (contentLength > maxBytes) {
      return res.status(413).json({
        error: 'Payload Too Large',
        message: 'Request body exceeds maximum size of ' + maxSize
      });
    }

    next();
  };
};

function parseSize(size) {
  const units = { 'b': 1, 'kb': 1024, 'mb': 1024 * 1024, 'gb': 1024 * 1024 * 1024 };
  const match = size.match(/^(\d+)(b|kb|mb|gb)$/i);
  if (!match) return 100 * 1024;
  return parseInt(match[1]) * units[match[2].toLowerCase()];
}

// =====================================================
// SECURITY: Token Refresh Mechanism
// =====================================================
const refreshTokens = new Map(); // In production, use Redis or database

const generateRefreshToken = (userId) => {
  const crypto = require('crypto');
  const refreshToken = crypto.randomBytes(64).toString('hex');
  
  // Store refresh token (expires in 7 days)
  refreshTokens.set(refreshToken, {
    userId: userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
  });

  // Clean up expired tokens periodically
  if (refreshTokens.size > 1000) {
    const now = Date.now();
    for (const [token, data] of refreshTokens.entries()) {
      if (data.expiresAt < now) {
        refreshTokens.delete(token);
      }
    }
  }

  return refreshToken;
};

const verifyRefreshToken = (token) => {
  const data = refreshTokens.get(token);
  
  if (!data) {
    return null;
  }

  if (data.expiresAt < Date.now()) {
    refreshTokens.delete(token);
    return null;
  }

  return data.userId;
};

const revokeRefreshToken = (token) => {
  return refreshTokens.delete(token);
};

// Token refresh endpoint handler
const handleTokenRefresh = (refreshToken) => {
  const userId = verifyRefreshToken(refreshToken);
  
  if (!userId) {
    return { error: 'Invalid or expired refresh token' };
  }

  // Generate new access token - get secret from environment or use default
  const jwt = require('jsonwebtoken');
  const jwtSecret = process.env.JWT_SECRET || 'default-secret';
  const newAccessToken = jwt.sign({ id: userId.id, role: userId.role }, jwtSecret, {
    expiresIn: '24h',
    issuer: 'limuru-hospital-queue'
  });
  
  // Optionally rotate refresh token
  revokeRefreshToken(refreshToken);
  const newRefreshToken = generateRefreshToken(userId);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  };
};

// =====================================================
// Export all middleware and utilities
// =====================================================
module.exports = {
  // Caching
  MemoryCache,
  departmentCache,
  queueSummaryCache,
  settingsCache,
  CACHE_TTL,
  cacheMiddleware,
  generateETag,
  compressResponse,

  // Rate Limiting
  RateLimiter,
  rateLimiter,
  rateLimitMiddleware,
  loginRateLimitMiddleware,

  // Security Headers
  securityHeaders,

  // Input Validation
  inputValidation,
  requestSizeLimit,

  // Token Management
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  handleTokenRefresh,
  refreshTokens,

  // Database Optimization
  createOptimizedQuery: (tableName, conditions, orderBy, limit) => {
    return { tableName, conditions, orderBy, limit };
  }
};
