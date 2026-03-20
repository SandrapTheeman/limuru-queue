import { D1Database } from '@cloudflare/workers-types';

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  department?: string;
}

export interface OverviewStats {
  totalPatients: number;
  completedPatients: number;
  waitingPatients: number;
  inProgressPatients: number;
  noShowCount: number;
  noShowRate: number;
  avgWaitTime: number | null;
  avgConsultationTime: number | null;
  peakHour: string | null;
  peakDay: string | null;
  comparison: {
    patientsChange: number;
    waitTimeChange: number;
    noShowChange: number;
  };
}

export interface WaitTimeData {
  overall: {
    avg: number;
    median: number;
    p90: number;
    max: number;
    patientsOver30Min: number;
    patientsOver30MinPercent: number;
  };
  byDepartment: {
    department: string;
    avg: number;
    p90: number;
    max: number;
    patientsOver30Min: number;
    percent: number;
  }[];
  byDayOfWeek: {
    day: string;
    avg: number;
  }[];
  byHour: {
    hour: number;
    avg: number;
  }[];
}

export interface VolumeData {
  total: number;
  daily: {
    date: string;
    count: number;
    completed: number;
  }[];
  byDepartment: {
    department: string;
    count: number;
    percent: number;
  }[];
  trend: {
    change: number;
    direction: 'up' | 'down' | 'stable';
  };
}

export interface DepartmentPerformance {
  department: string;
  patients: number;
  completed: number;
  avgWaitTime: number;
  maxWaitTime: number;
  noShowRate: number;
  doctorCount: number;
  avgConsultationTime: number;
}

export interface PeakHourData {
  heatmap: {
    day: string;
    hour: number;
    count: number;
    level: 'low' | 'medium' | 'high';
  }[];
  peakTimes: {
    day: string;
    hour: number;
    count: number;
  }[];
  distribution: {
    hour: number;
    count: number;
    percent: number;
  }[];
}

export interface PatientFlowData {
  statusBreakdown: {
    status: string;
    count: number;
    percent: number;
  }[];
  hourlyFlow: {
    hour: number;
    arrived: number;
    completed: number;
    stillWaiting: number;
  }[];
  avgTimeInSystem: number;
  avgTimeToConsultation: number;
  avgConsultationDuration: number;
}

