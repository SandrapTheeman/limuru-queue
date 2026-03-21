'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
  className?: string;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(({
  variant = 'text',
  width,
  height,
  animation = 'wave',
  className = '',
  ...props
}: SkeletonProps) => {
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    rounded: 'rounded-xl',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  return (
    <div
      className={clsx(
        'bg-slate-700/50',
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={{
        width: width ?? (variant === 'circular' ? 40 : '100%'),
        height: height ?? (variant === 'circular' ? 40 : variant === 'text' ? 16 : 100),
      }}
      aria-hidden="true"
      {...props}
    />
  );
});

Skeleton.displayName = 'Skeleton';

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}

export function SkeletonText({ lines = 3, className = '', lastLineWidth = '80%' }: SkeletonTextProps) {
  return (
    <div className={clsx('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          height={16}
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

export interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const avatarSizes = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export function SkeletonAvatar({ size = 'md', className = '' }: SkeletonAvatarProps) {
  return (
    <Skeleton 
      variant="circular" 
      width={avatarSizes[size].split(' ')[0]} 
      height={avatarSizes[size].split(' ')[1]} 
      className={className}
    />
  );
}

export interface SkeletonButtonProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const buttonSizes = {
  sm: { width: 80, height: 32 },
  md: { width: 120, height: 40 },
  lg: { width: 160, height: 48 },
};

export function SkeletonButton({ size = 'md', className = '' }: SkeletonButtonProps) {
  const { width, height } = buttonSizes[size];
  return (
    <Skeleton 
      variant="rounded" 
      width={width} 
      height={height} 
      className={className}
    />
  );
}

export interface SkeletonCardProps {
  showAvatar?: boolean;
  showImage?: boolean;
  showAction?: boolean;
  className?: string;
}

export function SkeletonCard({ showAvatar = true, showImage = false, showAction = true, className = '' }: SkeletonCardProps) {
  return (
    <div className={clsx('p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50 space-y-4', className)}>
      {showAvatar && (
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" height={14} width="60%" />
            <Skeleton variant="text" height={12} width="40%" />
          </div>
        </div>
      )}
      {showImage && <Skeleton variant="rectangular" height={160} />}
      <div className="space-y-2">
        <Skeleton variant="text" height={16} width="90%" />
        <Skeleton variant="text" height={14} width="75%" />
        <Skeleton variant="text" height={14} width="50%" />
      </div>
      {showAction && (
        <div className="flex gap-2 pt-2">
          <Skeleton variant="rounded" width={80} height={36} />
          <Skeleton variant="rounded" width={80} height={36} />
        </div>
      )}
    </div>
  );
}

export interface SkeletonTableProps {
  columns?: number;
  rows?: number;
  className?: string;
}

export function SkeletonTable({ columns = 4, rows = 5, className = '' }: SkeletonTableProps) {
  return (
    <div className={clsx('w-full overflow-hidden rounded-xl border border-slate-700/50', className)}>
      <div className="bg-gradient-to-r from-teal-600/20 to-teal-500/10 p-4 border-b border-slate-700/50">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} variant="text" height={14} className="flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-700/30">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4 flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} variant="text" height={16} className="flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface SkeletonBadgeProps {
  className?: string;
}

export function SkeletonBadge({ className = '' }: SkeletonBadgeProps) {
  return (
    <Skeleton 
      variant="rounded" 
      width={80} 
      height={24} 
      className={className}
    />
  );
}

export interface SkeletonListProps {
  count?: number;
  showAvatar?: boolean;
  className?: string;
}

export function SkeletonList({ count = 5, showAvatar = true, className = '' }: SkeletonListProps) {
  return (
    <div className={clsx('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
          {showAvatar && <Skeleton variant="circular" width={40} height={40} />}
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" height={14} width="40%" />
            <Skeleton variant="text" height={12} width="70%" />
          </div>
        </div>
      ))}
    </div>
  );
}
