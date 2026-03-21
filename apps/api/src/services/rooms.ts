import { D1Database } from '@cloudflare/workers-types';
import { Room, RoomSchedule, RoomAssignment, RoomOccupancy, RoomType, RoomStatus } from '../db/schema';
import { generateId, now } from '../utils';

export interface CreateRoomParams {
  roomNumber: string;
  name?: string;
  roomType: RoomType;
  departmentId?: string;
  floor?: string;
  building?: string;
  capacity?: number;
  equipment?: string[];
  amenities?: string[];
  notes?: string;
  displayOrder?: number;
}

export interface UpdateRoomParams {
  roomNumber?: string;
  name?: string;
  roomType?: RoomType;
  departmentId?: string;
  floor?: string;
  building?: string;
  capacity?: number;
  status?: RoomStatus;
  equipment?: string[];
  amenities?: string[];
  notes?: string;
  displayOrder?: number;
}

export interface CreateRoomScheduleParams {
  roomId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
  recurring?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  notes?: string;
}

export interface CreateRoomAssignmentParams {
  roomId: string;
  doctorId: string;
  assignmentType?: 'primary' | 'secondary' | 'temporary';
  startDate: string;
  endDate?: string;
  schedule?: string;
  notes?: string;
}

export interface RoomFilters {
  departmentId?: string;
  roomType?: RoomType;
  status?: RoomStatus;
  isAvailable?: boolean;
  limit?: number;
  offset?: number;
}

export async function createRoom(
  db: D1Database,
  params: CreateRoomParams
): Promise<Room> {
  const id = generateId('room');
  const createdAt = now();

  await db.prepare(`
    INSERT INTO rooms (id, room_number, room_name, room_type, department_id, floor, building, 
      capacity, status, equipment, amenities, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?, ?, ?, ?)
  `).bind(
    id,
    params.roomNumber,
    params.name || null,
    params.roomType,
    params.departmentId || null,
    params.floor || null,
    params.building || null,
    params.capacity || 1,
    params.equipment ? JSON.stringify(params.equipment) : null,
    params.amenities ? JSON.stringify(params.amenities) : null,
    params.notes || null,
    createdAt,
    createdAt
  ).run();

  const room = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(id).first() as Room;
  return room;
}

export async function getRoom(
  db: D1Database,
  roomId: string
): Promise<Room | null> {
  const room = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(roomId).first() as Room | undefined;
  return room || null;
}

export async function getRooms(
  db: D1Database,
  filters: RoomFilters = {}
): Promise<{ rooms: Room[]; total: number }> {
  const { departmentId, roomType, status, limit = 50, offset = 0 } = filters;

  let sql = `
    SELECT r.*, d.name as department_name
    FROM rooms r
    LEFT JOIN departments d ON r.department_id = d.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (departmentId) {
    sql += ` AND r.department_id = ?`;
    params.push(departmentId);
  }

  if (roomType) {
    sql += ` AND r.room_type = ?`;
    params.push(roomType);
  }

  if (status) {
    sql += ` AND r.status = ?`;
    params.push(status);
  }

  const countSql = sql.replace(/LEFT JOIN.*ON.*/, '').replace(/SELECT r\.\*,.*FROM/, 'SELECT COUNT(*) as count FROM rooms r WHERE 1=1');
  const countResult = await db.prepare(countSql).bind(...params).first() as unknown as { count: number };

  sql += ` ORDER BY r.room_number ASC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await db.prepare(sql).bind(...params).all();

  return {
    rooms: (result.results as unknown) as Room[],
    total: countResult?.count || 0,
  };
}

export async function updateRoom(
  db: D1Database,
  roomId: string,
  params: UpdateRoomParams
): Promise<Room | null> {
  const room = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(roomId).first() as Room | undefined;

  if (!room) {
    return null;
  }

  const updates: string[] = [];
  const updateParams: unknown[] = [];

  if (params.roomNumber !== undefined) {
    updates.push(`room_number = ?`);
    updateParams.push(params.roomNumber);
  }
  if (params.name !== undefined) {
    updates.push(`room_name = ?`);
    updateParams.push(params.name);
  }
  if (params.roomType !== undefined) {
    updates.push(`room_type = ?`);
    updateParams.push(params.roomType);
  }
  if (params.departmentId !== undefined) {
    updates.push(`department_id = ?`);
    updateParams.push(params.departmentId);
  }
  if (params.floor !== undefined) {
    updates.push(`floor = ?`);
    updateParams.push(params.floor);
  }
  if (params.building !== undefined) {
    updates.push(`building = ?`);
    updateParams.push(params.building);
  }
  if (params.capacity !== undefined) {
    updates.push(`capacity = ?`);
    updateParams.push(params.capacity);
  }
  if (params.status !== undefined) {
    updates.push(`status = ?`);
    updateParams.push(params.status);
  }
  if (params.equipment !== undefined) {
    updates.push(`equipment = ?`);
    updateParams.push(JSON.stringify(params.equipment));
  }
  if (params.amenities !== undefined) {
    updates.push(`amenities = ?`);
    updateParams.push(JSON.stringify(params.amenities));
  }
  if (params.notes !== undefined) {
    updates.push(`notes = ?`);
    updateParams.push(params.notes);
  }

  if (updates.length === 0) {
    return room;
  }

  updates.push(`updated_at = ?`);
  updateParams.push(now());
  updateParams.push(roomId);

  await db.prepare(`UPDATE rooms SET ${updates.join(', ')} WHERE id = ?`).bind(...updateParams).run();

  const updated = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(roomId).first() as Room;
  return updated;
}

