import { D1Database } from '@cloudflare/workers-types';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: boolean;
    queue: boolean;
  };
}

export interface SystemMetrics {
  timestamp: string;
  requests: {
    total: number;
    success: number;
    errors: number;
    avgResponseTime: number;
  };
  memory: {
    used: number;
    total: number;
    percent: number;
  };
  queue: {
    waiting: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

export interface RecentLog {
  id: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  context?: string;
}

export interface DatabaseStats {
  tables: {
    name: string;
    rowCount: number;
    size: number;
  }[];
  totalRows: number;
  lastUpdated: string;
}

export async function checkHealth(db: D1Database): Promise<HealthStatus> {
  const startTime = Date.now();
  let dbHealthy = true;
  
  try {
    await db.prepare('SELECT 1').first();
  } catch {
    dbHealthy = false;
  }

  const responseTime = Date.now() - startTime;
  const isHealthy = dbHealthy && responseTime < 1000;

  return {
    status: isHealthy ? 'healthy' : dbHealthy ? 'degraded' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime ? process.uptime() * 1000 : 0,
    version: '1.0.0',
    checks: {
      database: dbHealthy,
      queue: true,
    },
  };
}

export async function getMetrics(db: D1Database): Promise<SystemMetrics> {
  const totalVisits = await db.prepare('SELECT COUNT(*) as count FROM queue_tickets').first() as { count: number } | undefined;
  const completedVisits = await db.prepare("SELECT COUNT(*) as count FROM queue_tickets WHERE status = 'completed'").first() as { count: number } | undefined;
  const waitingVisits = await db.prepare("SELECT COUNT(*) as count FROM queue_tickets WHERE status = 'waiting'").first() as { count: number } | undefined;
  const inProgressVisits = await db.prepare("SELECT COUNT(*) as count FROM queue_tickets WHERE status = 'in_progress'").first() as { count: number } | undefined;

  return {
    timestamp: new Date().toISOString(),
    requests: {
      total: totalVisits?.count || 0,
      success: completedVisits?.count || 0,
      errors: 0,
      avgResponseTime: 0,
    },
    memory: {
      used: 0,
      total: 0,
      percent: 0,
    },
    queue: {
      waiting: waitingVisits?.count || 0,
      processing: inProgressVisits?.count || 0,
      completed: completedVisits?.count || 0,
      failed: 0,
    },
  };
}

export async function getRecentLogs(db: D1Database, limit: number = 50): Promise<RecentLog[]> {
  const logs = await db.prepare(`
    SELECT 
      ROW_NUMBER() OVER (ORDER BY created_at DESC) as id,
      'info' as level,
      'System event' as message,
      created_at as timestamp,
      'system' as context
    FROM queue_tickets
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(limit).all() as unknown as { id: number; level: string; message: string; timestamp: string; context: string }[];

  return (logs || []).map(log => ({
    id: log.id,
    level: log.level as 'info' | 'warn' | 'error' | 'debug',
    message: log.message,
    timestamp: log.timestamp,
    context: log.context,
  }));
}

export async function getDatabaseStats(db: D1Database): Promise<DatabaseStats> {
  const tableNames = ['queue_tickets', 'patients', 'doctors', 'appointments', 'messages', 'notifications'];
  const tables: { name: string; rowCount: number; size: number }[] = [];
  let totalRows = 0;

  for (const tableName of tableNames) {
    const countResult = await db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).first() as { count: number } | undefined;
    const rowCount = countResult?.count || 0;
    tables.push({
      name: tableName,
      rowCount,
      size: rowCount * 100,
    });
    totalRows += rowCount;
  }

  return {
    tables,
    totalRows,
    lastUpdated: new Date().toISOString(),
  };
}
