import { Hono } from 'hono';
import { checkHealth, getMetrics, getRecentLogs, getDatabaseStats } from '../services/system';

const getDatabaseFromEnv = (c: any) => c.env.DB;

const system = new Hono();

system.get('/health', async (c) => {
  const db = getDatabaseFromEnv(c);
  const health = await checkHealth(db);
  return c.json(health);
});

system.get('/metrics', async (c) => {
  const db = getDatabaseFromEnv(c);
  const metrics = await getMetrics(db);
  return c.json(metrics);
});

system.get('/logs', async (c) => {
  const db = getDatabaseFromEnv(c);
  const limit = parseInt(c.req.query('limit') || '50');
  const logs = await getRecentLogs(db, Math.min(limit, 100));
  return c.json({ logs, count: logs.length });
});

system.get('/database', async (c) => {
  const db = getDatabaseFromEnv(c);
  const stats = await getDatabaseStats(db);
  return c.json(stats);
});

export { system };