export async function deleteRoom(
  db: D1Database,
  roomId: string
): Promise<boolean> {
  const room = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(roomId).first();

  if (!room) {
    return false;
  }

  await db.prepare('DELETE FROM rooms WHERE id = ?').bind(roomId).run();
  return true;
}

export async function updateRoomStatus(
  db: D1Database,
  roomId: string,
  status: RoomStatus
): Promise<Room | null> {
  const updated = await db.prepare(`
    UPDATE rooms SET status = ?, updated_at = ? WHERE id = ?
  `).bind(status, now(), roomId).run();

  if (updated.meta.changes === 0) {
    return null;
  }

  const room = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(roomId).first() as Room;
  return room;
}

export async function getAvailableRooms(
  db: D1Database,
  departmentId?: string,
  roomType?: RoomType
): Promise<Room[]> {
  let sql = `
    SELECT r.*, d.name as department_name
    FROM rooms r
    LEFT JOIN departments d ON r.department_id = d.id
    WHERE r.status = 'available'
  `;
  const params: unknown[] = [];

  if (departmentId) {
    sql += ` AND r.department_id = ?`;
    params.push(departmentId);
  }

  if (roomType) {
    sql += ` AND r.room_type = ?`;
    params.push(roomType);
  }

  sql += ` ORDER BY r.room_number ASC`;

  const result = await db.prepare(sql).bind(...params).all();
  return (result.results as unknown) as Room[];
}

