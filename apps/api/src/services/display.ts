// Display Service - Queue display data for TV screens
import { generateId, now } from '../utils';

export interface QueueDisplayItem {
  id: string;
  ticket_number: string;
  patient_name: string;
  priority: boolean;
  status: string;
  created_at: string;
  wait_time_minutes: number;
  doctor_name?: string;
  room?: string;
}

export interface QueueDisplay {
  waiting: QueueDisplayItem[];
  called: QueueDisplayItem[];
  in_progress: QueueDisplayItem[];
  stats: {
    waiting_count: number;
    called_count: number;
    in_progress_count: number;
    completed_today: number;
    average_wait_time: number;
  };
  last_updated: string;
}

export interface AnnouncementItem {
  id: string;
  ticket_number: string;
  patient_name: string;
  doctor_name: string;
  room: string;
  called_at: string;
  duration_seconds: number;
}

export interface HealthTipItem {
  id: string;
  title: string;
  content: string;
  category: string;
  display_order: number;
}

export async function getQueueDisplay(
  db: D1Database,
  options?: {
    department?: string;
    limit?: number;
    showCompleted?: boolean;
  }
): Promise<QueueDisplay> {
  const department = options?.department;
  const limit = options?.limit || 50;
  const deptFilter = department ? ` AND v.department = ?` : '';
  const deptParams = department ? [department] : [];
  
  const waitingPatients = await db.prepare(`
    SELECT v.id, v.ticket_number, p.name as patient_name, v.priority, v.status, 
           v.created_at, v.wait_time_minutes
    FROM queue_tickets v
    LEFT JOIN patients p ON v.patient_id = p.id
    WHERE v.status = 'waiting'${deptFilter}
    ORDER BY v.priority DESC, v.created_at ASC
    LIMIT ?
  `).bind(...deptParams, limit).all();
  
  const calledPatients = await db.prepare(`
    SELECT v.id, v.ticket_number, p.name as patient_name, v.priority, v.status,
           v.created_at, v.called_at, v.wait_time_minutes,
           d.name as doctor_name, d.room
    FROM queue_tickets v
    LEFT JOIN patients p ON v.patient_id = p.id
    LEFT JOIN doctors d ON v.doctor_id = d.id
    WHERE v.status = 'called'${deptFilter}
    ORDER BY v.called_at DESC
    LIMIT ?
  `).bind(...deptParams, 10).all();
  
  const inProgressPatients = await db.prepare(`
    SELECT v.id, v.ticket_number, p.name as patient_name, v.priority, v.status,
           v.created_at, v.started_at, v.wait_time_minutes,
           d.name as doctor_name, d.room
    FROM queue_tickets v
    LEFT JOIN patients p ON v.patient_id = p.id
    LEFT JOIN doctors d ON v.doctor_id = d.id
    WHERE v.status = 'in_progress'${deptFilter}
    ORDER BY v.started_at ASC
    LIMIT ?
  `).bind(...deptParams, 10).all();
  
  const stats = await db.prepare(`
    SELECT 
      COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_count,
      COUNT(CASE WHEN status = 'called' THEN 1 END) as called_count,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
      COUNT(CASE WHEN status = 'completed' AND date(completed_at) = date('now') THEN 1 END) as completed_today
    FROM queue_tickets
    WHERE 1=1${deptFilter}
  `).bind(...deptParams).first() as {
    waiting_count: number;
    called_count: number;
    in_progress_count: number;
    completed_today: number;
  } | undefined;
  
  const avgWaitTime = await db.prepare(`
    SELECT AVG(wait_time_minutes) as avg_wait
    FROM queue_tickets
    WHERE wait_time_minutes IS NOT NULL
    AND date(created_at) = date('now')
    ${deptFilter}
  `).bind(...deptParams).first() as { avg_wait: number } | undefined;
  
  return {
    waiting: (waitingPatients.results || []).map((v: any) => ({
      id: v.id,
      ticket_number: v.ticket_number,
      patient_name: v.patient_name || 'Guest',
      priority: Boolean(v.priority),
      status: v.status,
      created_at: v.created_at,
      wait_time_minutes: v.wait_time_minutes || Math.floor((Date.now() - new Date(v.created_at).getTime()) / 60000),
    })),
    called: (calledPatients.results || []).map((v: any) => ({
      id: v.id,
      ticket_number: v.ticket_number,
      patient_name: v.patient_name || 'Guest',
      priority: Boolean(v.priority),
      status: v.status,
      created_at: v.created_at,
      wait_time_minutes: v.wait_time_minutes || 0,
      doctor_name: v.doctor_name || 'Unknown',
      room: v.room || 'TBD',
    })),
    in_progress: (inProgressPatients.results || []).map((v: any) => ({
      id: v.id,
      ticket_number: v.ticket_number,
      patient_name: v.patient_name || 'Guest',
      priority: Boolean(v.priority),
      status: v.status,
      created_at: v.created_at,
      wait_time_minutes: v.wait_time_minutes || 0,
      doctor_name: v.doctor_name || 'Unknown',
      room: v.room || 'TBD',
    })),
    stats: {
      waiting_count: stats?.waiting_count || 0,
      called_count: stats?.called_count || 0,
      in_progress_count: stats?.in_progress_count || 0,
      completed_today: stats?.completed_today || 0,
      average_wait_time: Math.round(avgWaitTime?.avg_wait || 0),
    },
    last_updated: now(),
  };
}

