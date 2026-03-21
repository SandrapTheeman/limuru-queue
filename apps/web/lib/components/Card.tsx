'use client';

import { ReactNode } from 'react';

export interface CardProps {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'elevated' | 'featured';
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantStyles = {
  default: 'bg-slate-800/50 border border-slate-700/50',
  glass: 'glass-card',
  elevated: 'bg-slate-800 border border-slate-700 shadow-xl',
  featured: 'glass-card glass-featured',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({ 
  header, 
  footer, 
  children, 
  className = '', 
  variant = 'default',
  hoverable = false,
  padding = 'md',
}: CardProps) {
  return (
    <div 
      className={`
        rounded-2xl backdrop-blur-md
        transition-all duration-200 ease-out
        ${variantStyles[variant]}
        ${hoverable ? 'hover:scale-[1.02] hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/10 cursor-pointer' : ''}
        ${className}
      `}
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
}

// Specialized stat card component for dashboard metrics
export interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const statVariants = {
  default: 'bg-slate-800/50 border-slate-700/50 text-slate-400',
  primary: 'bg-gradient-to-br from-teal-600/20 to-teal-500/10 border-teal-500/30 text-teal-400',
  success: 'bg-gradient-to-br from-emerald-600/20 to-emerald-500/10 border-emerald-500/30 text-emerald-400',
  warning: 'bg-gradient-to-br from-amber-600/20 to-amber-500/10 border-amber-500/30 text-amber-400',
  danger: 'bg-gradient-to-br from-red-600/20 to-red-500/10 border-red-500/30 text-red-400',
};

export function StatCard({ icon, label, value, trend, variant = 'default', className = '' }: StatCardProps) {
  return (
    <div 
      className={`
        rounded-2xl p-5 backdrop-blur-md
        border transition-all duration-200
        hover:scale-[1.02] hover:shadow-lg
        ${statVariants[variant]}
        ${className}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-xl bg-white/10">
          {icon}
        </div>
        {trend && (
          <div className={`
            flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full
            ${trend.isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}
          `}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm uppercase tracking-wide opacity-70">{label}</div>
    </div>
  );
}
