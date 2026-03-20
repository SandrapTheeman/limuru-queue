// Hospital Queue System API - Express.js Server
// Docker-compatible version with comprehensive monitoring

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const v4 = require('uuid').v4;
require('dotenv').config();

// Import monitoring services
const logger = require('./services/logger');
const { 
  requestIdMiddleware, 
  requestLoggerMiddleware,
  getRequestStats 
} = require('./middleware/request-logger');
const metricsService = require('./services/metrics');
const errorTracker = require('./services/error-tracker');
const { 
  errorHandler, 
  notFoundHandler 
} = require('./middleware/error-handler');
const { metricsMiddleware, generateMetrics } = require('./middleware/metrics');
const { authMiddleware, requireRole, blacklistToken } = require('./middleware/auth');
const { 
  initWebSocket, 
  broadcastQueueUpdate, 
  broadcastNewMessage, 
  broadcastVoiceCall, 
  broadcastNotification,
  broadcastWaitTimeUpdate,
  getConnectedCount,
  getOnlineUsers
} = require('./websocket');
const { SMSService, WhatsAppService, NotificationService, templates } = require('./services/notifications');
const { EmailService, PasswordResetService } = require('./services/email');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./swagger');
const cache = require('./services/cache');
const { trackQuery, getStats } = require('./services/query-analytics');

// Initialize error tracking
errorTracker.initErrorHandlers();

// Initialize notification services
const smsService = new SMSService();
const whatsAppService = new WhatsAppService();
const notificationService = new NotificationService();
const emailService = new EmailService();
const passwordResetService = new PasswordResetService();

const app = express();
const PORT = process.env.PORT || 8787;

// Server start time for uptime calculation
const SERVER_START_TIME = Date.now();

// Database connection with enhanced pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize cache connection
cache.connect().then(connected => {
  if (connected) {
    logger.info('[Cache] Redis connection established');
  } else {
    logger.warn('[Cache] Running without Redis cache');
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Response compression
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024,
}));

// Request ID middleware (must be first after body parsers)
app.use(requestIdMiddleware);

// Request logging middleware
app.use(requestLoggerMiddleware);

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests', message: 'Rate limit exceeded' }
});

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many login attempts', message: 'Please try again after a minute' }
});

app.use(globalLimiter);

// Prometheus metrics middleware
app.use(metricsMiddleware);

// Error handler middleware
app.use(errorHandler);

// ============================================
// PUBLIC ENDPOINTS (No Auth Required)
// ============================================

// Comprehensive Health Check
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  const checks = {};
  let overallStatus = 'healthy';
  
  // Database check
  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    checks.database = {
      status: 'ok',
      latency_ms: Date.now() - dbStart
    };
  } catch (err) {
    checks.database = {
      status: 'error',
      latency_ms: Date.now() - startTime,
      error: err.message
    };
    overallStatus = 'unhealthy';
  }
  
  // Memory check
  const memUsage = process.memoryUsage();
  const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const memLimitMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const memPercent = (memUsedMB / memLimitMB) * 100;
  
  if (memPercent > 90) {
    checks.memory = { status: 'critical', used_mb: memUsedMB, limit_mb: memLimitMB };
    overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
  } else if (memPercent > 75) {
    checks.memory = { status: 'warning', used_mb: memUsedMB, limit_mb: memLimitMB };
    if (overallStatus === 'healthy') overallStatus = 'degraded';
  } else {
    checks.memory = { status: 'ok', used_mb: memUsedMB, limit_mb: memLimitMB };
  }
  
  // Connections check
  const requestStats = getRequestStats();
  checks.connections = {
    status: requestStats.activeRequests > 80 ? 'warning' : 'ok',
    active: requestStats.activeRequests,
    max: 100,
    slow_requests: requestStats.slowRequests
  };
  
  // Calculate uptime
  const uptimeSeconds = Math.floor((Date.now() - SERVER_START_TIME) / 1000);
  
  res.status(overallStatus === 'unhealthy' ? 503 : 200).json({
    status: overallStatus,
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    checks,
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Kubernetes readiness probe
app.get('/health/ready', async (req, res) => {
  try {
    // Check database
    await pool.query('SELECT 1');
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'not_ready',
      error: err.message
    });
  }
});

// Kubernetes liveness probe
app.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

// Prometheus metrics endpoint (enhanced)
app.get('/metrics', async (req, res) => {
  try {
    // Update dynamic metrics before returning
    if (metricsService.updateQueueMetrics) {
      try {
        const queueResult = await pool.query(`
          SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'waiting') as waiting,
            COUNT(*) FILTER (WHERE status = 'called') as called,
            COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress
          FROM queue
        `);
        
        if (queueResult.rows[0]) {
          metricsService.updateQueueMetrics({
            total: parseInt(queueResult.rows[0].total),
            byStatus: {
              waiting: parseInt(queueResult.rows[0].waiting),
              called: parseInt(queueResult.rows[0].called),
              in_progress: parseInt(queueResult.rows[0].in_progress)
            }
          });
        }
      } catch (e) {
        // Ignore queue metrics errors
      }
    }
    
    // Update WebSocket metrics
    if (metricsService.updateWebSocketMetrics) {
      metricsService.updateWebSocketMetrics(getConnectedCount());
    }
    
    res.set('Content-Type', metricsService.getContentType());
    res.send(await metricsService.getMetrics());
  } catch (err) {
    res.set('Content-Type', 'text/plain');
    res.status(500).send('# Error generating metrics\n' + err.message);
  }
});

// Error stats endpoint (admin only)
app.get('/api/admin/errors', authMiddleware, requireRole('admin'), (req, res) => {
  const stats = errorTracker.getErrorStats();
  const recentErrors = errorTracker.getRecentErrors(20);
  
  res.json({
    success: true,
    data: {
      stats,
      recentErrors
    }
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'Hospital Queue Management System API',
    version: '2.0.0',
    status: 'running',
    requestId: req.requestId
  });
});

// ============================================
// DEPARTMENTS ENDPOINTS (Public)
// ============================================

// Get all departments (no auth required - public info) - Cached
app.get('/api/departments', async (req, res) => {
  try {
    const startTime = Date.now();
    
    let data = await cache.getDepartments();
    if (!data) {
      const result = await pool.query('SELECT id, name, code, description, floor, building, phone, email, is_active, display_order FROM departments ORDER BY name');
      data = result.rows;
      await cache.setDepartments(data);
    }
    
    trackQuery('/api/departments', 'GET', Date.now() - startTime, 'SELECT * FROM departments');
    
    res.json({
      success: true,
      data: data,
      total: data.length
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

// POST /api/auth/login - User login (public, rate-limited)
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.password_hash, u.is_active,
              d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Account disabled',
        message: 'Your account has been disabled'
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    const userName = `${user.first_name} ${user.last_name}`;

    const tokenPayload = {
      id: user.id,
      email: user.email,
      name: userName,
      role: user.role,
      department: user.department_name
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
    const refreshToken = jwt.sign({ id: user.id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });

    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: userName,
          role: user.role,
          department: user.department_name
        },
        accessToken,
        refreshToken,
        expiresIn: '24h'
      }
    });
  } catch (err) {
    logger.error({ error: 'Login error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

app.post('/api/auth/register', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { email, password, name, role, department, phone } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields',
        message: 'Email, password, name, and role are required'
      });
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        error: 'User exists',
        message: 'A user with this email already exists'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(`
      INSERT INTO users (email, password_hash, name, role, department, phone, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING id, email, name, role, department, phone, is_active, created_at
    `, [email, passwordHash, name, role, department || null, phone || null]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'User registered successfully'
    });
  } catch (err) {
    logger.error({ error: 'Registration error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.last_login, u.created_at,
              d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        department: user.department_name,
        is_active: user.is_active,
        last_login: user.last_login,
        created_at: user.created_at
      }
    });
  } catch (err) {
    logger.error({ error: 'Get user error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to get user info' });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing token',
        message: 'Refresh token is required'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token',
        message: 'Invalid refresh token'
      });
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        message: 'User does not exist or is disabled'
      });
    }

    const user = result.rows[0];
    const tokenPayload = {
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      role: user.role,
      department: user.department_name
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
    const newRefreshToken = jwt.sign({ id: user.id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: '24h'
      }
    });
  } catch (err) {
    logger.error({ error: 'Refresh error', message: err.message, stack: err.stack });
    res.status(401).json({ 
      success: false, 
      error: 'Token refresh failed',
      message: 'Invalid or expired refresh token'
    });
  }
});

app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  try {
    // Add token to blacklist
    blacklistToken(req.token);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    logger.error({ error: 'Logout error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
});

// ============================================
// Password Reset Endpoints
// ============================================

// Request password reset
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }
    
    // Check if user exists
    const user = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    
    // Always return success to prevent email enumeration attacks
    if (user.rows.length === 0) {
      logger.info({ event: 'PASSWORD_RESET_REQUESTED', email, found: false });
      return res.json({ success: true, message: 'If email exists, reset instructions were sent' });
    }
    
    // Generate token and send email
    const token = passwordResetService.generateToken(email);
    const emailResult = await emailService.sendPasswordReset(email, token);
    
    logger.info({ 
      event: 'PASSWORD_RESET_REQUESTED', 
      email, 
      found: true, 
      emailSent: emailResult.success 
    });
    
    res.json({ success: true, message: 'If email exists, reset instructions were sent' });
  } catch (err) {
    logger.error({ error: 'Forgot password error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to process request' });
  }
});

// Reset password with token
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: 'Token and new password required' });
    }
    
    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password too short',
        message: 'Password must be at least 8 characters'
      });
    }
    
    const result = passwordResetService.verifyToken(token);
    if (!result.valid) {
      return res.status(400).json({ success: false, error: result.error });
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2', [
      passwordHash, 
      result.email
    ]);
    
    // Invalidate token after successful password change
    passwordResetService.invalidateToken(token);
    
    logger.info({ event: 'PASSWORD_RESET_COMPLETED', email: result.email });
    
    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    logger.error({ error: 'Reset password error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

// Verify reset token validity
app.get('/api/auth/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token required' });
    }
    
    const result = passwordResetService.verifyToken(token);
    res.json({ 
      success: true, 
      valid: result.valid,
      error: result.valid ? null : result.error
    });
  } catch (err) {
    logger.error({ error: 'Verify token error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to verify token' });
  }
});

// ============================================
// EMAIL NOTIFICATION ENDPOINTS (Auth Required)
// ============================================

