import { Hono } from 'hono';
import type { Bindings } from '../types';
import { getOverviewStats, getWaitTimeAnalytics, getVolumeAnalytics, getDepartmentPerformance, getPeakHours, getPatientFlow } from '../services/analytics';

const analytics = new Hono<{ Bindings: Bindings }>();

analytics.get('/overview', async (c) => {
  const db = c.env.DB;
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const department = c.req.query('department');

  const stats = await getOverviewStats(db, { startDate, endDate, department: department || undefined });
  return c.json(stats);
});

analytics.get('/wait-times', async (c) => {
  const db = c.env.DB;
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const department = c.req.query('department');

  const waitTimes = await getWaitTimeAnalytics(db, { startDate, endDate, department: department || undefined });
  return c.json(waitTimes);
});

analytics.get('/volume', async (c) => {
  const db = c.env.DB;
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const department = c.req.query('department');

  const volume = await getVolumeAnalytics(db, { startDate, endDate, department: department || undefined });
  return c.json(volume);
});

analytics.get('/departments', async (c) => {
  const db = c.env.DB;
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const department = c.req.query('department');

  const departments = await getDepartmentPerformance(db, { startDate, endDate, department: department || undefined });
  return c.json(departments);
});

analytics.get('/peak-hours', async (c) => {
  const db = c.env.DB;
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const department = c.req.query('department');

  const peakHours = await getPeakHours(db, { startDate, endDate, department: department || undefined });
  return c.json(peakHours);
});

analytics.get('/patient-flow', async (c) => {
  const db = c.env.DB;
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const department = c.req.query('department');

  const flow = await getPatientFlow(db, { startDate, endDate, department: department || undefined });
  return c.json(flow);
});

export { analytics };