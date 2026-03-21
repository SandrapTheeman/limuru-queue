'use client';

import { ReactNode } from 'react';

export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  icon?: ReactNode;
  pulse?: boolean;
}

const variantStyles = {
  default: 'bg-slate-700/50 text-slate-300 border-slate-600',
  primary: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  danger: 'bg-red-500/20 text-red-300 border-red-500/30',
  info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export function Badge({ 
  variant = 'default', 
  size = 'md', 
  children, 
  className = '',
  icon,
  pulse = false,
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        border transition-all duration-200
        ${variantStyles[variant]} ${sizeStyles[size]} ${className}
        ${pulse ? 'animate-pulse-subtle' : ''}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

// Status-specific badges for queue management
export type QueueStatus = 'waiting' | 'called' | 'serving' | 'completed' | 'no-show' | 'cancelled';

export interface StatusBadgeProps {
  status: QueueStatus;
  className?: string;
}

const statusConfig: Record<QueueStatus, { label: string; variant: BadgeProps['variant']; icon: string }> = {
  waiting: { label: 'Waiting', variant: 'warning', icon: '⏳' },
  called: { label: 'Called', variant: 'info', icon: '📢' },
  serving: { label: 'Serving', variant: 'primary', icon: '🩺' },
  completed: { label: 'Completed', variant: 'success', icon: '✓' },
  'no-show': { label: 'No Show', variant: 'danger', icon: '✗' },
  cancelled: { label: 'Cancelled', variant: 'default', icon: '⊘' },
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={className} icon={<span>{config.icon}</span>}>
      {config.label}
    </Badge>
  );
}

// Priority badge for patients
export type PriorityLevel = 'emergency' | 'urgent' | 'normal' | 'low';

export interface PriorityBadgeProps {
  priority: PriorityLevel;
  className?: string;
}

const priorityConfig: Record<PriorityLevel, { label: string; variant: BadgeProps['variant']; icon: string }> = {
  emergency: { label: 'Emergency', variant: 'danger', icon: '🚨' },
  urgent: { label: 'Urgent', variant: 'warning', icon: '⚠️' },
  normal: { label: 'Normal', variant: 'info', icon: '📋' },
  low: { label: 'Low', variant: 'default', icon: '•' },
};

export function PriorityBadge({ priority, className = '' }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  return (
    <Badge variant={config.variant} className={className} icon={<span>{config.icon}</span>}>
      {config.label}
    </Badge>
  );
}
