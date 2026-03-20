/**
 * Prometheus Metrics Service
 * Application metrics using prom-client library
 */

const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Add default metrics (Node.js runtime metrics)
client.collectDefaultMetrics({ register });

// Custom prefix for metrics
const METRIC_PREFIX = 'hqs_';

// ============================================
// COUNTERS
// ============================================

// Total HTTP requests counter
const httpRequestsTotal = new client.Counter({
  name: `${METRIC_PREFIX}http_requests_total`,
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Authentication attempts counter
const authAttemptsTotal = new client.Counter({
  name: `${METRIC_PREFIX}auth_attempts_total`,
  help: 'Total number of authentication attempts',
  labelNames: ['type', 'success'],
  registers: [register]
});

// Database errors counter
const dbErrorsTotal = new client.Counter({
  name: `${METRIC_PREFIX}db_errors_total`,
  help: 'Total number of database errors',
  labelNames: ['operation', 'table'],
  registers: [register]
});

// Cache hit counter
const cacheHitsTotal = new client.Counter({
  name: `${METRIC_PREFIX}cache_hits_total`,
  help: 'Total number of cache hits',
  registers: [register]
});

// Cache miss counter
const cacheMissesTotal = new client.Counter({
  name: `${METRIC_PREFIX}cache_misses_total`,
  help: 'Total number of cache misses',
  registers: [register]
});

// Business events counter
const businessEventsTotal = new client.Counter({
  name: `${METRIC_PREFIX}business_events_total`,
  help: 'Total number of business events',
  labelNames: ['event_type', 'department'],
  registers: [register]
});

// Notifications sent counter
const notificationsSentTotal = new client.Counter({
  name: `${METRIC_PREFIX}notifications_sent_total`,
  help: 'Total number of notifications sent',
  labelNames: ['channel', 'status'],
  registers: [register]
});

// ============================================
// GAUGES
// ============================================

// Active HTTP connections gauge
const httpActiveConnections = new client.Gauge({
  name: `${METRIC_PREFIX}http_active_connections`,
  help: 'Number of active HTTP connections',
  registers: [register]
});

// Current queue length gauge
const queueLengthGauge = new client.Gauge({
  name: `${METRIC_PREFIX}queue_length`,
  help: 'Current number of patients in queue',
  labelNames: ['department', 'status'],
  registers: [register]
});

// Waiting patients gauge
const waitingPatientsGauge = new client.Gauge({
  name: `${METRIC_PREFIX}waiting_patients`,
  help: 'Number of patients currently waiting',
  labelNames: ['department'],
  registers: [register]
});

// Active WebSocket connections gauge
const websocketConnectionsGauge = new client.Gauge({
  name: `${METRIC_PREFIX}websocket_connections`,
  help: 'Number of active WebSocket connections',
  registers: [register]
});

// Database connection pool gauge
const dbConnectionPoolGauge = new client.Gauge({
  name: `${METRIC_PREFIX}db_connection_pool`,
  help: 'Database connection pool status',
  labelNames: ['state'],
  registers: [register]
});

// ============================================
// HISTOGRAMS
// ============================================

// HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
  name: `${METRIC_PREFIX}http_request_duration_seconds`,
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

// Database query duration histogram
const dbQueryDuration = new client.Histogram({
  name: `${METRIC_PREFIX}db_query_duration_seconds`,
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'table', 'success'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register]
});

// Response size histogram
const responseSizeBytes = new client.Histogram({
  name: `${METRIC_PREFIX}response_size_bytes`,
  help: 'HTTP response size in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
  registers: [register]
});

// Wait time histogram
const waitTimeHistogram = new client.Histogram({
  name: `${METRIC_PREFIX}wait_time_seconds`,
  help: 'Patient wait time in seconds',
  labelNames: ['department'],
  buckets: [60, 120, 300, 600, 900, 1200, 1800, 3600],
  registers: [register]
});

// ============================================
// SUMMARY (for percentile calculations)
// ============================================

// Request latency summary
const httpRequestSummary = new client.Summary({
  name: `${METRIC_PREFIX}http_request_latency_summary`,
  help: 'HTTP request latency summary',
  labelNames: ['method', 'route'],
  percentiles: [0.5, 0.9, 0.95, 0.99],
  registers: [register]
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// Record HTTP request
const recordHttpRequest = (method, route, statusCode, durationSeconds, responseSize = 0) => {
  const labels = { method, route, status_code: statusCode };
  
  httpRequestsTotal.inc(labels);
  httpRequestDuration.observe(labels, durationSeconds);
  responseSizeBytes.observe({ method, route }, responseSize);
  httpRequestSummary.observe({ method, route }, durationSeconds);
};

// Record authentication attempt
const recordAuthAttempt = (type, success) => {
  authAttemptsTotal.inc({ type, success: success ? 'true' : 'false' });
};

// Record database operation
const recordDbOperation = (operation, table, durationSeconds, success = true) => {
  dbQueryDuration.observe(
    { operation, table, success: success ? 'true' : 'false' },
    durationSeconds
  );
  if (!success) {
    dbErrorsTotal.inc({ operation, table });
  }
};

// Record cache access
const recordCacheHit = () => {
  cacheHitsTotal.inc();
};

const recordCacheMiss = () => {
  cacheMissesTotal.inc();
};

// Record business event
const recordBusinessEvent = (eventType, department = null) => {
  businessEventsTotal.inc({ event_type: eventType, department: department || 'general' });
};

// Record notification
const recordNotification = (channel, success) => {
  notificationsSentTotal.inc({ channel, status: success ? 'sent' : 'failed' });
};

// Update queue metrics
const updateQueueMetrics = (queueData) => {
  // Update total queue length
  queueLengthGauge.set({ department: 'total', status: 'all' }, queueData.total || 0);
  
  // Update by status
  if (queueData.byStatus) {
    for (const [status, count] of Object.entries(queueData.byStatus)) {
      queueLengthGauge.set({ department: 'total', status }, count);
    }
  }
  
  // Update by department
  if (queueData.byDepartment) {
    for (const [dept, data] of Object.entries(queueData.byDepartment)) {
      waitingPatientsGauge.set({ department: dept }, data.waiting || 0);
      queueLengthGauge.set({ department: dept, status: 'all' }, data.total || 0);
    }
  }
};

// Update WebSocket metrics
const updateWebSocketMetrics = (count) => {
  websocketConnectionsGauge.set(count);
};

// Update database pool metrics
const updateDbPoolMetrics = (total, idle, active) => {
  dbConnectionPoolGauge.set({ state: 'total' }, total);
  dbConnectionPoolGauge.set({ state: 'idle' }, idle);
  dbConnectionPoolGauge.set({ state: 'active' }, active);
};

// Record wait time
const recordWaitTime = (seconds, department = null) => {
  waitTimeHistogram.observe({ department: department || 'general' }, seconds);
};

// Get all metrics in Prometheus format
const getMetrics = async () => {
  return await register.metrics();
};

// Get metrics content type
const getContentType = () => {
  return register.contentType;
};

// Reset all metrics (for testing)
const resetMetrics = () => {
  register.resetMetrics();
};

// Get current metric values
const getMetricValues = async () => {
  const metrics = {};
  const entries = await register.getMetricsAsJSON();
  
  for (const metric of entries) {
    metrics[metric.name] = {
      help: metric.help,
      type: metric.type,
      values: metric.values
    };
  }
  
  return metrics;
};

module.exports = {
  register,
  // Counters
  httpRequestsTotal,
  authAttemptsTotal,
  dbErrorsTotal,
  cacheHitsTotal,
  cacheMissesTotal,
  businessEventsTotal,
  notificationsSentTotal,
  // Gauges
  httpActiveConnections,
  queueLengthGauge,
  waitingPatientsGauge,
  websocketConnectionsGauge,
  dbConnectionPoolGauge,
  // Histograms
  httpRequestDuration,
  dbQueryDuration,
  responseSizeBytes,
  waitTimeHistogram,
  // Summary
  httpRequestSummary,
  // Helper functions
  recordHttpRequest,
  recordAuthAttempt,
  recordDbOperation,
  recordCacheHit,
  recordCacheMiss,
  recordBusinessEvent,
  recordNotification,
  updateQueueMetrics,
  updateWebSocketMetrics,
  updateDbPoolMetrics,
  recordWaitTime,
  getMetrics,
  getContentType,
  resetMetrics,
  getMetricValues
};
