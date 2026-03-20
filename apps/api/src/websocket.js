// WebSocket Server Module for Hospital Queue System
// Provides real-time updates for queue changes, messages, voice calls, and notifications

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Import logger (optional - will use console if logger not available)
let logger;
try {
  logger = require('./utils/logger');
} catch (err) {
  // Fallback to console if logger not available
  logger = {
    info: (...args) => console.log('[WS INFO]', ...args),
    error: (...args) => console.error('[WS ERROR]', ...args),
    warn: (...args) => console.warn('[WS WARN]', ...args)
  };
}

// WebSocket server instance
let wss;

// Map of userId -> Set of { ws, sessionId, departmentId }
const clients = new Map();

// Map of sessionId -> userId for quick lookups
const sessionToUser = new Map();

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL = 30000;
let heartbeatInterval;

// Event types
const EVENT_TYPES = {
  QUEUE_UPDATE: 'queue_update',
  NEW_MESSAGE: 'new_message',
  VOICE_CALL: 'voice_call',
  NOTIFICATION: 'notification',
  WAIT_TIME_UPDATE: 'wait_time_update',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  ERROR: 'error',
  PONG: 'pong'
};

/**
 * Initialize WebSocket server on HTTP server
 * @param {http.Server} server - HTTP server instance
 */
function initWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  // Connection handler
  wss.on('connection', (ws, req) => {
    // Extract token from query string
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.send(JSON.stringify({ type: 'error', message: 'Authentication token required' }));
      ws.close(4001, 'No token provided');
      return;
    }

    // Verify JWT token
    let user;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        department: decoded.department
      };
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token' }));
      ws.close(4002, 'Invalid token');
      return;
    }

    // Generate session ID for this connection
    const sessionId = uuidv4();

    // Store connection
    storeConnection(user.id, ws, sessionId);
    sessionToUser.set(sessionId, user.id);

    // Log connection
    logger.info({ wsEvent: 'connection', userId: user.id, sessionId });

    // Send connection confirmation
    sendToSession(sessionId, {
      type: 'connected',
      sessionId,
      user: { id: user.id, name: user.name, role: user.role }
    });

    // Broadcast user online status
    broadcast({
      event: EVENT_TYPES.USER_ONLINE,
      data: { userId: user.id, userName: user.name }
    }, { excludeSession: sessionId });

    // Handle incoming messages
    ws.on('message', (data) => handleMessage(data, user, sessionId));

    // Handle connection close
    ws.on('close', () => handleDisconnect(user, sessionId));

    // Handle errors
    ws.on('error', (err) => {
      logger.error({ wsEvent: 'error', sessionId, error: err.message });
      handleDisconnect(user, sessionId);
    });

    // Set up heartbeat for this connection
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  });

  // Start heartbeat checker
  startHeartbeat();

  logger.info({ wsEvent: 'initialized', path: '/ws' });
  return wss;
}

/**
 * Store a WebSocket connection
 */
function storeConnection(userId, ws, sessionId) {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId).add({ ws, sessionId });
}

/**
 * Remove a WebSocket connection
 */
function removeConnection(userId, sessionId) {
  const userConnections = clients.get(userId);
  if (userConnections) {
    for (const conn of userConnections) {
      if (conn.sessionId === sessionId) {
        userConnections.delete(conn);
        break;
      }
    }
    if (userConnections.size === 0) {
      clients.delete(userId);
    }
  }
  sessionToUser.delete(sessionId);
}

/**
 * Handle incoming WebSocket message
 */
function handleMessage(data, user, sessionId) {
  try {
    const message = JSON.parse(data);

    switch (message.type) {
      case 'ping':
        sendToSession(sessionId, { type: 'pong', timestamp: Date.now() });
        break;

      case 'subscribe':
        // Subscribe to department updates
        handleSubscribe(message, user, sessionId);
        break;

      case 'unsubscribe':
        // Unsubscribe from department updates
        handleUnsubscribe(message, user, sessionId);
        break;

      case 'ack':
        // Acknowledgment received
        logger.info({ wsEvent: 'ack_received', sessionId });
        break;

      default:
        logger.warn({ wsEvent: 'unknown_message', sessionId, messageType: message.type });
    }
  } catch (err) {
    logger.error({ wsEvent: 'parse_error', sessionId, error: err.message });
    sendToSession(sessionId, { type: 'error', message: 'Invalid message format' });
  }
}

/**
 * Handle subscribe request
 */
function handleSubscribe(message, user, sessionId) {
  const { departmentId } = message;
  if (departmentId) {
    sendToSession(sessionId, {
      type: 'subscribed',
      departmentId
    });
    logger.info({ wsEvent: 'subscribed', userId: user.id, departmentId, sessionId });
  }
}