export async function getAnnouncements(
  db: D1Database,
  options?: {
    department?: string;
    limit?: number;
    since?: string;
  }
): Promise<AnnouncementItem[]> {
  const department = options?.department;
  const limit = options?.limit || 20;
  const since = options?.since;
  
  let sql = `
    SELECT v.id, v.ticket_number, p.name as patient_name,
           d.name as doctor_name, d.room, v.called_at
    FROM queue_tickets v
    LEFT JOIN patients p ON v.patient_id = p.id
    LEFT JOIN doctors d ON v.doctor_id = d.id
    WHERE v.status = 'called'
  `;
  const params: unknown[] = [];
  
  if (department) {
    sql += ` AND v.department = ?`;
    params.push(department);
  }
  
  if (since) {
    sql += ` AND v.called_at >= ?`;
    params.push(since);
  }
  
  sql += ` ORDER BY v.called_at DESC LIMIT ?`;
  params.push(limit);
  
  const result = await db.prepare(sql).bind(...params).all();
  
  return (result.results || []).map((v: any) => ({
    id: v.id,
    ticket_number: v.ticket_number,
    patient_name: v.patient_name || 'Guest',
    doctor_name: v.doctor_name || 'Unknown',
    room: v.room || 'TBD',
    called_at: v.called_at,
    duration_seconds: 30,
  }));
}

export async function getHealthTips(
  db: D1Database,
  options?: {
    limit?: number;
    category?: string;
  }
): Promise<HealthTipItem[]> {
  const limit = options?.limit || 5;
  const category = options?.category;
  
  let sql = `SELECT * FROM health_tips WHERE is_active = 1`;
  const params: unknown[] = [];
  
  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }
  
  sql += ` ORDER BY display_order ASC, created_at DESC LIMIT ?`;
  params.push(limit);
  
  const result = await db.prepare(sql).bind(...params).all();
  
  if (result.results && result.results.length > 0) {
    return (result.results || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      content: t.content,
      category: t.category,
      display_order: t.display_order || 0,
    }));
  }
  
  return [
    { id: '1', title: 'Stay Hydrated', content: 'Drink at least 8 glasses of water daily for optimal health.', category: 'general', display_order: 1 },
    { id: '2', title: 'Regular Exercise', content: 'Aim for 30 minutes of physical activity most days of the week.', category: 'fitness', display_order: 2 },
    { id: '3', title: 'Balanced Diet', content: 'Eat a variety of fruits, vegetables, and whole grains daily.', category: 'nutrition', display_order: 3 },
    { id: '4', title: 'Quality Sleep', content: 'Adults should aim for 7-9 hours of quality sleep each night.', category: 'wellness', display_order: 4 },
    { id: '5', title: 'Hand Hygiene', content: 'Wash hands frequently with soap for at least 20 seconds.', category: 'prevention', display_order: 5 },
  ];
}

export async function getDisplayConfig(
  db: D1Database,
  displayId: string
): Promise<any> {
  const result = await db.prepare(`
    SELECT d.*, dept.name as department_name
    FROM display_configs d
    LEFT JOIN departments dept ON d.department_id = dept.id
    WHERE d.id = ?
  `).bind(displayId).first();
  
  if (result) {
    await db.prepare(`
      UPDATE display_configs SET last_seen = ? WHERE id = ?
    `).bind(now(), displayId).run();
  }
  
  return result;
}

export async function getDisplayData(
  db: D1Database,
  displayId: string
): Promise<{
  display: any;
  queue: QueueDisplay;
  announcements: AnnouncementItem[];
  healthTips: HealthTipItem[];
  ipTvChannel: any;
  settings: Record<string, string>;
}> {
  const display = await getDisplayConfig(db, displayId);
  
  if (!display) {
    throw new Error('Display not found');
  }
  
  const department = display.department_id;
  
  const [queue, announcements, healthTips] = await Promise.all([
    getQueueDisplay(db, { department, limit: 20 }),
    getAnnouncements(db, { department, limit: 10 }),
    getHealthTips(db, { limit: 5 }),
  ]);
  
  let ipTvChannel = null;
  if (display.show_ip_tv && display.ip_tv_channel_id) {
    ipTvChannel = await db.prepare(`
      SELECT * FROM iptv_channels WHERE id = ? AND is_active = 1
    `).bind(display.ip_tv_channel_id).first();
  }
  
  const settingsResult = await db.prepare(`
    SELECT key, value FROM settings WHERE key IN ('clinic_name', 'clinic_address', 'clinic_phone')
  `).all();
  
  const settings: Record<string, string> = {};
  for (const s of settingsResult.results as { key: string; value: string }[]) {
    settings[s.key] = s.value;
  }
  
  return {
    display,
    queue,
    announcements,
    healthTips,
    ipTvChannel,
    settings,
  };
}
