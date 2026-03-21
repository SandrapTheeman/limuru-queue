import type { D1Database } from '@cloudflare/workers-types';

export interface QueryTiming {
  query: string;
  duration: number;
  timestamp: number;
  params?: unknown[];
}

export interface SlowQuery {
  query: string;
  avgDuration: number;
  count: number;
  lastSeen: number;
}

export interface QueryStats {
  totalQueries: number;
  totalDuration: number;
  avgDuration: number;
  slowQueries: number;
  slowestQuery: { query: string; duration: number } | null;
}

const queryTimings: Map<string, QueryTiming[]> = new Map();
const SLOW_QUERY_THRESHOLD_MS = 100;
const MAX_TIMINGS_PER_QUERY = 100;

function normalizeQuery(sql: string): string {
  return sql
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim()
    .substring(0, 200);
}

function recordTiming(query: string, duration: number, params?: unknown[]): void {
  const normalized = normalizeQuery(query);
  const timings = queryTimings.get(normalized) || [];
  
  timings.push({
    query: normalized,
    duration,
    timestamp: Date.now(),
    params,
  });
  
  if (timings.length > MAX_TIMINGS_PER_QUERY) {
    timings.shift();
  }
  
  queryTimings.set(normalized, timings);
}

export function getQueryStats(): QueryStats {
  let totalQueries = 0;
  let totalDuration = 0;
  let slowQueries = 0;
  let slowestQuery: { query: string; duration: number } | null = null;
  
  for (const [, timings] of queryTimings) {
    for (const timing of timings) {
      totalQueries++;
      totalDuration += timing.duration;
      if (timing.duration > SLOW_QUERY_THRESHOLD_MS) {
        slowQueries++;
      }
      if (!slowestQuery || timing.duration > slowestQuery.duration) {
        slowestQuery = { query: timing.query, duration: timing.duration };
      }
    }
  }
  
  return {
    totalQueries,
    totalDuration,
    avgDuration: totalQueries > 0 ? totalDuration / totalQueries : 0,
    slowQueries,
    slowestQuery,
  };
}

export function getSlowQueries(thresholdMs: number = 100): SlowQuery[] {
  const slowQueries: Map<string, SlowQuery> = new Map();
  
  for (const [query, timings] of queryTimings) {
    const slowTimings = timings.filter(t => t.duration > thresholdMs);
    if (slowTimings.length > 0) {
      const avgDuration = slowTimings.reduce((sum, t) => sum + t.duration, 0) / slowTimings.length;
      slowQueries.set(query, {
        query,
        avgDuration,
        count: slowTimings.length,
        lastSeen: Math.max(...slowTimings.map(t => t.timestamp)),
      });
    }
  }
  
  return Array.from(slowQueries.values())
    .sort((a, b) => b.avgDuration - a.avgDuration);
}

export function clearStats(): void {
  queryTimings.clear();
}

export async function monitoredQuery<T>(
  db: D1Database,
  sql: string,
  params?: unknown[]
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await db.prepare(sql).bind(...(params || [])).all();
    const duration = performance.now() - start;
    
    recordTiming(sql, duration, params);
    
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`[SLOW QUERY] ${duration.toFixed(2)}ms: ${normalizeQuery(sql)}`);
    }
    
    return result.results as unknown as T;
  } finally {
    const duration = performance.now() - start;
    recordTiming(sql, duration, params);
  }
}

export async function monitoredQueryFirst<T>(
  db: D1Database,
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const start = performance.now();
  
  try {
    const result = await db.prepare(sql).bind(...(params || [])).first();
    const duration = performance.now() - start;
    
    recordTiming(sql, duration, params);
    
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`[SLOW QUERY] ${duration.toFixed(2)}ms: ${normalizeQuery(sql)}`);
    }
    
    return result as T | null;
  } finally {
    const duration = performance.now() - start;
    recordTiming(sql, duration, params);
  }
}

export async function monitoredRun(
  db: D1Database,
  sql: string,
  params?: unknown[]
): Promise<{ success: boolean; duration: number }> {
  const start = performance.now();
  
  try {
    await db.prepare(sql).bind(...(params || [])).run();
    const duration = performance.now() - start;
    
    recordTiming(sql, duration, params);
    
    return { success: true, duration };
  } catch (error) {
    const duration = performance.now() - start;
    recordTiming(sql, duration, params);
    throw error;
  }
}

export function createQueryMonitor() {
  return {
    monitoredQuery,
    monitoredQueryFirst,
    monitoredRun,
    getQueryStats,
    getSlowQueries,
    clearStats,
  };
}

export type QueryMonitor = ReturnType<typeof createQueryMonitor>;
