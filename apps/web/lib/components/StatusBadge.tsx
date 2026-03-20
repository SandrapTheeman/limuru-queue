'use client';

import { Clock, Phone, Play, CheckCircle } from 'lucide-react';

export type QueueStatus = 'waiting' | 'called' | 'in-progress' | 'completed';

export interface StatusBadgeProps {
  status: QueueStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const statusConfig = {
  waiting: {
    label: 'Waiting',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  called: {
    label: 'Called',
    icon: Phone,
    className: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  'in-progress': {
    label: 'In Progress',
    icon: Play,
    className: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 border-green-300',
  },
};

export function StatusBadge({ status, showIcon = true, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium border
        ${config.className} ${sizeStyles[size]}
      `}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </span>
  );
}

export function getStatusLabel(status: QueueStatus): string {
  return statusConfig[status].label;
}

export function getStatusColor(status: QueueStatus): string {
  return statusConfig[status].className.split(' ')[0];
}
