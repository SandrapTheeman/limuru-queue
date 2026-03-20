// Utility functions for the API

import { nanoid } from 'nanoid';

// Generate unique ID
export function generateId(prefix = ''): string {
  const id = nanoid(16);
  return prefix ? `${prefix}-${id}` : id;
}

// Generate ticket number
export function generateTicketNumber(department: string, count: number): string {
  const deptCode = department.substring(0, 3).toUpperCase();
  const num = String(count + 1).padStart(3, '0');
  return `${deptCode}${num}`;
}

// Hash password using simple hash (in production use bcrypt)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Simple PIN verification
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const pinHash = await hashPassword(pin);
  return pinHash === hash;
}

// Format date
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

// Parse department from ticket
export function parseDepartment(ticketNumber: string): string {
  return ticketNumber.substring(0, 3);
}

// Calculate wait time in minutes
export function calculateWaitTime(createdAt: Date | string): number {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number (Kenyan format)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+254|254|0)?[1-9]\d{8}$/;
  return phoneRegex.test(phone);
}

// Sanitize input
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Pagination helper
export function paginate<T>(items: T[], page: number, pageSize: number): {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
} {
  const total = items.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  
  return {
    items: items.slice(start, end),
    total,
    page,
    pageSize,
    hasMore: end < total,
  };
}

// Get current timestamp
export function now(): string {
  return new Date().toISOString();
}

// Get departments list
export function getDepartments(): string[] {
  return ['MED', 'PED', 'GYN', 'OPH', 'DEN', 'ORTH'];
}

// Response helpers
export function successResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message,
  };
}

export function errorResponse(error: string) {
  return {
    success: false,
    error,
  };
}
