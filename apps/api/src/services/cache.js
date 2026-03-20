const Redis = require('ioredis');

const cacheConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableReadyCheck: true,
  connectTimeout: 10000,
};

let redis = null;
let isConnected = false;

function getClient() {
  if (!redis) {
    redis = new Redis(cacheConfig);
    
    redis.on('connect', () => {
      isConnected = true;
      console.log('[Cache] Redis connected');
    });
    
    redis.on('error', (err) => {
      isConnected = false;
      console.error('[Cache] Redis error:', err.message);
    });
    
    redis.on('close', () => {
      isConnected = false;
      console.log('[Cache] Redis connection closed');
    });
  }
  
  return redis;
}

async function connect() {
  try {
    const client = getClient();
    await client.connect();
    isConnected = true;
    return true;
  } catch (err) {
    console.error('[Cache] Failed to connect to Redis:', err.message);
    isConnected = false;
    return false;
  }
}

function isCacheAvailable() {
  return isConnected && redis && redis.status === 'ready';
}

const TTL = {
  DATA: 300,        // 5 minutes for frequently changing data
  SETTINGS: 3600,   // 1 hour for settings
  ANALYTICS: 86400, // 24 hours for analytics summaries
};

const CACHE_PREFIX = {
  DEPARTMENT: 'dept:',
  ROOM: 'room:',
  DOCTOR: 'doctor:',
  SETTINGS: 'settings:',
  ANALYTICS: 'analytics:',
  COUNT: 'count:',
};

async function get(key) {
  if (!isCacheAvailable()) {
    return null;
  }
  
  try {
    const data = await redis.get(key);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (err) {
    console.error('[Cache] Get error:', err.message);
    return null;
  }
}

async function set(key, value, ttl = TTL.DATA) {
  if (!isCacheAvailable()) {
    return false;
  }
  
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error('[Cache] Set error:', err.message);
    return false;
  }
}

async function del(key) {
  if (!isCacheAvailable()) {
    return false;
  }
  
  try {
    await redis.del(key);
    return true;
  } catch (err) {
    console.error('[Cache] Del error:', err.message);
    return false;
  }
}

async function delPattern(pattern) {
  if (!isCacheAvailable()) {
    return false;
  }
  
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return true;
  } catch (err) {
    console.error('[Cache] Del pattern error:', err.message);
    return false;
  }
}

async function getDepartments() {
  const key = CACHE_PREFIX.DEPARTMENT + 'all';
  return await get(key);
}

async function setDepartments(data) {
  const key = CACHE_PREFIX.DEPARTMENT + 'all';
  return await set(key, data, TTL.DATA);
}

async function invalidateDepartments() {
  return await del(CACHE_PREFIX.DEPARTMENT + 'all');
}

async function getRooms() {
  const key = CACHE_PREFIX.ROOM + 'all';
  return await get(key);
}

async function setRooms(data) {
  const key = CACHE_PREFIX.ROOM + 'all';
  return await set(key, data, TTL.DATA);
}

async function invalidateRooms() {
  return await del(CACHE_PREFIX.ROOM + 'all');
}

async function getDoctors() {
  const key = CACHE_PREFIX.DOCTOR + 'all';
  return await get(key);
}

async function setDoctors(data) {
  const key = CACHE_PREFIX.DOCTOR + 'all';
  return await set(key, data, TTL.DATA);
}

async function invalidateDoctors() {
  return await del(CACHE_PREFIX.DOCTOR + 'all');
}

async function getSettings(key) {
  const cacheKey = CACHE_PREFIX.SETTINGS + key;
  return await get(cacheKey);
}

async function setSettings(key, value) {
  const cacheKey = CACHE_PREFIX.SETTINGS + key;
  return await set(cacheKey, value, TTL.SETTINGS);
}

async function invalidateSettings(key) {
  if (key) {
    return await del(CACHE_PREFIX.SETTINGS + key);
  }
  return await delPattern(CACHE_PREFIX.SETTINGS + '*');
}

async function getAnalytics(key) {
  const cacheKey = CACHE_PREFIX.ANALYTICS + key;
  return await get(cacheKey);
}

async function setAnalytics(key, value) {
  const cacheKey = CACHE_PREFIX.ANALYTICS + key;
  return await set(cacheKey, value, TTL.ANALYTICS);
}

async function invalidateAnalytics() {
  return await delPattern(CACHE_PREFIX.ANALYTICS + '*');
}

async function getCount(table) {
  const key = CACHE_PREFIX.COUNT + table;
  return await get(key);
}

async function setCount(table, count) {
  const key = CACHE_PREFIX.COUNT + table;
  return await set(key, count, TTL.DATA);
}

async function invalidateCount(table) {
  return await del(CACHE_PREFIX.COUNT + table);
}

module.exports = {
  connect,
  isCacheAvailable,
  get,
  set,
  del,
  delPattern,
  getDepartments,
  setDepartments,
  invalidateDepartments,
  getRooms,
  setRooms,
  invalidateRooms,
  getDoctors,
  setDoctors,
  invalidateDoctors,
  getSettings,
  setSettings,
  invalidateSettings,
  getAnalytics,
  setAnalytics,
  invalidateAnalytics,
  getCount,
  setCount,
  invalidateCount,
  TTL,
};