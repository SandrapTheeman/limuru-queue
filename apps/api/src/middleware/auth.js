const jwt = require('jsonwebtoken');

const tokenBlacklist = new Set();

const authMiddleware = (req, res, next) => {
  // Exact match paths (no auth needed)
  const publicPaths = [
    '/health',
    '/api',
    '/api/departments',
    '/api/queue/stats',
    '/metrics'
  ];
  
  // Prefix match paths (no auth needed)
  const publicPrefixes = [
    '/api/auth/login',
    '/api/auth/register'
  ];

  // Check exact matches first
  if (publicPaths.includes(req.path)) {
    return next();
  }
  
  // Check prefix matches
  if (publicPrefixes.some(prefix => req.path.startsWith(prefix))) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required',
      message: 'No token provided'
    });
  }

  const token = authHeader.substring(7);
  
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token invalidated',
      message: 'Token has been logged out'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      department: decoded.department
    };
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired',
        message: 'Please login again'
      });
    }
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid token',
      message: 'Token is not valid'
    });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required'
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied',
        message: `This action requires one of these roles: ${roles.join(', ')}`
      });
    }
    next();
  };
};

const blacklistToken = (token) => {
  tokenBlacklist.add(token);
};

module.exports = { authMiddleware, requireRole, blacklistToken };
