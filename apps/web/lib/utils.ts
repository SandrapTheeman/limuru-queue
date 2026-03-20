import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatQueueNumber(num: number): string {
  return num.toString().padStart(3, '0');
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    waiting: 'bg-yellow-100 text-yellow-800',
    called: 'bg-blue-100 text-blue-800',
    'in-progress': 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    skipped: 'bg-red-100 text-red-800',
  };
  return colors[status] || colors.waiting;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    waiting: 'Waiting',
    called: 'Called',
    'in-progress': 'In Progress',
    completed: 'Completed',
    skipped: 'Skipped',
  };
  return labels[status] || status;
}

export function calculateEstimatedTime(
  position: number,
  averageTimePerPatient: number
): number {
  return position * averageTimePerPatient;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function generateQueueToken(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomPart}`.toUpperCase();
}
