'use client';

import { ReactNode, forwardRef, useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { LucideIcon, Award, TrendingUp, TrendingDown } from 'lucide-react';

export interface CardProps {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'elevated' | 'featured' | 'bordered';
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
}

const variantStyles = {
  default: 'bg-slate-800/50 border border-slate-700/50',
  glass: 'glass-card backdrop-blur-md',
  elevated: 'bg-slate-800 border border-slate-700 shadow-xl',
  featured: 'glass-card glass-featured',
  bordered: 'bg-slate-900 border border-slate-700',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const sizeStyles = {
  sm: 'rounded-xl',
  md: 'rounded-2xl',
  lg: 'rounded-3xl',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(({ 
  header, 
  footer, 
  children, 
  className = '', 
  variant = 'default',
  hoverable = false,
  padding = 'md',
  size = 'md',
  onClick,
  disabled = false,
}, ref) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = useCallback(() => {
    if (!disabled && onClick) {
      onClick();
    }
  }, [disabled, onClick]);

  return (
    <div 
      ref={ref}
      onClick={handleClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={clsx(
        'transition-all duration-200 ease-out',
        variantStyles[variant],
        sizeStyles[size],
        paddingStyles[padding],
        hoverable && !disabled && 'hover:scale-[1.02] hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/10 cursor-pointer',
        !isPressed && hoverable && 'hover:scale-[1.02]',
        isPressed && hoverable && 'scale-[0.98]',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      aria-disabled={disabled}
    >
      {header && (
        <div className="px-5 py-4 border-b border-white/10">
          {header}
        </div>
      )}
      <div className={paddingStyles[padding]}>
        {children}
      </div>
      {footer && (
        <div className="px-5 py-4 border-t border-white/10 bg-white/5">
          {footer}
        </div>
      )}
    </div>
  );
});

Card.displayName = 'Card';

export interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

const statVariants = {
  default: 'bg-slate-800/50 border-slate-700/50 text-slate-400',
  primary: 'bg-gradient-to-br from-teal-600/20 to-teal-500/10 border-teal-500/30 text-teal-400',
  success: 'bg-gradient-to-br from-emerald-600/20 to-emerald-500/10 border-emerald-500/30 text-emerald-400',
  warning: 'bg-gradient-to-br from-amber-600/20 to-amber-500/10 border-amber-500/30 text-amber-400',
  danger: 'bg-gradient-to-br from-red-600/20 to-red-500/10 border-red-500/30 text-red-400',
};

const statSizes = {
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

const statIconSizes = {
  sm: 'p-1.5 text-lg',
  md: 'p-2.5 text-xl',
  lg: 'p-3 text-2xl',
};

const statValueSizes = {
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-4xl',
};

const TrendIcon = ({ isPositive }: { isPositive: boolean }) => (
  isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
);

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(({ 
  icon, 
  label, 
  value, 
  trend, 
  variant = 'default', 
  size = 'md',
  className = '',
  onClick,
}: StatCardProps) => {
  return (
    <div 
      className={clsx(
        'rounded-2xl backdrop-blur-md border transition-all duration-200',
        'hover:scale-[1.02] hover:shadow-lg',
        statVariants[variant],
        statSizes[size],
        onClick && 'cursor-pointer',
        className
      )}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={clsx('rounded-xl bg-white/10', statIconSizes[size])}>
          {icon}
        </div>
        {trend && (
          <div className={clsx(
            'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
            trend.isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          )}
          role="status"
          aria-label={`Trend: ${trend.isPositive ? 'up' : 'down'} ${Math.abs(trend.value)}%`}
          >
            <TrendIcon isPositive={trend.isPositive} />
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div className={clsx('font-bold text-white mb-1', statValueSizes[size])}>
        {value}
      </div>
      <div className="text-sm uppercase tracking-wide opacity-70">{label}</div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  progress?: number;
  progressLabel?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(({
  title,
  value,
  subtitle,
  icon: Icon,
  progress,
  progressLabel,
  variant = 'default',
  className = '',
}, ref) => {
  const iconColors = {
    default: 'text-slate-400 bg-slate-700/50',
    primary: 'text-teal-400 bg-teal-500/20',
    success: 'text-emerald-400 bg-emerald-500/20',
    warning: 'text-amber-400 bg-amber-500/20',
    danger: 'text-red-400 bg-red-500/20',
  };

  return (
    <div 
      ref={ref}
      className={clsx(
        'p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50',
        'transition-all duration-200',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wide">{title}</h4>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={clsx('p-2 rounded-lg', iconColors[variant])}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-2">{value}</div>
      {progress !== undefined && (
        <div className="space-y-1">
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={clsx(
                'h-full rounded-full transition-all duration-500',
                variant === 'success' && 'bg-emerald-500',
                variant === 'warning' && 'bg-amber-500',
                variant === 'danger' && 'bg-red-500',
                variant === 'primary' && 'bg-teal-500',
                variant === 'default' && 'bg-slate-500'
              )}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={progressLabel || `${progress}%`}
            />
          </div>
          {progressLabel && (
            <p className="text-xs text-slate-500">{progressLabel}</p>
          )}
        </div>
      )}
    </div>
  );
});

MetricCard.displayName = 'MetricCard';