function getDateRange(filters: AnalyticsFilters): { start: string; end: string } {
  const now = new Date();
  const today = now.toISOString().split('T')[0] ?? now.toISOString().substring(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const end: string = filters.endDate ?? today;
  const start: string = filters.startDate ?? weekAgo;
  return { start, end };
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

function getDayName(day: string | undefined): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const idx = parseInt(day || '0');
  return days[idx] || 'Unknown';
}

export async function getOverviewStats(
  db: D1Database,
  filters: AnalyticsFilters = {}
): Promise<OverviewStats> {
  const { start, end } = getDateRange(filters);
  
  const currentPeriod = await db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show,
      AVG(wait_time_minutes) as avg_wait
    FROM visits
    WHERE date(created_at) BETWEEN ? AND ?
    ${filters.department ? 'AND department = ?' : ''}
  `).bind(
    start,
    end,
    ...(filters.department ? [filters.department] : [])
  ).first() as { total: number; completed: number; waiting: number; in_progress: number; no_show: number; avg_wait: number | null } | undefined;

  const prevStart = new Date(new Date(start).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const prevEnd = new Date(new Date(end).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const previousPeriod = await db.prepare(`
    SELECT 
      COUNT(*) as total,
      AVG(wait_time_minutes) as avg_wait
    FROM visits
    WHERE date(created_at) BETWEEN ? AND ?
  `).bind(prevStart, prevEnd).first() as { total: number; avg_wait: number | null } | undefined;

  const peakHourResult = await db.prepare(`
    SELECT strftime('%H', created_at) as hour, COUNT(*) as count
    FROM visits
    WHERE date(created_at) BETWEEN ? AND ?
    GROUP BY hour
    ORDER BY count DESC
    LIMIT 1
  `).bind(start, end).first() as { hour: string; count: number } | undefined;

  const peakDayResult = await db.prepare(`
    SELECT strftime('%w', created_at) as day, COUNT(*) as count
    FROM visits
    WHERE date(created_at) BETWEEN ? AND ?
    GROUP BY day
    ORDER BY count DESC
    LIMIT 1
  `).bind(start, end).first() as { day: string; count: number } | undefined;

  const hourNum = peakHourResult?.hour ? parseInt(peakHourResult.hour) : null;
  const peakHour = hourNum !== null && !isNaN(hourNum) ? `${hourNum.toString().padStart(2, '0')}:00` : null;
  const peakDay = peakDayResult?.day ? getDayName(peakDayResult.day) : null;

  return {
    totalPatients: currentPeriod?.total || 0,
    completedPatients: currentPeriod?.completed || 0,
    waitingPatients: currentPeriod?.waiting || 0,
    inProgressPatients: currentPeriod?.in_progress || 0,
    noShowCount: currentPeriod?.no_show || 0,
    noShowRate: currentPeriod?.total ? Math.round((currentPeriod.no_show / currentPeriod.total) * 1000) / 10 : 0,
    avgWaitTime: currentPeriod?.avg_wait ?? null,
    avgConsultationTime: null,
    peakHour,
    peakDay,
    comparison: {
      patientsChange: calculateChange(currentPeriod?.total || 0, previousPeriod?.total || 0),
      waitTimeChange: calculateChange(currentPeriod?.avg_wait || 0, previousPeriod?.avg_wait || 0),
      noShowChange: 0,
    },
  };
}

export async function getWaitTimeAnalytics(
  db: D1Database,
  filters: AnalyticsFilters = {}
): Promise<WaitTimeData> {
  const { start, end } = getDateRange(filters);

  const overall = await db.prepare(`
    SELECT 
      AVG(wait_time_minutes) as avg,
      MAX(wait_time_minutes) as max,
      SUM(CASE WHEN wait_time_minutes > 30 THEN 1 ELSE 0 END) as over30
    FROM visits
    WHERE wait_time_minutes IS NOT NULL
    AND date(created_at) BETWEEN ? AND ?
    ${filters.department ? 'AND department = ?' : ''}
  `).bind(start, end, ...(filters.department ? [filters.department] : [])).first() as { avg: number | null; max: number | null; over30: number } | undefined;

  const totalWithWait = await db.prepare(`
    SELECT COUNT(*) as cnt FROM visits WHERE wait_time_minutes IS NOT NULL AND date(created_at) BETWEEN ? AND ?
    ${filters.department ? 'AND department = ?' : ''}
  `).bind(start, end, ...(filters.department ? [filters.department] : [])).first() as { cnt: number } | undefined;

  const byDepartmentRaw = await db.prepare(`
    SELECT 
      department,
      AVG(wait_time_minutes) as avg,
      MAX(wait_time_minutes) as max,
      SUM(CASE WHEN wait_time_minutes > 30 THEN 1 ELSE 0 END) as over30,
      COUNT(*) as total
    FROM visits
    WHERE wait_time_minutes IS NOT NULL
    AND date(created_at) BETWEEN ? AND ?
    GROUP BY department
    ORDER BY avg DESC
  `).bind(start, end).all() as unknown as { department: string; avg: number; max: number; over30: number; total: number }[];

  const byDayOfWeekRaw = await db.prepare(`
    SELECT 
      strftime('%w', created_at) as day,
      AVG(wait_time_minutes) as avg
    FROM visits
    WHERE wait_time_minutes IS NOT NULL
    AND date(created_at) BETWEEN ? AND ?
    GROUP BY day
  `).bind(start, end).all() as unknown as { day: string; avg: number }[];

  const byHourRaw = await db.prepare(`
    SELECT 
      CAST(strftime('%H', created_at) AS INTEGER) as hour,
      AVG(wait_time_minutes) as avg
    FROM visits
    WHERE wait_time_minutes IS NOT NULL
    AND date(created_at) BETWEEN ? AND ?
    GROUP BY hour
    ORDER BY hour
  `).bind(start, end).all() as unknown as { hour: number; avg: number }[];

  return {
    overall: {
      avg: overall?.avg ?? 0,
      median: overall?.avg ?? 0,
      p90: (overall?.avg ?? 0) * 1.5,
      max: overall?.max ?? 0,
      patientsOver30Min: overall?.over30 ?? 0,
      patientsOver30MinPercent: totalWithWait?.cnt ? Math.round((overall?.over30 || 0) / totalWithWait.cnt * 100) : 0,
    },
    byDepartment: (byDepartmentRaw || []).map(d => ({
      department: d.department,
      avg: Math.round(d.avg * 10) / 10,
      p90: Math.round(d.avg * 1.5),
      max: d.max,
      patientsOver30Min: d.over30,
      percent: Math.round((d.over30 / d.total) * 100),
    })),
    byDayOfWeek: (byDayOfWeekRaw || []).map(d => ({
      day: getDayName(d.day),
      avg: Math.round(d.avg * 10) / 10,
    })),
    byHour: (byHourRaw || []).map(h => ({
      hour: h.hour,
      avg: Math.round(h.avg * 10) / 10,
    })),
  };
}

export async function getVolumeAnalytics(
  db: D1Database,
  filters: AnalyticsFilters = {}
): Promise<VolumeData> {
  const { start, end } = getDateRange(filters);

  const total = await db.prepare(`
    SELECT COUNT(*) as cnt FROM visits
    WHERE date(created_at) BETWEEN ? AND ?
    ${filters.department ? 'AND department = ?' : ''}
  `).bind(start, end, ...(filters.department ? [filters.department] : [])).first() as { cnt: number } | undefined;

  const dailyRaw = await db.prepare(`
    SELECT 
      date(created_at) as date,
      COUNT(*) as count,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM visits
    WHERE date(created_at) BETWEEN ? AND ?
    ${filters.department ? 'AND department = ?' : ''}
    GROUP BY date(created_at)
    ORDER BY date
  `).bind(start, end, ...(filters.department ? [filters.department] : [])).all() as unknown as { date: string; count: number; completed: number }[];

  const byDepartmentRaw = await db.prepare(`
    SELECT 
      department,
      COUNT(*) as count
    FROM visits
    WHERE date(created_at) BETWEEN ? AND ?
    GROUP BY department
    ORDER BY count DESC
  `).bind(start, end).all() as unknown as { department: string; count: number }[];

  const prevStart = new Date(new Date(start).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const prevEnd = new Date(new Date(end).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const prevTotal = await db.prepare(`
    SELECT COUNT(*) as cnt FROM visits
    WHERE date(created_at) BETWEEN ? AND ?
  `).bind(prevStart, prevEnd).first() as { cnt: number } | undefined;

  const change = calculateChange(total?.cnt || 0, prevTotal?.cnt || 0);

  return {
    total: total?.cnt || 0,
    daily: (dailyRaw || []).map(d => ({
      date: d.date,
      count: d.count,
      completed: d.completed,
    })),
    byDepartment: (byDepartmentRaw || []).map(d => ({
      department: d.department,
      count: d.count,
      percent: Math.round((d.count / (total?.cnt || 1)) * 100),
    })),
    trend: {
      change,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    },
  };
}

export async function getDepartmentPerformance(
  db: D1Database,
  filters: AnalyticsFilters = {}
): Promise<DepartmentPerformance[]> {
  const { start, end } = getDateRange(filters);

  const resultRaw = await db.prepare(`
    SELECT 
      v.department,
      COUNT(*) as patients,
      SUM(CASE WHEN v.status = 'completed' THEN 1 ELSE 0 END) as completed,
      AVG(v.wait_time_minutes) as avg_wait,
      MAX(v.wait_time_minutes) as max_wait,
      SUM(CASE WHEN v.status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
      (SELECT COUNT(*) FROM doctors d WHERE d.department = v.department AND d.is_available = 1) as doctors
    FROM visits v
    WHERE date(v.created_at) BETWEEN ? AND ?
    ${filters.department ? 'AND v.department = ?' : ''}
    GROUP BY v.department
    ORDER BY patients DESC
  `).bind(start, end, ...(filters.department ? [filters.department] : [])).all() as unknown as { department: string; patients: number; completed: number; avg_wait: number | null; max_wait: number | null; no_shows: number; doctors: number }[];

  return (resultRaw || []).map(r => ({
    department: r.department,
    patients: r.patients,
    completed: r.completed,
    avgWaitTime: Math.round((r.avg_wait || 0) * 10) / 10,
    maxWaitTime: r.max_wait || 0,
    noShowRate: r.patients ? Math.round((r.no_shows / r.patients) * 1000) / 10 : 0,
    doctorCount: r.doctors || 0,
    avgConsultationTime: 0,
  }));
}

export async function getPeakHours(
  db: D1Database,
  filters: AnalyticsFilters = {}
): Promise<PeakHourData> {
  const { start, end } = getDateRange(filters);

  const hourlyDataRaw = await db.prepare(`
    SELECT 
      strftime('%w', created_at) as day,
      CAST(strftime('%H', created_at) AS INTEGER) as hour,
      COUNT(*) as count
    FROM visits
    WHERE date(created_at) BETWEEN ? AND ?
    GROUP BY day, hour
    ORDER BY count DESC
  `).bind(start, end).all() as unknown as { day: string; hour: number; count: number }[];

  const maxCount = Math.max(...(hourlyDataRaw || []).map(h => h.count), 1);

  const heatmap = (hourlyDataRaw || []).map(h => ({
    day: getDayName(h.day),
    hour: h.hour,
    count: h.count,
    level: h.count >= maxCount * 0.7 ? 'high' as const : h.count >= maxCount * 0.4 ? 'medium' as const : 'low' as const,
  }));

  const peakTimes = heatmap.slice(0, 5).map(h => ({
    day: h.day,
    hour: h.hour,
    count: h.count,
  }));

  const distributionRaw = await db.prepare(`
    SELECT 
      CAST(strftime('%H', created_at) AS INTEGER) as hour,
      COUNT(*) as count
    FROM visits
    WHERE date(created_at) BETWEEN ? AND ?
    GROUP BY hour
    ORDER BY hour
  `).bind(start, end).all() as unknown as { hour: number; count: number }[];

  const total = (distributionRaw || []).reduce((sum, d) => sum + d.count, 0);

  return {
    heatmap,
    peakTimes,
    distribution: (distributionRaw || []).map(d => ({
      hour: d.hour,
      count: d.count,
      percent: total ? Math.round((d.count / total) * 100) : 0,
    })),
  };
}

export async function getPatientFlow(
  db: D1Database,
  filters: AnalyticsFilters = {}
): Promise<PatientFlowData> {
  const { start, end } = getDateRange(filters);

  const statusRaw = await db.prepare(`
    SELECT 
      status,
      COUNT(*) as count
    FROM visits
    WHERE date(created_at) BETWEEN ? AND ?
    GROUP BY status
  `).bind(start, end).all() as unknown as { status: string; count: number }[];

  const totalStatus = (statusRaw || []).reduce((sum, s) => sum + s.count, 0);

  const hourlyFlowRaw = await db.prepare(`
    SELECT 
      CAST(strftime('%H', created_at) AS INTEGER) as hour,
      COUNT(*) as arrived,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM visits
    WHERE date(created_at) BETWEEN ? AND ?
    GROUP BY hour
    ORDER BY hour
  `).bind(start, end).all() as unknown as { hour: number; arrived: number; completed: number }[];

  const avgWaitResult = await db.prepare(`
    SELECT AVG(wait_time_minutes) as avg FROM visits
    WHERE wait_time_minutes IS NOT NULL AND date(created_at) BETWEEN ? AND ?
  `).bind(start, end).first() as { avg: number | null } | undefined;

  return {
    statusBreakdown: (statusRaw || []).map(s => ({
      status: s.status,
      count: s.count,
      percent: totalStatus ? Math.round((s.count / totalStatus) * 100) : 0,
    })),
    hourlyFlow: (hourlyFlowRaw || []).map(h => ({
      hour: h.hour,
      arrived: h.arrived,
      completed: h.completed,
      stillWaiting: h.arrived - h.completed,
    })),
    avgTimeInSystem: Math.round(avgWaitResult?.avg || 0),
    avgTimeToConsultation: Math.round(avgWaitResult?.avg || 0),
    avgConsultationDuration: 0,
  };
}