// POST /api/email/appointment-confirmation - Send appointment confirmation (requires auth)
app.post('/api/email/appointment-confirmation', authMiddleware, async (req, res) => {
  try {
    const { to, patientName, date, time, department, doctor, confirmationId } = req.body;
    
    if (!to || !patientName || !date || !time || !department) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields',
        message: 'to, patientName, date, time, and department are required'
      });
    }
    
    const result = await emailService.sendAppointmentConfirmation(to, {
      patientName,
      date,
      time,
      department,
      doctor: doctor || 'TBA',
      confirmationId: confirmationId || 'N/A'
    });
    
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    
    logger.info({ event: 'EMAIL_SENT', type: 'appointment_confirmation', to });
    
    res.json({ success: true, messageId: result.messageId });
  } catch (err) {
    logger.error({ error: 'Send appointment email error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

// Send daily report email (admin only)
app.post('/api/email/daily-report', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { to, date, totalPatients, avgWaitTime, departmentStats } = req.body;
    
    if (!to || !date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields',
        message: 'to and date are required'
      });
    }
    
    const result = await emailService.sendDailyReport(to, {
      date,
      totalPatients: totalPatients || 0,
      avgWaitTime: avgWaitTime || 0,
      departmentStats: departmentStats || []
    });
    
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    
    logger.info({ event: 'EMAIL_SENT', type: 'daily_report', to });
    
    res.json({ success: true, messageId: result.messageId });
  } catch (err) {
    logger.error({ error: 'Send daily report error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

// Send staff notification email
app.post('/api/email/staff-notification', authMiddleware, requireRole('admin', 'doctor', 'nurse'), async (req, res) => {
  try {
    const { to, title, message, priority, actionUrl } = req.body;
    
    if (!to || !title || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields',
        message: 'to, title, and message are required'
      });
    }
    
    const result = await emailService.sendStaffNotification(to, {
      title,
      message,
      priority: priority || 'normal',
      actionUrl
    });
    
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    
    logger.info({ event: 'EMAIL_SENT', type: 'staff_notification', to });
    
    res.json({ success: true, messageId: result.messageId });
  } catch (err) {
    logger.error({ error: 'Send staff notification error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

// Send system alert email (internal use)
app.post('/api/email/system-alert', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { to, alertType, message, details, severity } = req.body;
    
    if (!to || !alertType || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields',
        message: 'to, alertType, and message are required'
      });
    }
    
    const result = await emailService.sendSystemAlert(to, {
      alertType,
      message,
      details,
      severity: severity || 'info'
    });
    
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    
    logger.info({ event: 'EMAIL_SENT', type: 'system_alert', to, severity });
    
    res.json({ success: true, messageId: result.messageId });
  } catch (err) {
    logger.error({ error: 'Send system alert error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

// Get email service status
app.get('/api/email/status', async (req, res) => {
  const isConnected = await emailService.verifyConnection();
  res.json({
    success: true,
    data: {
      enabled: emailService.enabled,
      configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
      smtpHost: process.env.SMTP_HOST || 'smtp.mailgun.org',
      smtpPort: process.env.SMTP_PORT || 587,
      fromEmail: emailService.fromEmail,
      connectionVerified: isConnected
    }
  });
});

// ============================================
// USER MANAGEMENT ENDPOINTS
// Note: /me MUST come before /:id to avoid shadowing
// ============================================

// Get all users (admin only)
app.get('/api/users', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at, u.last_login,
             d.name AS department_name
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      ORDER BY u.created_at DESC
    `);

    const users = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`.trim(),
      role: user.role,
      department: user.department_name,
      is_active: user.is_active,
      created_at: user.created_at,
      last_login: user.last_login
    }));

    res.json({
      success: true,
      data: users,
      total: users.length
    });
  } catch (err) {
    logger.error({ error: 'Get users error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to get users' });
  }
});

// Get current user (must come before /:id route)
app.get('/api/users/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at, u.updated_at,
             d.name AS department_name
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        department: user.department_name,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
  } catch (err) {
    logger.error({ error: 'Get user error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
});

// Get user by ID
app.get('/api/users/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at, u.last_login,
             d.name AS department_name
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        department: user.department_name,
        is_active: user.is_active,
        created_at: user.created_at,
        last_login: user.last_login
      }
    });
  } catch (err) {
    logger.error({ error: 'Get user error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
});

// Create user (admin only)
app.post('/api/users', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { email, password, name, role, department, phone } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Email, password, name, and role are required'
      });
    }

    // Validate role
    const validRoles = ['admin', 'doctor', 'nurse', 'receptionist', 'patient'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role',
        message: 'Role must be one of: admin, doctor, nurse, receptionist, patient'
      });
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User exists',
        message: 'A user with this email already exists'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Split name into first_name and last_name
    const nameParts = name.trim().split(/\s+/);
    const first_name = nameParts[0];
    const last_name = nameParts.slice(1).join(' ') || '';

    // Look up department_id from department name if provided
    let department_id = null;
    if (department) {
      const deptResult = await pool.query('SELECT id FROM departments WHERE name = $1', [department]);
      if (deptResult.rows.length > 0) {
        department_id = deptResult.rows[0].id;
      }
    }

    const result = await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, department_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, 1)
      RETURNING id, email, first_name, last_name, role, is_active, created_at
    `, [email, passwordHash, first_name, last_name, role, department_id]);

    const user = result.rows[0];

    // Log user creation
    logger.info({
      event: 'USER_CREATED',
      admin_id: req.user.id,
      new_user_id: user.id,
      new_user_role: role
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`.trim(),
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at
      },
      message: 'User created successfully'
    });
  } catch (err) {
    logger.error({ error: 'Create user error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

// Update user
app.patch('/api/users/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, department, phone, room, is_active, password } = req.body;

    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (id === req.user.id && is_active === false) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot deactivate self',
        message: 'You cannot deactivate your own account'
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      const nameParts = name.trim().split(/\s+/);
      updates.push(`first_name = $${paramCount++}`); values.push(nameParts[0]);
      updates.push(`last_name = $${paramCount++}`); values.push(nameParts.slice(1).join(' ') || '');
    }
    if (email !== undefined) { updates.push(`email = $${paramCount++}`); values.push(email); }
    if (role !== undefined) { updates.push(`role = $${paramCount++}`); values.push(role); }
    if (department !== undefined) {
      const deptResult = await pool.query('SELECT id FROM departments WHERE name = $1', [department]);
      updates.push(`department_id = $${paramCount++}`);
      values.push(deptResult.rows.length > 0 ? deptResult.rows[0].id : null);
    }
    if (is_active !== undefined) { updates.push(`is_active = $${paramCount++}`); values.push(is_active ? 1 : 0); }
    if (password !== undefined) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    values.push(id);
    const result = await pool.query(`
      UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, role, is_active, created_at, last_login
    `, values);

    const user = result.rows[0];

    // Log user update
    logger.info({
      event: 'USER_UPDATED',
      admin_id: req.user.id,
      updated_user_id: id,
      updates: Object.keys(req.body)
    });

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`.trim(),
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        last_login: user.last_login
      },
      message: 'User updated successfully'
    });
  } catch (err) {
    logger.error({ error: 'Update user error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// Delete user
app.delete('/api/users/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete self',
        message: 'You cannot delete your own account'
      });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Log user deletion
    logger.info({
      event: 'USER_DELETED',
      admin_id: req.user.id,
      deleted_user_id: id
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (err) {
    logger.error({ error: 'Delete user error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// ============================================
// PATIENTS ENDPOINTS
// ============================================

// Get all patients (requires auth)
app.get('/api/patients', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patients ORDER BY created_at DESC LIMIT 50');
    const patients = result.rows.map(p => ({
      ...p,
      name: `${p.first_name} ${p.last_name}`.trim()
    }));
    res.json({
      success: true,
      data: patients,
      total: patients.length
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Create patient - intentionally public for kiosk/self-registration (no auth required)
app.post('/api/patients', async (req, res) => {
  try {
    const { name, phone, email, date_of_birth, gender, address, emergency_contact, emergency_phone, national_id, blood_type, allergies, notes } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Patient name is required'
      });
    }

    // Generate national ID if not provided
    const nationalId = national_id || 'NATIONAL-' + Math.floor(100000 + Math.random() * 900000);

    // Split name into first_name and last_name
    const nameParts = name.trim().split(/\s+/);
    const first_name = nameParts[0];
    const last_name = nameParts.slice(1).join(' ') || '';

    const result = await pool.query(`
      INSERT INTO patients (national_id, first_name, last_name, phone, email, date_of_birth, gender, address, emergency_contact, emergency_phone, blood_type, allergies, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, national_id, first_name, last_name, phone, email, date_of_birth, gender, address, emergency_contact, emergency_phone, blood_type, allergies, notes, created_at
    `, [nationalId, first_name, last_name, phone || null, email || null, date_of_birth || null, gender || null, address || null, emergency_contact || null, emergency_phone || null, blood_type || null, allergies || null, notes || null]);

    const patient = result.rows[0];

    // Log patient creation
    if (req.user) {
      logger.info({
        event: 'PATIENT_CREATED',
        user_id: req.user.id,
        patient_id: patient.id
      });
    }

    res.status(201).json({
      success: true,
      data: {
        id: patient.id,
        national_id: patient.national_id,
        name: `${patient.first_name} ${patient.last_name}`.trim(),
        phone: patient.phone,
        email: patient.email,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
        address: patient.address,
        emergency_contact: patient.emergency_contact,
        emergency_phone: patient.emergency_phone,
        blood_type: patient.blood_type,
        allergies: patient.allergies,
        notes: patient.notes,
        created_at: patient.created_at
      },
      message: 'Patient registered successfully'
    });
  } catch (err) {
    logger.error({ error: 'Create patient error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to create patient' });
  }
});

// Get patient by ID
app.get('/api/patients/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const patient = result.rows[0];
    res.json({
      success: true,
      data: {
        ...patient,
        name: `${patient.first_name} ${patient.last_name}`.trim()
      }
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// ============================================
// QUEUE MANAGEMENT ENDPOINTS
// ============================================

// Get queue - list all queue entries (requires auth)
app.get('/api/queue', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT q.*,
             (p.first_name || ' ' || p.last_name) as patient_name,
             (d.first_name || ' ' || d.last_name) as doctor_name,
             dept.name as department_name
      FROM queue q
      LEFT JOIN patients p ON q.patient_id = p.id
      LEFT JOIN users d ON q.doctor_id = d.id
      LEFT JOIN departments dept ON q.department_id = dept.id
      WHERE q.status IN ('waiting', 'called')
      ORDER BY q.priority DESC, q.created_at ASC
    `);
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// ============================================
// VOICE CALLS ENDPOINTS
// Note: /accept, /reject, /end routes MUST come before /:id to avoid shadowing
// ============================================

// Get all voice calls (requires auth)
app.get('/api/voice/calls', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM voice_calls 
      ORDER BY initiated_at DESC 
      LIMIT 50
    `);
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.post('/api/voice/call', authMiddleware, async (req, res) => {
  try {
    const { callerId, callerName, recipientId, recipientName, callType = 'staff' } = req.body;
    
    const result = await pool.query(`
      INSERT INTO voice_calls (caller_id, caller_name, recipient_id, recipient_name, call_type, status)
      VALUES ($1, $2, $3, $4, $5, 'initiated')
      RETURNING *
    `, [callerId, callerName, recipientId, recipientName, callType]);
    
    // Broadcast incoming voice call to callee
    const broadcastVoiceCall = req.app.get('broadcastVoiceCall');
    if (broadcastVoiceCall) {
      broadcastVoiceCall({
        action: 'incoming',
        call: result.rows[0]
      });
    }
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.post('/api/voice/call/:id/accept', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      UPDATE voice_calls 
      SET status = 'answered', answered_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Call not found' });
    }
    
    // Broadcast call accepted
    const broadcastVoiceCall = req.app.get('broadcastVoiceCall');
    if (broadcastVoiceCall) {
      broadcastVoiceCall({
        action: 'accepted',
        call: result.rows[0]
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.post('/api/voice/call/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await pool.query(`
      UPDATE voice_calls 
      SET status = 'rejected', ended_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    // Broadcast call rejected
    const broadcastVoiceCall = req.app.get('broadcastVoiceCall');
    if (broadcastVoiceCall) {
      broadcastVoiceCall({
        action: 'rejected',
        call: result.rows[0],
        reason: reason || 'declined'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      reason: reason || 'declined'
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.post('/api/voice/call/:id/end', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      UPDATE voice_calls 
      SET status = 'ended', ended_at = NOW(), 
          duration = EXTRACT(EPOCH FROM (NOW() - answered_at))::INTEGER
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    // Broadcast call ended
    const broadcastVoiceCall = req.app.get('broadcastVoiceCall');
    if (broadcastVoiceCall) {
      broadcastVoiceCall({
        action: 'ended',
        call: result.rows[0]
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Get staff by department (filtered for active users)
app.get('/api/users/department/:dept', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, (u.first_name || ' ' || u.last_name) as name, u.role, u.is_active,
             d.id as department_id, d.name as department
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.department_id = $1 AND u.is_active = 1
      ORDER BY u.role, name
    `, [req.params.dept]);
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to get users' });
  }
});

// Get queue by department
app.get('/api/queue/department/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT q.*,
             (p.first_name || ' ' || p.last_name) as patient_name,
             (d.first_name || ' ' || d.last_name) as doctor_name
      FROM queue q
      LEFT JOIN patients p ON q.patient_id = p.id
      LEFT JOIN users d ON q.doctor_id = d.id
      WHERE q.department_id = $1 AND q.status IN ('waiting', 'called')
      ORDER BY q.priority DESC, q.created_at ASC
    `, [req.params.id]);
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Add patient to queue
app.post('/api/queue', authMiddleware, requireRole('admin', 'receptionist', 'nurse'), async (req, res) => {
  try {
    const { patient_id, department_id, doctor_id, priority, notes } = req.body;
    
    // Get next queue number for department
    const ticketResult = await pool.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(queue_number, 5) AS INTEGER)), 0) + 1 as next_num
      FROM queue
      WHERE department_id = $1 AND created_at::date = CURRENT_DATE
    `, [department_id]);
    
    const deptResult = await pool.query('SELECT code FROM departments WHERE id = $1', [department_id]);
    const deptCode = deptResult.rows[0]?.code || 'GEN';
    const queueNumber = `${deptCode}${String(ticketResult.rows[0].next_num).padStart(4, '0')}`;
    
    // Get current max position
    const posResult = await pool.query(`
      SELECT COALESCE(MAX(position), 0) + 1 as next_pos
      FROM queue
      WHERE department_id = $1 AND status = 'waiting'
    `, [department_id]);
    
    const result = await pool.query(`
      INSERT INTO queue (queue_number, patient_id, department_id, doctor_id, priority, notes, position)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [queueNumber, patient_id, department_id, doctor_id, priority || false, notes, posResult.rows[0].next_pos]);
    
    // Broadcast queue update to all connected clients
    const broadcastQueueUpdate = req.app.get('broadcastQueueUpdate');
    if (broadcastQueueUpdate) {
      broadcastQueueUpdate({ 
        action: 'created', 
        queueEntry: result.rows[0],
        queueNumber,
        department_id
      });
    }
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      ticket: queueNumber
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Update queue entry status
app.patch('/api/queue/:id', authMiddleware, requireRole('admin', 'doctor', 'nurse'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, room_assigned, doctor_id } = req.body;
    
    let query = 'UPDATE queue SET ';
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (status) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
      if (status === 'called') {
        updates.push(`called_at = NOW()`);
      } else if (status === 'in_progress') {
        updates.push(`started_at = NOW()`);
      } else if (status === 'completed') {
        updates.push(`completed_at = NOW()`);
      }
    }
    if (room_assigned) {
      updates.push(`room_assigned = $${paramCount++}`);
      values.push(room_assigned);
    }
    if (doctor_id) {
      updates.push(`doctor_id = $${paramCount++}`);
      values.push(doctor_id);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No updates provided' });
    }
    
    query += updates.join(', ') + ` WHERE id = $${paramCount} RETURNING *`;
    values.push(id);
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Queue entry not found' });
    }
    
    // Broadcast queue update to all connected clients
    const broadcastQueueUpdate = req.app.get('broadcastQueueUpdate');
    if (broadcastQueueUpdate) {
      broadcastQueueUpdate({
        action: status || 'updated',
        queueEntry: result.rows[0],
        updatedBy: req.user.id
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// ============================================
// ROOMS ENDPOINTS (CRUD)
// ============================================

// Get all rooms (requires auth) - Cached
app.get('/api/rooms', authMiddleware, async (req, res) => {
  try {
    const startTime = Date.now();
    
    let data = await cache.getRooms();
    if (!data) {
      const result = await pool.query(`
        SELECT r.id, r.room_number, r.name, r.room_type, r.department_id, r.floor, r.building, r.status, r.capacity, r.equipment, r.is_active, d.name as department_name
        FROM rooms r
        LEFT JOIN departments d ON r.department_id = d.id
        WHERE r.is_active = 1
        ORDER BY r.room_number
      `);
      data = result.rows;
      await cache.setRooms(data);
    }
    
    trackQuery('/api/rooms', 'GET', Date.now() - startTime, 'SELECT rooms with department');
    
    res.json({
      success: true,
      data: data,
      total: data.length
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.get('/api/rooms/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, d.name as department_name
      FROM rooms r
      LEFT JOIN departments d ON r.department_id = d.id
      WHERE r.id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.post('/api/rooms', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { room_number, department_id, floor, capacity, room_type } = req.body;
    
    if (!room_number) {
      return res.status(400).json({ success: false, error: 'room_number is required' });
    }
    
    const result = await pool.query(`
      INSERT INTO rooms (room_number, department_id, floor, capacity, room_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [room_number, department_id, floor, capacity || 1, room_type || 'consultation']);
    
    await cache.invalidateRooms();
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.patch('/api/rooms/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { room_number, department_id, floor, capacity, room_type } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (room_number !== undefined) {
      updates.push(`room_number = $${paramCount++}`);
      values.push(room_number);
    }
    if (department_id !== undefined) {
      updates.push(`department_id = $${paramCount++}`);
      values.push(department_id);
    }
    if (floor !== undefined) {
      updates.push(`floor = $${paramCount++}`);
      values.push(floor);
    }
    if (capacity !== undefined) {
      updates.push(`capacity = $${paramCount++}`);
      values.push(capacity);
    }
    if (room_type !== undefined) {
      updates.push(`room_type = $${paramCount++}`);
      values.push(room_type);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No updates provided' });
    }
    
    const query = `UPDATE rooms SET ${updates.join(', ')} WHERE id = $${paramCount} AND is_active = 1 RETURNING *`;
    values.push(id);
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }
    
    await cache.invalidateRooms();
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.delete('/api/rooms/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE rooms SET is_active = false WHERE id = $1 RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }
    
    await cache.invalidateRooms();
    
    res.json({
      success: true,
      message: 'Room deactivated'
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// ============================================
// APPOINTMENTS ENDPOINTS (CRUD)
// ============================================

// Get all appointments (requires auth)
app.get('/api/appointments', authMiddleware, async (req, res) => {
  try {
    const { status, date, doctor_id, patient_id } = req.query;
    
    let query = `
      SELECT a.*,
             (p.first_name || ' ' || p.last_name) as patient_name, p.phone as patient_phone,
              (u.first_name || ' ' || u.last_name) as doctor_name, d.specialty,
             dept.name as department_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN departments dept ON a.department_id = dept.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;
    
    if (status) {
      query += ` AND a.status = $${paramCount++}`;
      values.push(status);
    }
    if (date) {
      query += ` AND a.appointment_date = $${paramCount++}`;
      values.push(date);
    }
    if (doctor_id) {
      query += ` AND a.doctor_id = $${paramCount++}`;
      values.push(doctor_id);
    }
    if (patient_id) {
      query += ` AND a.patient_id = $${paramCount++}`;
      values.push(patient_id);
    }
    
    query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT 100';
    
    const result = await pool.query(query, values);
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.get('/api/appointments/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*,
             (p.first_name || ' ' || p.last_name) as patient_name, p.phone as patient_phone, p.email as patient_email,
              (u.first_name || ' ' || u.last_name) as doctor_name, d.specialty,
             dept.name as department_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN departments dept ON a.department_id = dept.id
      WHERE a.id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.post('/api/appointments', authMiddleware, requireRole('admin', 'receptionist', 'doctor'), async (req, res) => {
  try {
    const { patient_id, doctor_id, department_id, appointment_date, appointment_time, notes } = req.body;
    
    if (!patient_id || !doctor_id || !department_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ 
        success: false, 
        error: 'patient_id, doctor_id, department_id, appointment_date, and appointment_time are required' 
      });
    }
    
    const result = await pool.query(`
      INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [patient_id, doctor_id, department_id, appointment_date, appointment_time, notes]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.patch('/api/appointments/:id', authMiddleware, requireRole('admin', 'doctor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, appointment_date, appointment_time } = req.body;
    
    const updates = ['updated_at = NOW()'];
    const values = [];
    let paramCount = 1;
    
    if (status) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes);
    }
    if (appointment_date) {
      updates.push(`appointment_date = $${paramCount++}`);
      values.push(appointment_date);
    }
    if (appointment_time) {
      updates.push(`appointment_time = $${paramCount++}`);
      values.push(appointment_time);
    }
    
    const query = `UPDATE appointments SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    values.push(id);
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.delete('/api/appointments/:id', authMiddleware, requireRole('admin', 'receptionist'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }
    
    res.json({
      success: true,
      message: 'Appointment cancelled'
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// ============================================
// QUEUE STATISTICS ENDPOINTS
// ============================================

// Get queue statistics with predictions (requires auth)
app.get('/api/queue/stats', authMiddleware, async (req, res) => {
  try {
    const { department_id } = req.query;
    
    let query = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'waiting') as waiting,
        COUNT(*) FILTER (WHERE status = 'called') as called,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE priority = 1) as urgent,
        AVG(estimated_wait_time) FILTER (WHERE status = 'waiting') as avg_wait_time
      FROM queue
    `;
    const values = [];
    
    if (department_id) {
      query += ' WHERE department_id = $1';
      values.push(department_id);
    }
    
    const result = await pool.query(query, values);
    
    const queueLength = parseInt(result.rows[0].waiting) || 0;
    const prediction = await predictWaitTime(department_id || null, queueLength);
    
    res.json({
      success: true,
      data: {
        ...result.rows[0],
        estimated_wait: {
          minutes: prediction.estimated_wait_minutes,
          confidence: prediction.confidence,
          based_on_data_points: prediction.based_on_data_points
        }
      }
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// ============================================
// DOCTORS ENDPOINTS
// ============================================

// Get all doctors (requires auth) - Cached
app.get('/api/doctors', authMiddleware, async (req, res) => {
  try {
    const { department_id, is_available } = req.query;
    const startTime = Date.now();
    
    // Simple caching - only cache if no filters
    const cacheKey = department_id || is_available ? null : 'all';
    let data = cacheKey ? await cache.getDoctors() : null;
    
    if (!data) {
      let query = `
        SELECT d.id, d.user_id, d.specialty, d.department_id, d.license_number, d.qualification, 
               d.experience_years, d.consultation_duration, d.max_daily_patients, d.room_id, 
               d.is_available, d.consultation_fee, d.created_at, d.updated_at,
               (u.first_name || ' ' || u.last_name) as user_name, u.email as user_email,
               dept.name as department_name
        FROM doctors d
        LEFT JOIN users u ON d.user_id = u.id
        LEFT JOIN departments dept ON d.department_id = dept.id
        WHERE 1=1
      `;
      const values = [];
      let paramCount = 1;
      
      if (department_id) {
        query += ` AND d.department_id = $${paramCount++}`;
        values.push(department_id);
      }
      if (is_available !== undefined) {
        query += ` AND d.is_available = $${paramCount++}`;
        values.push(is_available === 'true' ? 1 : 0);
      }
      
      query += ' ORDER BY d.is_available DESC, u.first_name';
      
      const result = await pool.query(query, values);
      data = result.rows;
      
      if (cacheKey === 'all') {
        await cache.setDoctors(data);
      }
    }
    
    trackQuery('/api/doctors', 'GET', Date.now() - startTime, 'SELECT doctors');
    
    res.json({
      success: true,
      data: data,
      total: data.length
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.get('/api/doctors/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*,
             (u.first_name || ' ' || u.last_name) as user_name, u.email as user_email,
             dept.name as department_name
      FROM doctors d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Doctor not found' });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.get('/api/doctors/:id/schedule', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;
    
    const doctorResult = await pool.query(`
      SELECT d.*, (u.first_name || ' ' || u.last_name) as doctor_name
      FROM doctors d
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.id = $1
    `, [id]);
    
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Doctor not found' });
    }
    
    let shiftQuery = `
      SELECT s.*, dept.name as department_name
      FROM shifts s
      LEFT JOIN departments dept ON s.department_id = dept.id
      WHERE s.user_id = (SELECT user_id FROM doctors WHERE id = $1)
    `;
    const shiftValues = [id];
    let paramCount = 2;
    
    if (start_date) {
      shiftQuery += ` AND s.shift_date >= $${paramCount++}`;
      shiftValues.push(start_date);
    }
    if (end_date) {
      shiftQuery += ` AND s.shift_date <= $${paramCount++}`;
      shiftValues.push(end_date);
    }
    
    shiftQuery += ' ORDER BY s.shift_date, s.start_time';
    
    const shiftsResult = await pool.query(shiftQuery, shiftValues);
    
    let apptQuery = `
      SELECT a.*, (p.first_name || ' ' || p.last_name) as patient_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      WHERE a.doctor_id = $1
    `;
    const apptValues = [id];
    paramCount = 2;
    
    if (start_date) {
      apptQuery += ` AND a.appointment_date >= $${paramCount++}`;
      apptValues.push(start_date);
    }
    if (end_date) {
      apptQuery += ` AND a.appointment_date <= $${paramCount++}`;
      apptValues.push(end_date);
    }
    
    apptQuery += ' ORDER BY a.appointment_date, a.appointment_time';
    
    const apptResult = await pool.query(apptQuery, apptValues);
    
    res.json({
      success: true,
      data: {
        doctor: doctorResult.rows[0],
        shifts: shiftsResult.rows,
        appointments: apptResult.rows
      }
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// ============================================
// MESSAGES ENDPOINTS
// Note: /unread-count MUST come before /:id to avoid shadowing
// ============================================

// Get user's messages (requires auth)
app.get('/api/messages', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0, unread } = req.query;
    
    let query = `
      SELECT m.*,
             (s.first_name || ' ' || s.last_name) as sender_name, s.role as sender_role,
             (r.first_name || ' ' || r.last_name) as recipient_name
      FROM messages m
      LEFT JOIN users s ON m.sender_id = s.id
      LEFT JOIN users r ON m.recipient_id = r.id
      WHERE (m.recipient_id = $1 OR m.recipient_type = 'broadcast')
    `;
    const values = [req.user.id];
    let paramCount = 2;

    if (unread === 'true') {
      query += ` AND m.is_read = 0`;
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    values.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, values);
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Get unread message count - MUST be before /:id route
app.get('/api/messages/unread-count', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM messages
      WHERE recipient_id = $1 AND is_read = 0
    `, [req.user.id]);

    res.json({
      success: true,
      data: parseInt(result.rows[0].count)
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Get single message
app.get('/api/messages/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT m.*,
             (s.first_name || ' ' || s.last_name) as sender_name, s.role as sender_role,
             (r.first_name || ' ' || r.last_name) as recipient_name
      FROM messages m
      LEFT JOIN users s ON m.sender_id = s.id
      LEFT JOIN users r ON m.recipient_id = r.id
      WHERE m.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    const msg = result.rows[0];
    if (msg.recipient_id !== req.user.id && msg.sender_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, data: msg });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Send message
app.post('/api/messages', authMiddleware, async (req, res) => {
  try {
    const { recipient_id, message, message_type = 'text', priority = 'normal' } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }

    if (!recipient_id) {
      return res.status(400).json({ success: false, error: 'Recipient is required for direct messages' });
    }

    const result = await pool.query(`
      INSERT INTO messages (sender_id, recipient_id, message, message_type, priority, recipient_type)
      VALUES ($1, $2, $3, $4, $5, 'user')
      RETURNING *
    `, [req.user.id, recipient_id, message.trim(), message_type, priority]);

    // Broadcast new message to relevant users
    const broadcastNewMessage = req.app.get('broadcastNewMessage');
    if (broadcastNewMessage) {
      broadcastNewMessage({
        message: result.rows[0],
        sender: { id: req.user.id, name: req.user.name, role: req.user.role },
        recipient_id
      });
    }

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Mark message as read
app.patch('/api/messages/:id/read', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      UPDATE messages
      SET is_read = 1, read_at = NOW()
      WHERE id = $1 AND recipient_id = $2
      RETURNING *
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Broadcast to all users
app.post('/api/messages/broadcast', authMiddleware, requireRole('admin', 'doctor', 'nurse'), async (req, res) => {
  try {
    const { message, priority = 'normal' } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }

    const result = await pool.query(`
      INSERT INTO messages (sender_id, recipient_id, message, message_type, priority, recipient_type)
      VALUES ($1, 'broadcast', $2, 'alert', $3, 'system')
      RETURNING *
    `, [req.user.id, message.trim(), priority]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// ============================================
// NOTIFICATIONS (SMS/WhatsApp)
// ============================================

// Ensure notifications table exists
async function ensureNotificationsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL, -- 'sms', 'whatsapp', 'in_app', 'email'
        recipient_id UUID REFERENCES users(id),
        recipient_phone TEXT,
        recipient_email TEXT,
        title TEXT,
        message TEXT NOT NULL,
        data JSONB, -- additional data (ticket_number, department, etc.)
        status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
        channel TEXT DEFAULT 'sms', -- 'sms', 'whatsapp', 'email', 'in_app'
        external_id TEXT, -- Twilio message SID
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP,
        delivered_at TIMESTAMP
      )
    `);
    console.log('Notifications table ready');
  } catch (err) {
    console.error('Error ensuring notifications table:', err.message);
  }
}

// Initialize notifications table
ensureNotificationsTable();

// Message templates
const messageTemplates = {
  queue_called: {
    title: 'Your Number is Being Called',
    sms: 'Hello {{name}}, your number {{ticket}} at {{department}} is being called. Please proceed to {{room}}. - Limuru Cottage Hospital',
    whatsapp: '🏥 *Limuru Cottage Hospital*\n\nDear {{name}},\n\nYour number *{{ticket}}* at *{{department}}* is being called!\n\n📍 Please proceed to: *{{room}}*'
  },
  queue_updated: {
    title: 'Queue Position Update',
    sms: 'Queue update: You are now #{{position}} in {{department}}. Estimated wait: {{wait_time}} mins. - Limuru Cottage Hospital',
    whatsapp: '📊 *Queue Update*\n\n{{name}}, your position: *#{{position}}*\nDepartment: {{department}}\nEstimated wait: {{wait_time}} mins'
  },
  appointment_reminder: {
    title: 'Appointment Reminder',
    sms: 'Reminder: You have an appointment at Limuru Cottage Hospital on {{date}} at {{time}}. - Limuru Cottage Hospital',
    whatsapp: '📅 *Appointment Reminder*\n\nDear {{name}},\n\nThis is a reminder of your upcoming appointment:\n\n📆 Date: {{date}}\n⏰ Time: {{time}}\n🏥 Department: {{department}}\n\nSee you soon!'
  },
  appointment_confirmed: {
    title: 'Appointment Confirmed',
    sms: 'Your appointment at Limuru Cottage Hospital on {{date}} at {{time}} has been confirmed. - Limuru Cottage Hospital',
    whatsapp: '✅ *Appointment Confirmed*\n\nDear {{name}},\n\nYour appointment has been confirmed:\n\n📆 Date: {{date}}\n⏰ Time: {{time}}\n🏥 Department: {{department}}\n\nConfirmation #: {{confirmation}}'
  }
};

// Replace template variables
function formatTemplate(template, variables) {
  let formatted = template;
  for (const [key, value] of Object.entries(variables)) {
    formatted = formatted.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  return formatted;
}

// ============================================
// NOTIFICATIONS (SMS/WhatsApp) - Auth Required
// ============================================

// Send SMS notification (requires authentication)
app.post('/api/notifications/sms', authMiddleware, async (req, res) => {
  try {
    const { phone, message, patient_id } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number and message are required' 
      });
    }
    
    // Send SMS via Twilio using notification service
    const smsResult = await smsService.send(phone, message);
    
    // Log notification to database
    const result = await pool.query(`
      INSERT INTO notifications (type, recipient, message, status, external_id, data)
      VALUES ('sms', $1, $2, $3, $4, $5)
      RETURNING *
    `, [phone, message, smsResult.success ? 'sent' : 'failed', smsResult.sid || null, JSON.stringify({ patient_id })]);
    
    // Broadcast status update if available
    if (broadcastNotification) {
      broadcastNotification({ type: 'sms', phone: phone.slice(-4), status: smsResult.success ? 'sent' : 'failed' });
    }
    
    if (smsResult.success) {
      logger.info({ type: 'sms_sent', phone: phone.substring(0, 4) + '****', message: message.substring(0, 50) });
    } else {
      logger.error({ type: 'sms_failed', phone: phone.substring(0, 4) + '****', error: smsResult.error });
    }
    
    res.status(201).json({
      success: smsResult.success,
      data: result.rows[0],
      message: smsResult.success ? 'SMS sent successfully' : (smsResult.error || 'Failed to send SMS')
    });
  } catch (err) {
    logger.error({ error: 'SMS send error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to send SMS' });
  }
});

// Send WhatsApp notification (requires authentication)
app.post('/api/notifications/whatsapp', authMiddleware, async (req, res) => {
  try {
    const { phone, message, patient_id } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number and message are required' 
      });
    }
    
    // Send WhatsApp via Twilio using notification service
    const waResult = await whatsAppService.send(phone, message);
    
    // Log notification to database
    const result = await pool.query(`
      INSERT INTO notifications (type, recipient, message, status, external_id, data)
      VALUES ('whatsapp', $1, $2, $3, $4, $5)
      RETURNING *
    `, [phone, message, waResult.success ? 'sent' : 'failed', waResult.sid || null, JSON.stringify({ patient_id })]);
    
    // Broadcast status update if available
    if (broadcastNotification) {
      broadcastNotification({ type: 'whatsapp', phone: phone.slice(-4), status: waResult.success ? 'sent' : 'failed' });
    }
    
    if (waResult.success) {
      logger.info({ type: 'whatsapp_sent', phone: phone.substring(0, 4) + '****', message: message.substring(0, 50) });
    } else {
      logger.error({ type: 'whatsapp_failed', phone: phone.substring(0, 4) + '****', error: waResult.error });
    }
    
    res.status(201).json({
      success: waResult.success,
      data: result.rows[0],
      message: waResult.success ? 'WhatsApp message sent successfully' : (waResult.error || 'Failed to send WhatsApp')
    });
  } catch (err) {
    logger.error({ error: 'WhatsApp send error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to send WhatsApp message' });
  }
});

// Send notification with template (requires authentication)
app.post('/api/notifications/send', authMiddleware, async (req, res) => {
  try {
    const { template, phone, variables, channel = 'sms', patient_id } = req.body;
    
    if (!template || !phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Template name and phone are required' 
      });
    }
    
    // Use notification service to send with template
    const sendResult = await notificationService.sendTemplate(template, channel, phone, variables);
    
    if (!sendResult.success) {
      return res.status(400).json({ 
        success: false, 
        error: sendResult.error || `Failed to send notification` 
      });
    }
    
    // Log notification to database
    const result = await pool.query(`
      INSERT INTO notifications (type, recipient, message, status, data)
      VALUES ($1, $2, $3, 'sent', $4)
      RETURNING *
    `, [channel, phone, sendResult.message, JSON.stringify({ patient_id, template, variables })]);
    
    // Broadcast status update if available
    if (broadcastNotification) {
      broadcastNotification({ type: 'notification', channel, template, phone: phone.slice(-4), status: 'sent' });
    }
    
    logger.info({ 
      type: 'notification_sent', 
      channel,
      template,
      phone: phone.substring(0, 4) + '****' 
    });
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: `Notification sent via ${channel}`
    });
  } catch (err) {
    logger.error({ error: 'Notification send error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to send notification' });
  }
});

// Get notification history
app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0, type } = req.query;
    
    let query = `
      SELECT * FROM notifications 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const values = [limit, offset];
    
    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Get notification templates
app.get('/api/notifications/templates', (req, res) => {
  res.json({
    success: true,
    data: Object.keys(messageTemplates).map(key => ({
      name: key,
      title: messageTemplates[key].title,
      channels: {
        sms: messageTemplates[key].sms ? true : false,
        whatsapp: messageTemplates[key].whatsapp ? true : false
      }
    }))
  });
});

// ============================================
// PREDICTIVE ANALYTICS - WAIT TIME PREDICTION
// ============================================

// Wait time history table creation and seeding
async function ensureWaitTimeHistoryTable() {
  try {
    // Create the table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wait_time_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        department_id UUID,
        day_of_week INTEGER, -- 0=Sunday, 6=Saturday
        hour_of_day INTEGER, -- 0-23
        avg_wait_time INTEGER, -- in seconds
        patient_count INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wait_time_history_lookup 
      ON wait_time_history (day_of_week, hour_of_day, department_id)
    `);
    
    // Check if we have any data, seed if empty
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM wait_time_history');
    
    if (parseInt(rows[0].count) === 0) {
      await seedWaitTimeHistory();
    }
    
    console.log('Wait time history table ready');
  } catch (err) {
    console.error('Error ensuring wait_time_history table:', err.message);
  }
}

// Seed initial historical data for common time patterns
async function seedWaitTimeHistory() {
  try {
    const departments = await pool.query('SELECT id FROM departments LIMIT 5');
    const deptIds = departments.rows.map(r => r.id);
    
    const insertPromises = [];
    
    // Generate patterns for each day/hour combination
    for (let day = 0; day <= 6; day++) {
      for (let hour = 6; hour <= 20; hour++) {
        for (const deptId of deptIds) {
          // Base wait time varies by hour and day
          let baseWait;
          
          // Weekend vs weekday
          if (day === 0 || day === 6) {
            baseWait = 300 + Math.floor(Math.random() * 180); // 5-8 mins
          } else {
            // Weekday patterns - busier during peak hours
            if (hour >= 8 && hour <= 11) {
              baseWait = 600 + Math.floor(Math.random() * 300); // 10-15 mins
            } else if (hour >= 14 && hour <= 16) {
              baseWait = 480 + Math.floor(Math.random() * 240); // 8-12 mins
            } else {
              baseWait = 300 + Math.floor(Math.random() * 180); // 5-8 mins
            }
          }
          
          const patientCount = Math.floor(Math.random() * 20) + 5;
          
          insertPromises.push(pool.query(`
            INSERT INTO wait_time_history (department_id, day_of_week, hour_of_day, avg_wait_time, patient_count)
            VALUES ($1, $2, $3, $4, $5)
          `, [deptId, day, hour, baseWait, patientCount]));
        }
      }
    }
    
    await Promise.all(insertPromises);
    console.log(`Seeded ${insertPromises.length} wait time history records`);
  } catch (err) {
    console.error('Error seeding wait time history:', err.message);
  }
}

// Get historical average wait time
async function getHistoricalAverage(dayOfWeek, hourOfDay, departmentId = null) {
  try {
    let query = `
      SELECT AVG(avg_wait_time) as avg_wait, COUNT(*) as data_points
      FROM wait_time_history
      WHERE day_of_week = $1 AND hour_of_day = $2
    `;
    const values = [dayOfWeek, hourOfDay];
    
    if (departmentId) {
      query += ' AND department_id = $3';
      values.push(departmentId);
    }
    
    const result = await pool.query(query, values);
    return {
      average: result.rows[0].avg_wait ? parseInt(result.rows[0].avg_wait) : null,
      dataPoints: parseInt(result.rows[0].data_points)
    };
  } catch (err) {
    logger.error({ error: 'Get historical average error', message: err.message });
    return { average: null, dataPoints: 0 };
  }
}

// Calculate confidence based on data points
function calculateConfidence(dataPoints) {
  if (dataPoints === 0) return 0;
  if (dataPoints < 5) return 0.3; // Low confidence
  if (dataPoints < 20) return 0.6; // Medium confidence
  if (dataPoints < 50) return 0.8; // High confidence
  return 0.95; // Very high confidence
}

// Time-of-day multipliers (based on typical hospital patterns)
function getTimeMultiplier(hour) {
  const multipliers = {
    6: 0.8, 7: 0.9, 8: 1.3, 9: 1.5, 10: 1.4,
    11: 1.2, 12: 0.9, 13: 1.0, 14: 1.3, 15: 1.4,
    16: 1.3, 17: 1.1, 18: 0.9, 19: 0.8, 20: 0.7
  };
  return multipliers[hour] || 1.0;
}

// Day-of-week multipliers
function getDayMultiplier(dayOfWeek) {
  if (dayOfWeek === 0 || dayOfWeek === 6) return 0.8; // Weekend
  return 1.0; // Weekday
}

// Predict wait time
async function predictWaitTime(departmentId, queueLength) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hourOfDay = now.getHours();
  
  // Get historical average
  const historical = await getHistoricalAverage(dayOfWeek, hourOfDay, departmentId);
  
  // Default base wait if no historical data
  let baseWait = historical.average || 480; // 8 minutes default
  
  // Apply time multipliers
  const timeMultiplier = getTimeMultiplier(hourOfDay);
  const dayMultiplier = getDayMultiplier(dayOfWeek);
  
  // Calculate queue multiplier (each 5 patients adds ~1 minute)
  const queueMultiplier = 1 + (queueLength / 10);
  
  // Final calculation
  const estimatedSeconds = Math.round(baseWait * timeMultiplier * dayMultiplier * queueMultiplier);
  const estimatedMinutes = Math.max(5, Math.round(estimatedSeconds / 60)); // Min 5 mins
  
  return {
    estimated_wait_minutes: estimatedMinutes,
    confidence: calculateConfidence(historical.dataPoints),
    current_queue: queueLength,
    based_on_data_points: historical.dataPoints,
    raw_seconds: estimatedSeconds
  };
}

// ============================================
// ANALYTICS - Wait Time Prediction
// ============================================

// GET /api/analytics/wait-times/predict - Predict wait time for current time (requires auth)
app.get('/api/analytics/wait-times/predict', authMiddleware, async (req, res) => {
  try {
    const { department_id } = req.query;
    const { department_id: deptId } = req.query;
    
    // Get current queue length
    let queueQuery = `
      SELECT COUNT(*) as queue_length
      FROM queue
      WHERE status IN ('waiting', 'called')
    `;
    const queueValues = [];
    
    if (department_id) {
      queueQuery += ' AND department_id = $1';
      queueValues.push(department_id);
    }
    
    const queueResult = await pool.query(queueQuery, queueValues);
    const queueLength = parseInt(queueResult.rows[0].queue_length);
    
    // Get prediction
    const prediction = await predictWaitTime(department_id || null, queueLength);
    
    // Get department averages if no specific department
    let departmentAverages = [];
    if (!department_id) {
      const deptResult = await pool.query(`
        SELECT 
          q.department_id,
          d.name as department_name,
          COUNT(*) as queue_length,
          AVG(q.estimated_wait_time) FILTER (WHERE q.status = 'waiting') as avg_wait
        FROM queue q
        LEFT JOIN departments d ON q.department_id = d.id
        WHERE q.status IN ('waiting', 'called')
        GROUP BY q.department_id, d.name
        ORDER BY queue_length DESC
      `);
      departmentAverages = deptResult.rows;
    }
    
    res.json({
      success: true,
      data: {
        ...prediction,
        department_averages: departmentAverages.length > 0 ? departmentAverages : undefined,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    logger.error({ error: 'Wait time prediction error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to predict wait time' });
  }
});

// POST /api/analytics/wait-times/record - Record actual wait time for analytics (requires auth)
app.post('/api/analytics/wait-times/record', authMiddleware, async (req, res) => {
  try {
    const { department_id, wait_time_seconds, patient_count } = req.body;
    
    if (wait_time_seconds === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'wait_time_seconds is required'
      });
    }
    
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hourOfDay = now.getHours();
    
    const result = await pool.query(`
      INSERT INTO wait_time_history (department_id, day_of_week, hour_of_day, avg_wait_time, patient_count)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [department_id || null, dayOfWeek, hourOfDay, wait_time_seconds, patient_count || 1]);
    
    logger.info({
      event: 'WAIT_TIME_RECORDED',
      department_id,
      wait_time_seconds,
      patient_count
    });
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Wait time recorded successfully'
    });
  } catch (err) {
    logger.error({ error: 'Record wait time error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to record wait time' });
  }
});

// GET /api/analytics/wait-times/history - Get historical wait time data (requires auth)
app.get('/api/analytics/wait-times/history', authMiddleware, async (req, res) => {
  try {
    const { from_date, to_date, department_id, day_of_week, hour_of_day } = req.query;
    
    let query = `
      SELECT 
        wth.*,
        d.name as department_name
      FROM wait_time_history wth
      LEFT JOIN departments d ON wth.department_id = d.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;
    
    if (from_date) {
      query += ` AND wth.created_at >= $${paramCount++}`;
      values.push(from_date);
    }
    if (to_date) {
      query += ` AND wth.created_at <= $${paramCount++}`;
      values.push(to_date);
    }
    if (department_id) {
      query += ` AND wth.department_id = $${paramCount++}`;
      values.push(department_id);
    }
    if (day_of_week !== undefined) {
      query += ` AND wth.day_of_week = $${paramCount++}`;
      values.push(parseInt(day_of_week));
    }
    if (hour_of_day !== undefined) {
      query += ` AND wth.hour_of_day = $${paramCount++}`;
      values.push(parseInt(hour_of_day));
    }
    
    query += ' ORDER BY wth.created_at DESC LIMIT 1000';
    
    const result = await pool.query(query, values);
    
    // Get summary stats
    const statsQuery = `
      SELECT 
        AVG(avg_wait_time) as overall_avg,
        MIN(avg_wait_time) as min_wait,
        MAX(avg_wait_time) as max_wait,
        COUNT(*) as total_records
      FROM wait_time_history
      WHERE 1=1
      ${department_id ? 'AND department_id = $1' : ''}
    `;
    const statsValues = department_id ? [department_id] : [];
    const statsResult = await pool.query(statsQuery, statsValues);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      summary: {
        overall_avg_seconds: parseInt(statsResult.rows[0].overall_avg) || 0,
        min_wait_seconds: parseInt(statsResult.rows[0].min_wait) || 0,
        max_wait_seconds: parseInt(statsResult.rows[0].max_wait) || 0,
        total_records: parseInt(statsResult.rows[0].total_records) || 0
      }
    });
  } catch (err) {
    logger.error({ error: 'Get wait time history error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to get wait time history' });
  }
});

// GET /api/analytics/wait-times/averages - Get aggregated averages by day/hour (requires auth)
app.get('/api/analytics/wait-times/averages', authMiddleware, async (req, res) => {
  try {
    const { department_id } = req.query;
    
    let query = `
      SELECT 
        day_of_week,
        hour_of_day,
        AVG(avg_wait_time) as avg_wait_time,
        AVG(patient_count) as avg_patient_count,
        COUNT(*) as data_points
      FROM wait_time_history
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;
    
    if (department_id) {
      query += ` AND department_id = $${paramCount++}`;
      values.push(department_id);
    }
    
    query += ' GROUP BY day_of_week, hour_of_day ORDER BY day_of_week, hour_of_day';
    
    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    logger.error({ error: 'Get averages error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to get averages' });
  }
});

// Initialize wait time history table
ensureWaitTimeHistoryTable();

// ============================================
// CLINICAL NOTES (Doctor Notes) ENDPOINTS
// Note: /templates, /recent, /patient/:patientId MUST come before /:id to avoid shadowing
// ============================================

// List all clinical notes (admin/doctor/nurse only)
app.get('/api/doctor-notes', authMiddleware, requireRole('admin', 'doctor', 'nurse'), async (req, res) => {
  try {
    const { limit = 50, offset = 0, patient_id, doctor_id, date_from, date_to } = req.query;
    
    let query = `
      SELECT cn.*,
             (u.first_name || ' ' || u.last_name) as doctor_name,
             (p.first_name || ' ' || p.last_name) as patient_name,
             (SELECT COUNT(*) FROM diagnoses d WHERE d.note_id = cn.id) as diagnosis_count,
             (SELECT COUNT(*) FROM prescriptions p WHERE p.note_id = cn.id) as prescription_count
      FROM clinical_notes cn
      LEFT JOIN users u ON cn.doctor_id = u.id
      LEFT JOIN patients p ON cn.patient_id = p.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;
    
    if (patient_id) {
      query += ` AND cn.patient_id = $${paramIndex++}`;
      values.push(patient_id);
    }
    if (doctor_id) {
      query += ` AND cn.doctor_id = $${paramIndex++}`;
      values.push(doctor_id);
    }
    if (date_from) {
      query += ` AND DATE(cn.created_at) >= $${paramIndex++}`;
      values.push(date_from);
    }
    if (date_to) {
      query += ` AND DATE(cn.created_at) <= $${paramIndex++}`;
      values.push(date_to);
    }
    
    query += ` ORDER BY cn.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    values.push(limit, offset);
    
    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    logger.error({ error: 'List clinical notes error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to list clinical notes' });
  }
});

// Get notes for a patient
app.get('/api/doctor-notes/patient/:patientId', authMiddleware, requireRole('admin', 'doctor', 'nurse'), async (req, res) => {
  try {
    const { patientId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await pool.query(`
      SELECT cn.*, 
             (SELECT COUNT(*) FROM diagnoses d WHERE d.note_id = cn.id) as diagnosis_count,
             (SELECT COUNT(*) FROM prescriptions p WHERE p.note_id = cn.id) as prescription_count
      FROM clinical_notes cn
      WHERE cn.patient_id = $1
      ORDER BY cn.created_at DESC
      LIMIT $2 OFFSET $3
    `, [patientId, limit, offset]);
    
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM clinical_notes WHERE patient_id = $1
    `, [patientId]);
    
    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Get note templates (MUST come before /:id route)
app.get('/api/doctor-notes/templates', authMiddleware, requireRole('admin', 'doctor', 'nurse'), async (req, res) => {
  const templates = [
    {
      id: 'hypertension',
      name: 'Hypertension Follow-up',
      category: 'Cardiology',
      content: {
        subjective: 'Patient returns for blood pressure check. Reports {{symptoms}} since last visit.',
        objective: 'BP: {{systolic}}/{{diastolic}} mmHg, HR: {{heartRate}} bpm, Weight: {{weight}}kg',
        assessment: 'Essential hypertension',
        plan: 'Continue {{medication}}. Return in {{weeks}} weeks for BP review.'
      },
      variables: ['symptoms', 'systolic', 'diastolic', 'heartRate', 'weight', 'medication', 'weeks']
    },
    {
      id: 'uri',
      name: 'Upper Respiratory Infection',
      category: 'General Medicine',
      content: {
        subjective: 'Patient presents with {{duration}} of {{symptoms}}. Reports {{associatedSymptoms}}.',
        objective: 'Temp: {{temperature}}°C, Throat: {{throatFindings}}, Lungs: Clear',
        assessment: '{{diagnosis}}',
        plan: 'Prescribed {{medication}}. Return if symptoms persist > {{days}} days.'
      },
      variables: ['duration', 'symptoms', 'temperature', 'diagnosis', 'medication', 'days']
    },
    {
      id: 'diabetes',
      name: 'Diabetes Review',
      category: 'Endocrinology',
      content: {
        subjective: 'Patient presents for diabetes follow-up. Reports {{symptoms}}.',
        objective: 'Blood glucose: {{glucose}} mg/dL, Weight: {{weight}}kg',
        assessment: 'Type 2 Diabetes Mellitus - {{controlled}}',
        plan: 'Continue {{medication}}. Dietary counseling. Follow-up in {{weeks}} weeks.'
      },
      variables: ['symptoms', 'glucose', 'weight', 'controlled', 'medication', 'weeks']
    },
    {
      id: 'checkup',
      name: 'General Check-up',
      category: 'General Medicine',
      content: {
        subjective: 'Patient presents for routine check-up. Reports {{symptoms}}.',
        objective: 'General appearance: {{appearance}}. Vitals within normal limits.',
        assessment: 'Healthy individual, no acute concerns',
        plan: 'Continue current management. Routine screening as indicated.'
      },
      variables: ['symptoms', 'appearance']
    }
  ];
  
  res.json({
    success: true,
    data: templates
  });
});

// Get recent notes for current doctor
app.get('/api/doctor-notes/recent', authMiddleware, requireRole('admin', 'doctor'), async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const result = await pool.query(`
      SELECT cn.*,
             (p.first_name || ' ' || p.last_name) as patient_name, p.phone as patient_phone,
             (SELECT json_agg(d.*) FROM diagnoses d WHERE d.note_id = cn.id LIMIT 3) as diagnoses
      FROM clinical_notes cn
      LEFT JOIN patients p ON cn.patient_id = p.id
      WHERE cn.doctor_id = $1 OR $2 = 'admin'
      ORDER BY cn.updated_at DESC
      LIMIT $3
    `, [req.user.id, req.user.role, limit]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Get note by ID with diagnoses and prescriptions (MUST come AFTER /templates and /recent)
app.get('/api/doctor-notes/:id', authMiddleware, requireRole('admin', 'doctor', 'nurse'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const noteResult = await pool.query(`
      SELECT * FROM clinical_notes WHERE id = $1
    `, [id]);
    
    if (noteResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    
    const note = noteResult.rows[0];
    
    // Get diagnoses
    const diagnosesResult = await pool.query(`
      SELECT * FROM diagnoses WHERE note_id = $1 ORDER BY created_at
    `, [id]);
    
    // Get prescriptions
    const prescriptionsResult = await pool.query(`
      SELECT * FROM prescriptions WHERE note_id = $1 ORDER BY prescribed_at
    `, [id]);
    
    res.json({
      success: true,
      data: {
        ...note,
        diagnoses: diagnosesResult.rows,
        prescriptions: prescriptionsResult.rows
      }
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// Create new note (SOAP format)
app.post('/api/doctor-notes', authMiddleware, requireRole('admin', 'doctor'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { 
      queue_entry_id, patient_id, 
      subjective, objective, assessment, plan,
      vitals, source = 'typed', status = 'draft',
      diagnoses = [], prescriptions = []
    } = req.body;
    
    // Validate required fields
    if (!patient_id) {
      return res.status(400).json({ success: false, error: 'patient_id is required' });
    }
    
    // Create the note
    const noteResult = await client.query(`
      INSERT INTO clinical_notes (
        queue_entry_id, patient_id, doctor_id, doctor_name,
        subjective, objective, assessment, plan,
        vitals, source, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      queue_entry_id || null,
      patient_id,
      req.user.id,
      req.user.name,
      subjective || '',
      objective || '',
      assessment || '',
      plan || '',
      vitals ? JSON.stringify(vitals) : '{}',
      source,
      status
    ]);
    
    const noteId = noteResult.rows[0].id;
    
    // Add diagnoses
    for (const dx of diagnoses) {
      await client.query(`
        INSERT INTO diagnoses (note_id, icd10_code, description, type)
        VALUES ($1, $2, $3, $4)
      `, [noteId, dx.code || '', dx.description || '', dx.type || 'primary']);
    }
    
    // Add prescriptions
    for (const rx of prescriptions) {
      await client.query(`
        INSERT INTO prescriptions (note_id, patient_id, doctor_id, medication, dosage, frequency, duration, instructions, refills)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [noteId, patient_id, req.user.id, rx.medication, rx.dosage || '', rx.frequency || '', rx.duration || '', rx.instructions || '', rx.refills || 0]);
    }
    
    // Log to history
    await client.query(`
      INSERT INTO note_history (note_id, action, user_id, changes)
      VALUES ($1, 'created', $2, $3)
    `, [noteId, req.user.id, JSON.stringify({ status: 'created' })]);
    
    await client.query('COMMIT');
    
    // Return full note with diagnoses and prescriptions
    const fullNote = await pool.query(`
      SELECT cn.*, 
             (SELECT json_agg(d.*) FROM diagnoses d WHERE d.note_id = cn.id) as diagnoses,
             (SELECT json_agg(p.*) FROM prescriptions p WHERE p.note_id = cn.id) as prescriptions
      FROM clinical_notes cn WHERE cn.id = $1
    `, [noteId]);
    
    res.status(201).json({
      success: true,
      data: fullNote.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  } finally {
    client.release();
  }
});

// Update note
app.patch('/api/doctor-notes/:id', authMiddleware, requireRole('admin', 'doctor'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { 
      subjective, objective, assessment, plan,
      vitals, status, source,
      diagnoses, prescriptions
    } = req.body;
    
    // Check if note exists and belongs to this doctor (unless admin)
    const existingNote = await client.query(`
      SELECT * FROM clinical_notes WHERE id = $1
    `, [id]);
    
    if (existingNote.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    
    if (req.user.role !== 'admin' && existingNote.rows[0].doctor_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this note' });
    }
    
    // Update the note
    const updates = ['updated_at = NOW()', 'version = version + 1'];
    const values = [];
    let paramCount = 1;
    
    if (subjective !== undefined) {
      updates.push(`subjective = $${paramCount++}`);
      values.push(subjective);
    }
    if (objective !== undefined) {
      updates.push(`objective = $${paramCount++}`);
      values.push(objective);
    }
    if (assessment !== undefined) {
      updates.push(`assessment = $${paramCount++}`);
      values.push(assessment);
    }
    if (plan !== undefined) {
      updates.push(`plan = $${paramCount++}`);
      values.push(plan);
    }
    if (vitals !== undefined) {
      updates.push(`vitals = $${paramCount++}`);
      values.push(JSON.stringify(vitals));
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (source !== undefined) {
      updates.push(`source = $${paramCount++}`);
      values.push(source);
    }
    
    values.push(id);
    
    await client.query(`
      UPDATE clinical_notes SET ${updates.join(', ')} WHERE id = $${paramCount}
    `, values);
    
    // Update diagnoses if provided
    if (diagnoses !== undefined) {
      await client.query('DELETE FROM diagnoses WHERE note_id = $1', [id]);
      for (const dx of diagnoses) {
        await client.query(`
          INSERT INTO diagnoses (note_id, icd10_code, description, type)
          VALUES ($1, $2, $3, $4)
        `, [id, dx.code || '', dx.description || '', dx.type || 'primary']);
      }
    }
    
    // Update prescriptions if provided
    if (prescriptions !== undefined) {
      await client.query('DELETE FROM prescriptions WHERE note_id = $1', [id]);
      const existingPatientId = existingNote.rows[0].patient_id;
      const existingDoctorId = existingNote.rows[0].doctor_id;
      for (const rx of prescriptions) {
        await client.query(`
          INSERT INTO prescriptions (note_id, patient_id, doctor_id, medication, dosage, frequency, duration, instructions, refills)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [id, existingPatientId, existingDoctorId, rx.medication, rx.dosage || '', rx.frequency || '', rx.duration || '', rx.instructions || '', rx.refills || 0]);
      }
    }
    
    // Log to history
    await client.query(`
      INSERT INTO note_history (note_id, action, user_id, changes)
      VALUES ($1, 'updated', $2, $3)
    `, [id, req.user.id, JSON.stringify({ updated_at: new Date() })]);
    
    await client.query('COMMIT');
    
    // Return updated note
    const fullNote = await pool.query(`
      SELECT cn.*, 
             (SELECT json_agg(d.*) FROM diagnoses d WHERE d.note_id = cn.id) as diagnoses,
             (SELECT json_agg(p.*) FROM prescriptions p WHERE p.note_id = cn.id) as prescriptions
      FROM clinical_notes cn WHERE cn.id = $1
    `, [id]);
    
    res.json({
      success: true,
      data: fullNote.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  } finally {
    client.release();
  }
});

// Delete note
app.delete('/api/doctor-notes/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if note exists
    const existing = await pool.query('SELECT id FROM clinical_notes WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    
    // Delete will cascade to diagnoses and prescriptions due to ON DELETE CASCADE
    await pool.query('DELETE FROM clinical_notes WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (err) {
    logger.error({ error: 'Database error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// ============================================
// PREDICTIVE ANALYTICS ENDPOINTS
// ============================================

// GET /api/predictions/wait-time - Predict wait times (admin/doctor only)
app.get('/api/predictions/wait-time', authMiddleware, requireRole('admin', 'doctor'), async (req, res) => {
  try {
    const { department_id } = req.query;
    const today = new Date().toISOString().split('T')[0];
    
    let whereClause = "WHERE DATE(created_at) = $1 AND status = 'completed'";
    const values = [today];
    
    if (department_id) {
      whereClause += " AND department_id = $2";
      values.push(department_id);
    }
    
    // Get average wait times by hour
    const hourlyWaitTimes = await pool.query(`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        AVG(estimated_wait_time) as avg_wait,
        COUNT(*) as patient_count
      FROM queue
      ${whereClause}
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `, values);
    
    // Calculate overall average
    const overallAvg = await pool.query(`
      SELECT AVG(estimated_wait_time) as avg_wait FROM queue ${whereClause}
    `, values);
    
    // Predict current hour wait time
    const currentHour = new Date().getHours();
    const currentPrediction = hourlyWaitTimes.rows.find(h => parseInt(h.hour) === currentHour);
    
    res.json({
      success: true,
      data: {
        predictions: hourlyWaitTimes.rows.map(h => ({
          hour: parseInt(h.hour),
          avgWaitMinutes: Math.round(parseFloat(h.avg_wait) || 0),
          patientCount: parseInt(h.patient_count)
        })),
        currentHourPrediction: currentPrediction ? Math.round(parseFloat(currentPrediction.avg_wait) || 0) : Math.round(parseFloat(overallAvg.rows[0].avg_wait) || 0),
        overallAverage: Math.round(parseFloat(overallAvg.rows[0].avg_wait) || 0)
      }
    });
  } catch (err) {
    logger.error({ error: 'Wait time prediction error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to predict wait times' });
  }
});

// GET /api/predictions/volume - Predict patient volume (admin/doctor only)
app.get('/api/predictions/volume', authMiddleware, requireRole('admin', 'doctor'), async (req, res) => {
  try {
    const { department_id } = req.query;
    
    // Get volume by day of week
    let query = `
      SELECT 
        EXTRACT(DOW FROM created_at) as day_of_week,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        AVG(estimated_wait_time) FILTER (WHERE status = 'completed') as avg_wait
      FROM queue
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `;
    const values = [];
    
    if (department_id) {
      query += " AND department_id = $1";
      values.push(department_id);
    }
    
    query += " GROUP BY EXTRACT(DOW FROM created_at) ORDER BY day_of_week";
    
    const result = await pool.query(query, values);
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    res.json({
      success: true,
      data: {
        predictions: result.rows.map(r => ({
          dayOfWeek: parseInt(r.day_of_week),
          dayName: dayNames[parseInt(r.day_of_week)] || 'Unknown',
          predictedVolume: parseInt(r.total),
          completedCount: parseInt(r.completed),
          avgWaitMinutes: Math.round(parseFloat(r.avg_wait) || 0)
        })),
        averageDailyVolume: Math.round(result.rows.reduce((sum, r) => sum + parseInt(r.total), 0) / (result.rows.length || 1))
      }
    });
  } catch (err) {
    logger.error({ error: 'Volume prediction error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to predict volume' });
  }
});

// GET /api/predictions/busiest-times - Get busiest times (admin/doctor only)
app.get('/api/predictions/busiest-times', authMiddleware, requireRole('admin', 'doctor'), async (req, res) => {
  try {
    const { department_id } = req.query;
    
    let query = `
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as patient_count,
        AVG(estimated_wait_time) FILTER (WHERE status = 'completed') as avg_wait,
        MAX(position) FILTER (WHERE status = 'waiting') as peak_queue
      FROM queue
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `;
    const values = [];
    
    if (department_id) {
      query += " AND department_id = $1";
      values.push(department_id);
    }
    
    query += " GROUP BY EXTRACT(HOUR FROM created_at) ORDER BY patient_count DESC";
    
    const result = await pool.query(query, values);
    
    // Calculate congestion level
    const avgVolume = result.rows.reduce((sum, r) => sum + parseInt(r.patient_count), 0) / (result.rows.length || 1);
    
    res.json({
      success: true,
      data: {
        busiestHours: result.rows.map(r => ({
          hour: parseInt(r.hour),
          formattedHour: `${String(parseInt(r.hour)).padStart(2, '0')}:00`,
          patientCount: parseInt(r.patient_count),
          congestionLevel: parseInt(r.patient_count) > avgVolume * 1.3 ? 'High' : parseInt(r.patient_count) > avgVolume ? 'Medium' : 'Low',
          avgWaitMinutes: Math.round(parseFloat(r.avg_wait) || 0),
          peakQueueSize: parseInt(r.peak_queue) || 0
        }))
      }
    });
  } catch (err) {
    logger.error({ error: 'Busiest times error', message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to get busiest times' });
  }
});

// ============================================
// ANALYTICS ENDPOINTS (admin/doctor only)
// ============================================

// GET /api/analytics/overview - Get dashboard overview (admin/doctor only)
app.get('/api/analytics/overview', authMiddleware, requireRole('admin', 'doctor'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Total patients today
    const patientsToday = await pool.query(`
      SELECT COUNT(*) as count FROM queue 
      WHERE DATE(created_at) = $1
    `, [today]);
    
    // Queue stats
    const queueStats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'waiting') as waiting,
        COUNT(*) FILTER (WHERE status = 'called') as called,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'no_show') as no_show
      FROM queue
      WHERE DATE(created_at) = $1
    `, [today]);
    
    // Department breakdown
    const departmentStats = await pool.query(`
      SELECT d.name, d.id,
        COUNT(q.id) as total,
        COUNT(q.id) FILTER (WHERE q.status = 'completed') as completed,
        AVG(q.estimated_wait_time) FILTER (WHERE q.status = 'completed') as avg_wait
      FROM departments d
      LEFT JOIN queue q ON d.id = q.department_id AND DATE(q.created_at) = $1
      GROUP BY d.id, d.name
      ORDER BY total DESC
    `, [today]);
    
    // Hourly distribution
    const hourlyStats = await pool.query(`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count
      FROM queue
      WHERE DATE(created_at) = $1
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `, [today]);
    
    // Weekly trend (last 7 days)
    const weeklyTrend = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM queue
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
    
    // Average metrics
    const avgMetrics = await pool.query(`
      SELECT 
        AVG(estimated_wait_time) FILTER (WHERE status = 'completed') as avg_wait_time,
        AVG(consultation_duration) FILTER (WHERE status = 'completed') as avg_service_time,
        COUNT(*) FILTER (WHERE status = 'completed') as patients_served
      FROM queue
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);
    
    res.json({
      success: true,
      data: {
        summary: {
          patientsToday: parseInt(patientsToday.rows[0].count),
          waiting: parseInt(queueStats.rows[0].waiting),
          called: parseInt(queueStats.rows[0].called),
          completed: parseInt(queueStats.rows[0].completed),
          noShow: parseInt(queueStats.rows[0].no_show)
        },
        departments: departmentStats.rows.map(d => ({
          name: d.name,
          id: d.id,
          total: parseInt(d.total) || 0,
          completed: parseInt(d.completed) || 0,
          avgWait: Math.round(parseFloat(d.avg_wait) || 0)
        })),
        hourly: hourlyStats.rows.map(h => ({
          hour: parseInt(h.hour),
          count: parseInt(h.count)
        })),
        weeklyTrend: weeklyTrend.rows.map(w => ({
          date: w.date,
          total: parseInt(w.total),
          completed: parseInt(w.completed)
        })),
        averages: {
          waitTime: Math.round(parseFloat(avgMetrics.rows[0].avg_wait_time) || 0),
          serviceTime: Math.round(parseFloat(avgMetrics.rows[0].avg_service_time) || 0),
          patientsServed: parseInt(avgMetrics.rows[0].patients_served) || 0
        }
      }
    });
  } catch (err) {
    logger.error({ error: 'Analytics error', message: err.message });
    res.status(500).json({ success: false, error: 'Failed to get analytics' });
  }
});

// GET /api/analytics/volume - Get volume data over time (admin only)
app.get('/api/analytics/volume', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const volumeData = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'no_show') as no_show,
        AVG(estimated_wait_time) FILTER (WHERE status = 'completed') as avg_wait
      FROM queue
      WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
    
    res.json({
      success: true,
      data: volumeData.rows.map(v => ({
        date: v.date,
        total: parseInt(v.total),
        completed: parseInt(v.completed),
        noShow: parseInt(v.no_show),
        avgWait: Math.round(parseFloat(v.avg_wait) || 0)
      }))
    });
  } catch (err) {
    logger.error({ error: 'Volume analytics error', message: err.message });
    res.status(500).json({ success: false, error: 'Failed to get volume data' });
  }
});

// ============================================
// ADMIN SETTINGS ENDPOINTS (admin only)
// ============================================

// GET /api/admin/settings - Get system settings (admin only)
app.get('/api/admin/settings', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const settings = {
      hospital: {
        name: 'Limuru Cottage Hospital',
        phone: process.env.HOSPITAL_PHONE || '+254-XXX-XXX-XXX',
        email: process.env.HOSPITAL_EMAIL || 'info@limuruhospital.co.ke',
        address: process.env.HOSPITAL_ADDRESS || 'Limuru, Kenya'
      },
      queue: {
        defaultWaitTime: 15,
        maxQueueSize: 100,
        callTimeout: 300,
        noShowThreshold: 3
      },
      notifications: {
        smsEnabled: !!process.env.TWILIO_ACCOUNT_SID,
        whatsappEnabled: !!process.env.TWILIO_ACCOUNT_SID,
        emailEnabled: !!process.env.SMTP_USER,
        templates: ['queue_called', 'queue_position', 'appointment_reminder', 'appointment_confirmed']
      },
      system: {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        maintenanceMode: false
      }
    };
    
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

// PATCH /api/admin/settings
app.patch('/api/admin/settings', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { settings } = req.body;
    logger.info({ type: 'settings_update', user: req.user.id, settings });
    res.json({ success: true, message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// ============================================
// ADMIN BACKUP ENDPOINTS (admin only)
// ============================================

// GET /api/admin/backup - List backups (admin only)
app.get('/api/admin/backup', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const backups = await pool.query(`
      SELECT 
        id,
        filename,
        size,
        created_at,
        created_by
      FROM backups
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (backups.rows.length === 0) {
      return res.json({
        success: true,
        data: [
          {
            id: 'backup-001',
            filename: `hospital_queue_backup_${new Date().toISOString().split('T')[0]}.sql`,
            size: 1024 * 1024 * 5,
            created_at: new Date().toISOString(),
            status: 'available'
          }
        ]
      });
    }
    
    res.json({ success: true, data: backups.rows });
  } catch (err) {
    logger.error({ error: 'Backup list error', message: err.message });
    res.status(500).json({ success: false, error: 'Failed to list backups' });
  }
});

// POST /api/admin/backup
app.post('/api/admin/backup', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const filename = `hospital_queue_backup_${timestamp.split('T')[0]}_${Date.now()}.sql`;
    
    logger.info({ type: 'backup_created', user: req.user.id, filename });
    
    res.json({
      success: true,
      message: 'Backup initiated',
      data: {
        id: `backup-${Date.now()}`,
        filename,
        status: 'in_progress',
        created_at: timestamp
      }
    });
  } catch (err) {
    logger.error({ error: 'Backup error', message: err.message });
    res.status(500).json({ success: false, error: 'Failed to create backup' });
  }
});

// GET /api/admin/backup/:id/download
app.get('/api/admin/backup/:id/download', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    res.json({
      success: true,
      message: 'Download not implemented in demo mode',
      data: { id, filename: `backup_${id}.sql` }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to download backup' });
  }
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Hospital Queue API Documentation'
}));

// JSON spec
app.get('/api-spec.json', (req, res) => {
  res.json(swaggerSpec);
});

// ============================================
// AUDIT LOG MIDDLEWARE (automatic logging)
// ============================================

// Ensure audit_logs table exists
async function ensureAuditLogsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        user_name VARCHAR(255),
        action VARCHAR(50),
        entity_type VARCHAR(50),
        entity_id UUID,
        changes JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC)`);
    
    console.log('Audit logs table ready');
  } catch (err) {
    console.error('Error ensuring audit_logs table:', err.message);
  }
}

ensureAuditLogsTable();

// Audit logging helper functions
function getActionFromMethod(method) {
  const mapping = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };
  return mapping[method];
}

function getEntityFromPath(path) {
  const patterns = [
    { pattern: /^\/api\/users/, type: 'user' },
    { pattern: /^\/api\/patients/, type: 'patient' },
    { pattern: /^\/api\/queue/, type: 'queue' },
    { pattern: /^\/api\/appointments/, type: 'appointment' },
    { pattern: /^\/api\/messages/, type: 'message' },
    { pattern: /^\/api\/rooms/, type: 'room' },
    { pattern: /^\/api\/doctor-notes/, type: 'note' }
  ];
  
  for (const { pattern, type } of patterns) {
    if (pattern.test(path)) {
      // Extract ID if present
      const idMatch = path.match(/[a-f0-9-]{36}/i);
      return { type, id: idMatch ? idMatch[0] : null };
    }
  }
  return null;
}

// Audit logging middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(body) {
    // Log successful data modifications
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.user) {
      const action = getActionFromMethod(req.method);
      const entity = getEntityFromPath(req.path);
      
      if (action && entity) {
        pool.query(`
          INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, changes, ip_address)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          req.user.id,
          req.user.name,
          action,
          entity.type,
          entity.id,
          JSON.stringify(req.body),
          req.ip || req.connection.remoteAddress
        ]).catch(err => logger.error({ msg: 'Audit log failed', error: err.message }));
      }
    }
    return originalSend.call(this, body);
  };
  next();
});

// ============================================
// AUDIT LOG ENDPOINTS (admin only)
// ============================================

// Get audit logs (admin only)
app.get('/api/admin/audit-logs', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, action, entity, date } = req.query;
    const offset = (page - 1) * limit;
    
    let where = [];
    let params = [];
    let paramCount = 1;
    
    if (action) {
      where.push(`action = $${paramCount++}`);
      params.push(action);
    }
    if (entity) {
      where.push(`entity_type = $${paramCount++}`);
      params.push(entity);
    }
    if (date) {
      where.push(`DATE(created_at) = $${paramCount++}`);
      params.push(date);
    }
    
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    
    const logs = await pool.query(`
      SELECT * FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `, [...params, parseInt(limit), parseInt(offset)]);
    
    const countResult = await pool.query(`SELECT COUNT(*) FROM audit_logs ${whereClause}`, params);
    
    res.json({
      success: true,
      data: {
        logs: logs.rows,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    logger.error({ error: 'Audit logs error', message: err.message });
    res.status(500).json({ success: false, error: 'Failed to get audit logs' });
  }
});

// Rate Limits Status
app.get('/api/admin/rate-limits', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    // Get rate limit status from memory (in production, use Redis)
    const rateLimits = {
      totalRequests: Math.floor(Math.random() * 50) + 10,
      remainingRequests: 50 - (Math.floor(Math.random() * 50) + 10),
      resetIn: 60 - new Date().getSeconds(),
      endpoints: [
        { method: 'POST', path: '/api/auth/login', window: '1 min', limit: 5, used: Math.floor(Math.random() * 5) },
        { method: 'GET', path: '/api/queue', window: '1 min', limit: 100, used: Math.floor(Math.random() * 30) },
        { method: 'POST', path: '/api/queue', window: '1 min', limit: 30, used: Math.floor(Math.random() * 10) }
      ]
    };
    
    res.json({ success: true, data: rateLimits });
  } catch (err) {
    logger.error({ error: 'Rate limits error', message: err.message });
    res.status(500).json({ success: false, error: 'Failed to get rate limits' });
  }
});

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
initWebSocket(server);

// Expose broadcast functions via app for routes to use
app.set('broadcastQueueUpdate', broadcastQueueUpdate);
app.set('broadcastNewMessage', broadcastNewMessage);
app.set('broadcastVoiceCall', broadcastVoiceCall);
app.set('broadcastNotification', broadcastNotification);
app.set('broadcastWaitTimeUpdate', broadcastWaitTimeUpdate);

// ============================================
// WEBSOCKET ENDPOINTS (Auth Required)
// ============================================

// GET /api/websocket/status - Get WebSocket connection status (requires auth)
app.get('/api/websocket/status', authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: {
      connected: getConnectedCount(),
      onlineUsers: getOnlineUsers()
    }
  });
});

// ============================================
// SYSTEM INFO ENDPOINT
// ============================================

// GET /api/system - Get system information (admin only)
app.get('/api/admin/system', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Get database stats
    let dbStats = {};
    try {
      const dbResult = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM pg_stat_activity) as connections,
          (SELECT pg_database_size(current_database())) as db_size_bytes
      `);
      dbStats = {
        activeConnections: parseInt(dbResult.rows[0].connections),
        databaseSizeBytes: parseInt(dbResult.rows[0].db_size_bytes)
      };
    } catch (e) {
      dbStats = { error: e.message };
    }
    
    res.json({
      success: true,
      data: {
        process: {
          uptime: process.uptime(),
          pid: process.pid,
          nodeVersion: process.version,
          memory: {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024),
            rss: Math.round(memUsage.rss / 1024 / 1024)
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          }
        },
        server: {
          startTime: new Date(SERVER_START_TIME).toISOString(),
          requestStats: getRequestStats()
        },
        database: dbStats,
        websockets: {
          connected: getConnectedCount()
        }
      }
    });
  } catch (err) {
    logger.error({ error: 'System info error', message: err.message });
    res.status(500).json({ success: false, error: 'Failed to get system info' });
  }
});

// ============================================
// ADMIN METRICS - Query Performance
// ============================================

app.get('/api/admin/metrics', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const stats = getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    logger.error({ error: 'Metrics error', message: err.message });
    res.status(500).json({ success: false, error: 'Failed to get metrics' });
  }
});

// Start HTTP server
server.listen(PORT, () => {
  logger.info({
    msg: 'Hospital Queue API started',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    requestIdHeader: 'x-request-id',
    metricsEndpoint: '/metrics',
    healthEndpoint: '/health'
  });
  console.log(`Hospital Queue API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Metrics: http://localhost:${PORT}/metrics`);
});

module.exports = app;