export async function createRoomSchedule(
  db: D1Database,
  params: CreateRoomScheduleParams
): Promise<RoomSchedule> {
  const id = generateId('sched');
  const createdAt = now();

  await db.prepare(`
    INSERT INTO room_schedules (id, room_id, day_of_week, start_time, end_time, is_available, 
      notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    params.roomId,
    params.dayOfWeek,
    params.startTime,
    params.endTime,
    params.isAvailable !== false ? 1 : 0,
    params.notes || null,
    createdAt
  ).run();

  const schedule = await db.prepare('SELECT * FROM room_schedules WHERE id = ?').bind(id).first() as RoomSchedule;
  return schedule;
}

export async function getRoomSchedules(
  db: D1Database,
  roomId: string
): Promise<RoomSchedule[]> {
  const result = await db.prepare(`
    SELECT * FROM room_schedules WHERE room_id = ? ORDER BY day_of_week ASC
  `).bind(roomId).all();

  return (result.results as unknown) as RoomSchedule[];
}

export async function isRoomAvailableAt(
  db: D1Database,
  roomId: string,
  dateTime: Date
): Promise<boolean> {
  const dayOfWeek = dateTime.getDay();
  const time = dateTime.toTimeString().substring(0, 5);

  const schedule = await db.prepare(`
    SELECT * FROM room_schedules
    WHERE room_id = ?
      AND day_of_week = ?
      AND start_time <= ?
      AND end_time >= ?
    LIMIT 1
  `).bind(roomId, dayOfWeek, time, time).first() as RoomSchedule | undefined;

  if (!schedule) {
    return false;
  }

  return Boolean(schedule.is_available);
}

export async function createRoomAssignment(
  db: D1Database,
  params: CreateRoomAssignmentParams
): Promise<RoomAssignment> {
  const id = generateId('assign');
  const createdAt = now();

  await db.prepare(`
    INSERT INTO room_assignments (id, room_id, doctor_id, date, start_time, end_time, 
      is_active, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).bind(
    id,
    params.roomId,
    params.doctorId,
    params.startDate,
    params.startDate,
    params.endDate || null,
    params.notes || null,
    createdAt,
    createdAt
  ).run();

  const assignment = await db.prepare('SELECT * FROM room_assignments WHERE id = ?').bind(id).first() as RoomAssignment;
  return assignment;
}

export async function getDoctorRoomAssignment(
  db: D1Database,
  doctorId: string,
  date?: string
): Promise<RoomAssignment | null> {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const assignment = await db.prepare(`
    SELECT ra.*, r.room_number, r.room_name, r.room_type
    FROM room_assignments ra
    JOIN rooms r ON ra.room_id = r.id
    WHERE ra.doctor_id = ?
      AND ra.is_active = 1
      AND ra.start_date <= ?
      AND (ra.end_date IS NULL OR ra.end_date >= ?)
    ORDER BY 
      CASE ra.assignment_type WHEN 'primary' THEN 1 WHEN 'secondary' THEN 2 WHEN 'temporary' THEN 3 END
    LIMIT 1
  `).bind(doctorId, targetDate, targetDate).first() as RoomAssignment | undefined;

  return assignment || null;
}

export async function getRoomAssignments(
  db: D1Database,
  roomId: string
): Promise<RoomAssignment[]> {
  const result = await db.prepare(`
    SELECT ra.*, u.first_name || ' ' || u.last_name as doctor_name
    FROM room_assignments ra
    JOIN users u ON ra.doctor_id = u.id
    WHERE ra.room_id = ? AND ra.is_active = 1
    ORDER BY ra.start_date DESC
  `).bind(roomId).all();

  return (result.results as unknown) as RoomAssignment[];
}

export async function endRoomAssignment(
  db: D1Database,
  assignmentId: string,
  endDate?: string
): Promise<RoomAssignment | null> {
  const targetDate = endDate || new Date().toISOString().split('T')[0];

  await db.prepare(`
    UPDATE room_assignments SET is_active = 0, end_date = ?, updated_at = ? WHERE id = ?
  `).bind(targetDate, now(), assignmentId).run();

  const assignment = await db.prepare('SELECT * FROM room_assignments WHERE id = ?').bind(assignmentId).first() as RoomAssignment;
  return assignment;
}

export async function checkInToRoom(
  db: D1Database,
  params: {
    roomId: string;
    queueId?: string;
    doctorId?: string;
    patientId?: string;
    notes?: string;
  }
): Promise<Room & { patient_id?: string; doctor_id?: string; ticket_id?: string }> {
  const room = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(params.roomId).first() as Room | undefined;
  if (!room) {
    throw new Error('Room not found');
  }

  if (room.status !== 'available') {
    throw new Error('Room is not available');
  }

  const checkInTime = now();

  await db.prepare(`
    UPDATE rooms SET status = 'occupied', current_occupancy = ?, updated_at = ? WHERE id = ?
  `).bind(params.patientId || null, checkInTime, params.roomId).run();

  const updatedRoom = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(params.roomId).first() as Room;
  return {
    ...updatedRoom,
    patient_id: params.patientId,
    doctor_id: params.doctorId,
    ticket_id: params.queueId
  } as Room & { patient_id?: string; doctor_id?: string; ticket_id?: string };
}

export async function checkOutOfRoom(
  db: D1Database,
  roomId: string,
  notes?: string
): Promise<Room | null> {
  const checkoutTime = now();

  await db.prepare(`
    UPDATE rooms SET status = 'available', current_occupancy = NULL, updated_at = ? WHERE id = ?
  `).bind(checkoutTime, roomId).run();

  const updated = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(roomId).first() as Room;
  return updated;
}

export async function getRoomOccupancy(
  db: D1Database,
  roomId: string,
  date?: string
): Promise<{ room: Room; check_in_time: string }[]> {
  return [];
}

export async function getCurrentRoomOccupancy(
  db: D1Database,
  roomId: string
): Promise<{ room: Room; patient_name?: string; doctor_name?: string } | null> {
  const room = await db.prepare(`
    SELECT r.*, d.name as department_name
    FROM rooms r
    LEFT JOIN departments d ON r.department_id = d.id
    WHERE r.id = ?
  `).bind(roomId).first() as Room | undefined;

  if (!room || room.status !== 'occupied') {
    return null;
  }

  return {
    room,
  };
}

export async function getRoomsWithOccupancy(
  db: D1Database,
  departmentId?: string
): Promise<Room[]> {
  let sql = `
    SELECT r.*, d.name as department_name
    FROM rooms r
    LEFT JOIN departments d ON r.department_id = d.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (departmentId) {
    sql += ` AND r.department_id = ?`;
    params.push(departmentId);
  }

  sql += ` ORDER BY r.room_number ASC`;

  const rooms = await db.prepare(sql).bind(...params).all();

  return (rooms.results as unknown) as Room[];
}

export async function getRoomStats(
  db: D1Database,
  date?: string
): Promise<{
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
  utilization: number;
  avgOccupancyDuration: number | null;
}> {
  const totals = await db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
      SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
      SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
    FROM rooms
  `).first() as { total: number; available: number; occupied: number; maintenance: number };

  const utilization = totals.total > 0 ? ((totals.occupied / totals.total) * 100) : 0;

  const roomUtilization = totals.total > 0 ? ((totals.occupied / totals.total) * 100) : 0;

  return {
    total: totals.total,
    available: totals.available,
    occupied: totals.occupied,
    maintenance: totals.maintenance,
    utilization: Math.round(roomUtilization * 100) / 100,
    avgOccupancyDuration: null,
  };
}
