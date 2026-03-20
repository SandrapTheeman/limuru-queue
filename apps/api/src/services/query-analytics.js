const queryStats = {
  slowQueries: [],
  endpointStats: {},
  totalQueries: 0,
  slowQueryThreshold: 100,
  maxSlowQueries: 100,
};

function trackQuery(endpoint, method, duration, query, params = []) {
  queryStats.totalQueries++;
  
  const key = `${method}:${endpoint}`;
  if (!queryStats.endpointStats[key]) {
    queryStats.endpointStats[key] = {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
    };
  }
  
  const stats = queryStats.endpointStats[key];
  stats.count++;
  stats.totalDuration += duration;
  stats.avgDuration = Math.round(stats.totalDuration / stats.count);
  stats.minDuration = Math.min(stats.minDuration, duration);
  stats.maxDuration = Math.max(stats.maxDuration, duration);
  
  if (duration > queryStats.slowQueryThreshold) {
    const slowQuery = {
      endpoint,
      method,
      duration,
      query: query.substring(0, 500),
      params: params.length > 10 ? params.slice(0, 10) : params,
      timestamp: new Date().toISOString(),
    };
    
    queryStats.slowQueries.unshift(slowQuery);
    
    if (queryStats.slowQueries.length > queryStats.maxSlowQueries) {
      queryStats.slowQueries.pop();
    }
    
    logger.warn({
      event: 'SLOW_QUERY',
      endpoint,
      method,
      duration: `${duration}ms`,
      query: query.substring(0, 200),
    });
  }
}

function getStats() {
  const topEndpoints = Object.entries(queryStats.endpointStats)
    .map(([key, stats]) => ({
      endpoint: key,
      ...stats,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
  
  return {
    totalQueries: queryStats.totalQueries,
    slowQueryCount: queryStats.slowQueries.length,
    slowQueryThreshold: queryStats.slowQueryThreshold,
    topEndpoints,
    recentSlowQueries: queryStats.slowQueries.slice(0, 10),
  };
}

function setThreshold(ms) {
  queryStats.slowQueryThreshold = ms;
}

function resetStats() {
  queryStats.slowQueries = [];
  queryStats.endpointStats = {};
  queryStats.totalQueries = 0;
}

function logQuery(endpoint, method, query, duration) {
  if (duration > 100) {
    logger.info({
      event: 'SLOW_QUERY_LOGGED',
      endpoint,
      method,
      duration: `${duration}ms`,
      query: query.substring(0, 100),
    });
  }
}

module.exports = {
  trackQuery,
  getStats,
  setThreshold,
  resetStats,
  logQuery,
};