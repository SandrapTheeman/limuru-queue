const logger = require('../utils/logger');

const requestCounts = new Map();
const responseTimes = [];
const activeRequests = { value: 0 };

function generateMetrics() {
  let output = '# HELP http_requests_total Total number of HTTP requests\n';
  output += '# TYPE http_requests_total counter\n';
  
  for (const [endpoint, count] of requestCounts.entries()) {
    output += `http_requests_total{method="GET",endpoint="${endpoint}"} ${count}\n`;
  }
  
  output += '\n# HELP http_response_time_seconds Response time histogram\n';
  output += '# TYPE http_response_time_seconds histogram\n';
  
  const buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
  const sortedTimes = responseTimes.slice().sort((a, b) => a - b);
  
  for (const bucket of buckets) {
    const count = sortedTimes.filter(t => t <= bucket).length;
    output += `http_response_time_seconds_bucket{le="${bucket}"} ${count}\n`;
  }
  output += `http_response_time_seconds_bucket{le="+Inf"} ${responseTimes.length}\n`;
  output += `http_response_time_seconds_sum ${sortedTimes.reduce((a, b) => a + b, 0)}\n`;
  output += `http_response_time_seconds_count ${responseTimes.length}\n`;
  
  output += '\n# HELP http_active_requests Current number of active requests\n';
  output += '# TYPE http_active_requests gauge\n';
  output += `http_active_requests ${activeRequests.value}\n`;
  
  return output;
}

const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  activeRequests.value++;
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    activeRequests.value--;
    
    const endpoint = req.route?.path || req.path;
    requestCounts.set(endpoint, (requestCounts.get(endpoint) || 0) + 1);
    responseTimes.push(duration);
    
    if (responseTimes.length > 1000) {
      responseTimes.shift();
    }
    
    logger.info({
      type: 'metrics',
      method: req.method,
      endpoint: req.path,
      status: res.statusCode,
      duration
    });
  });
  
  next();
};

module.exports = { metricsMiddleware, generateMetrics };