/**
 * Handle unsubscribe request
 */
function handleUnsubscribe(message, user, sessionId) {
  const { departmentId } = message;
  if (departmentId) {
    sendToSession(sessionId, {
      type: 'unsubscribed',
      departmentId
    });
    logger.info({ wsEvent: 'unsubscribed', userId: user.id, departmentId, sessionId });
  }
}

/**
 * Handle disconnection
 */
function handleDisconnect(user, sessionId) {
  removeConnection(user.id, sessionId);
  logger.info({ wsEvent: 'disconnect', userId: user.id, sessionId });

  // Broadcast user offline status
  broadcast({
    event: EVENT_TYPES.USER_OFFLINE,
    data: { userId: user.id, userName: user.name }
  });
}

/**
 * Start heartbeat checker to detect dead connections
 */
function startHeartbeat() {
  heartbeatInterval = setInterval(() => {
    if (!wss) return;

    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        // Connection didn't respond to pong, terminate it
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);
}

/**
 * Stop heartbeat checker
 */
function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

/**
 * Send message to a specific session
 */
function sendToSession(sessionId, message) {
  const userId = sessionToUser.get(sessionId);
  if (!userId) return;

  const userConnections = clients.get(userId);
  if (!userConnections) return;

  for (const conn of userConnections) {
    if (conn.sessionId === sessionId && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(JSON.stringify(message));
      break;
    }
  }
}

/**
 * Send message to a specific user (all their sessions)
 */
function sendToClient(userId, message) {
  const userConnections = clients.get(userId);
  if (!userConnections) return;

  for (const conn of userConnections) {
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(JSON.stringify(message));
    }
  }
}

/**
 * Broadcast to all connected clients
 */
function broadcast(payload, options = {}) {
  if (!wss) return;

  const message = {
    ...payload,
    timestamp: Date.now()
  };
  const messageStr = JSON.stringify(message);

  wss.clients.forEach((ws) => {
    // Skip excluded session if specified
    if (options.excludeSession) {
      const userId = sessionToUser.get(options.excludeSession);
      const userConns = clients.get(userId);
      if (userConns) {
        for (const conn of userConns) {
          if (conn.sessionId === options.excludeSession && conn.ws === ws) {
            return;
          }
        }
      }
    }

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

/**
 * Broadcast to users in a specific department
 */
function broadcastToDepartment(departmentId, event, data) {
  broadcast({
    event,
    data: { ...data, departmentId }
  });
}

/**
 * Broadcast queue update
 */
function broadcastQueueUpdate(data) {
  broadcast({
    event: EVENT_TYPES.QUEUE_UPDATE,
    data
  });
}

/**
 * Broadcast new message
 */
function broadcastNewMessage(data) {
  broadcast({
    event: EVENT_TYPES.NEW_MESSAGE,
    data
  });
}

/**
 * Broadcast voice call notification
 */
function broadcastVoiceCall(data) {
  broadcast({
    event: EVENT_TYPES.VOICE_CALL,
    data
  });
}

/**
 * Broadcast notification (SMS/WhatsApp status)
 */
function broadcastNotification(data) {
  broadcast({
    event: EVENT_TYPES.NOTIFICATION,
    data
  });
}

/**
 * Broadcast wait time update
 */
function broadcastWaitTimeUpdate(data) {
  broadcast({
    event: EVENT_TYPES.WAIT_TIME_UPDATE,
    data
  });
}

/**
 * Get connected clients count
 */
function getConnectedCount() {
  let count = 0;
  clients.forEach((conns) => {
    count += conns.size;
  });
  return count;
}

/**
 * Get online users list
 */
function getOnlineUsers() {
  const users = [];
  clients.forEach((conns, userId) => {
    if (conns.size > 0) {
      users.push({ userId, sessionCount: conns.size });
    }
  });
  return users;
}

/**
 * Close WebSocket server gracefully
 */
function closeWebSocket() {
  stopHeartbeat();

  if (wss) {
    wss.clients.forEach((ws) => {
      ws.close(1001, 'Server shutting down');
    });
    wss.close();
    wss = null;
  }

  clients.clear();
  sessionToUser.clear();

  logger.info({ wsEvent: 'server_closed' });
}

module.exports = {
  initWebSocket,
  broadcast,
  broadcastToDepartment,
  broadcastQueueUpdate,
  broadcastNewMessage,
  broadcastVoiceCall,
  broadcastNotification,
  broadcastWaitTimeUpdate,
  sendToClient,
  getConnectedCount,
  getOnlineUsers,
  closeWebSocket,
  EVENT_TYPES
};
