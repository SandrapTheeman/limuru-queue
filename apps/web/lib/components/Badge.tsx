'use client';

import { ReactNode, forwardRef } from 'react';
import { clsx } from 'clsx';

export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  pulse?: boolean;
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

const variantStyles = {
  default: 'bg-slate-700/50 text-slate-300 border-slate-600',
  primary: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  danger: 'bg-red-500/20 text-red-300 border-red-500/30',
  info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  outline: 'bg-transparent text-slate-300 border-slate-500/30',
};

const dotColors = {
  default: 'bg-slate-500',
  primary: 'bg-teal-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  info: 'bg-blue-400',
  outline: 'bg-slate-400',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
  lg: 'px-3 py-1.5 text-sm gap-2',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({ 
  variant = 'default', 
  size = 'md', 
  children, 
  className = '',
  icon,
  iconPosition = 'left',
  pulse = false,
  dot = false,
  removable = false,
  onRemove,
}: BadgeProps) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium border',
        'transition-all duration-200',
        variantStyles[variant],
        sizeStyles[size],
        pulse && 'animate-pulse-subtle',
        className
      )}
      role="status"
      aria-label={typeof children === 'string' ? children : undefined}
    >
      {dot && (
        <span 
          className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {icon && iconPosition === 'left' && (
        <span className="flex-shrink-0" aria-hidden="true">{icon}</span>
      )}
      {children}
      {icon && iconPosition === 'right' && (
        <span className="flex-shrink-0" aria-hidden="true">{icon}</span>
      )}
      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className={clsx(
            'ml-1 p-0.5 rounded-full transition-colors',
            'hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20'
          )}
          aria-label="Remove"
          type="button"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
});

Badge.displayName = 'Badge';

export type QueueStatus = 'waiting' | 'called' | 'serving' | 'completed' | 'no-show' | 'cancelled';

export interface StatusBadgeProps {
  status: QueueStatus;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<QueueStatus, { label: string; variant: BadgeProps['variant']; icon: ReactNode }> = {
  waiting: { 
    label: 'Waiting', 
    variant: 'warning', 
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  called: { 
    label: 'Called', 
    variant: 'info', 
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 0112.728 0" />
      </svg>
    )
  },
  serving: { 
    label: 'Serving', 
    variant: 'primary', 
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364m7-3.636a4.5 4.5 0 00-6.364 0m4.364 6.364a4.5 4.5 0 01-6.364 0m3.636-9.728L12 3.636m-4.364 0H3m9 3.636a4.5 4.5 0 016.364 0" />
      </svg>
    )
  },
  completed: { 
    label: 'Completed', 
    variant: 'success', 
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  },
  'no-show': { 
    label: 'No Show', 
    variant: 'danger', 
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    )
  },
  cancelled: { 
    label: 'Cancelled', 
    variant: 'default', 
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  },
};

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(({ 
  status, 
  className = '',
  showIcon = true,
  size = 'md',
}: StatusBadgeProps) => {
  const config = statusConfig[status];
  return (
    <Badge 
      variant={config.variant} 
      className={className}
      icon={showIcon ? config.icon : undefined}
      size={size}
      aria-label={`Status: ${config.label}`}
    >
      {config.label}
    </Badge>
  );
});

StatusBadge.displayName = 'StatusBadge';

export type PriorityLevel = 'emergency' | 'urgent' | 'normal' | 'low';

export interface PriorityBadgeProps {
  priority: PriorityLevel;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const priorityConfig: Record<PriorityLevel, { label: string; variant: BadgeProps['variant']; icon: ReactNode }> = {
  emergency: { 
    label: 'Emergency', 
    variant: 'danger', 
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  },
  urgent: { 
    label: 'Urgent', 
    variant: 'warning', 
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  normal: { 
    label: 'Normal', 
    variant: 'info', 
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    )
  },
  low: { 
    label: 'Low', 
    variant: 'default', 
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    )
  },
};

export const PriorityBadge = forwardRef<HTMLSpanElement, PriorityBadgeProps>(({ 
  priority, 
  className = '',
  showIcon = true,
  size = 'md',
}: PriorityBadgeProps) => {
  const config = priorityConfig[priority];
  return (
    <Badge 
      variant={config.variant} 
      className={className}
      icon={showIcon ? config.icon : undefined}
      size={size}
      aria-label={`Priority: ${config.label}`}
    >
      {config.label}
    </Badge>
  );
});

PriorityBadge.displayName = 'PriorityBadge';

export interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: 'default' | 'primary' | 'danger';
  className?: string;
}

export const CountBadge = forwardRef<HTMLSpanElement, CountBadgeProps>(({
  count,
  max = 99,
  variant = 'primary',
  className = '',
}: CountBadgeProps) => {
  const displayCount = count > max ? `${max}+` : count;
  
  if (count === 0) return null;
  
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-bold',
        'transition-all duration-200',
        variant === 'primary' && 'bg-teal-500 text-white',
        variant === 'danger' && 'bg-red-500 text-white',
        variant === 'default' && 'bg-slate-600 text-white',
        className
      )}
      role="status"
      aria-label={`Count: ${count}`}
    >
      {displayCount}
    </span>
  );
});

CountBadge.displayName = 'CountBadge';
