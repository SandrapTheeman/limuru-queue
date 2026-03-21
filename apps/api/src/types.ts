// Type definitions for the Cottage Queuing System
import type { KVNamespace, R2Bucket, DurableObjectNamespace } from '@cloudflare/workers-types';

export type Bindings = {
  DB: D1Database;
  SESSION_KV: KVNamespace;
  CACHE_KV: KVNamespace;
  RATE_LIMIT_KV: KVNamespace;
  ASSETS_BUCKET: R2Bucket;
  BACKUP_BUCKET: R2Bucket;
  QUEUE_ROOM: DurableObjectNamespace;
  PATIENT_SYNC: DurableObjectNamespace;
  ENVIRONMENT: string;
  JWT_SECRET: string;
  DEFAULT_PASSWORD: string;
  OLLAMA_ENDPOINT?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  FROM_NUMBER?: string;
  WHATSAPP_BUSINESS_ACCOUNT_ID?: string;
  WHATSAPP_API_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER?: string;
  WHATSAPP_VERIFY_TOKEN?: string;       // Webhook verification token
  WHATSAPP_APP_SECRET?: string;         // App secret for X-Hub-Signature-256 verification
  SENDGRID_API_KEY?: string;
  SENDGRID_FROM_EMAIL?: string;
  OPENAI_API_KEY?: string;
  AI_PROVIDER?: 'ollama' | 'cloudflare' | 'openai';
  HMS_TYPE?: string;
  HMS_BASE_URL?: string;
  HMS_USERNAME?: string;
  HMS_PASSWORD?: string;
  HMS_FACILITY_ID?: string;
};

export type UserRole = 'super_admin' | 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'patient' | 'pharmacist' | 'lab_tech' | 'facility_manager' | 'it_support';
export type VisitStatus = 'waiting' | 'called' | 'in_progress' | 'completed' | 'no_show' | 'transferred';

export interface Patient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  dob: string | null;
  password_hash: string | null;
  requires_password_change: boolean;
  created_at: string;
  updated_at: string;
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  department: string;
  room: string | null;
  pin_hash: string | null;
  is_available: boolean;
  break_until: string | null;
  created_at: string;
}

export interface Visit {
  id: string;
  patient_id: string;
  ticket_number: string;
  department: string;
  priority: boolean;
  status: VisitStatus;
  room_assigned: string | null;
  doctor_id: string | null;
  doctor_notes: string | null;
  diagnosis: string | null;
  prescription: string | null;
  created_at: string;
  called_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  wait_time_minutes: number | null;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  doctor_id: string | null;
  name: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface IPTVChannel {
  id: string;
  name: string;
  url: string;
  category: string | null;
  logo: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface Setting {
  key: string;
  value: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface QueueItem {
  id: string;
  ticket_number: string;
  patient_name: string;
  priority: boolean;
  wait_time: number;
  position: number;
  status: VisitStatus;
  joined_at: string;
}

export interface QueueResponse {
  department: string;
  waiting: number;
  called: number;
  patients: QueueItem[];
  estimated_wait_time: number;
  next_call_estimate: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  patientId?: string;
  doctorId?: string;
}

export interface JWTPayload {
  sub: string;
  userId: string;
  email: string;
  role: UserRole;
  patientId?: string;
  doctorId?: string;
  exp?: number;
  iat?: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Context type for tRPC
export interface Context {
  env: {
    DB: D1Database;
    SESSION_KV: KVNamespace;
    CACHE_KV: KVNamespace;
    RATE_LIMIT_KV: KVNamespace;
    ASSETS_BUCKET: R2Bucket;
    BACKUP_BUCKET: R2Bucket;
    QUEUE_ROOM: DurableObjectNamespace;
    PATIENT_SYNC: DurableObjectNamespace;
    JWT_SECRET: string;
    DEFAULT_PASSWORD: string;
    ENVIRONMENT: string;
  };
  user: AuthPayload | null;
}
