'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
}: SkeletonProps) {
  const baseClass = 'animate-pulse bg-gray-200';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1em' : '100%'),
  };

  return (
    <div
      className={`${baseClass} ${variantClasses[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" height={20} width="60%" />
          <Skeleton variant="text" height={16} width="40%" />
        </div>
      </div>
      <Skeleton variant="rectangular" height={80} />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" height={36} width={100} />
        <Skeleton variant="rectangular" height={36} width={100} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex gap-4">
          <Skeleton variant="text" height={20} width="20%" />
          <Skeleton variant="text" height={20} width="30%" />
          <Skeleton variant="text" height={20} width="25%" />
          <Skeleton variant="text" height={20} width="15%" />
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex gap-4 items-center">
            <Skeleton variant="text" height={20} width="20%" />
            <Skeleton variant="text" height={20} width="30%" />
            <Skeleton variant="text" height={20} width="25%" />
            <Skeleton variant="rectangular" height={32} width={80} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonPatientCard() {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <Skeleton variant="rectangular" height={32} width={80} />
        <Skeleton variant="circular" height={24} width={24} />
      </div>
      <Skeleton variant="text" height={24} width="70%" className="mb-2" />
      <div className="flex gap-4 mb-4">
        <Skeleton variant="text" height={16} width={60} />
        <Skeleton variant="text" height={16} width={40} />
      </div>
      <Skeleton variant="rectangular" height={40} />
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
  progress?: number;
}

export function LoadingOverlay({ message = 'Loading...', progress }: LoadingOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-700 font-medium mb-2">{message}</p>
        {progress !== undefined && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'gray';
  className?: string;
}

export function Spinner({ size = 'md', color = 'primary', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const colorClasses = {
    primary: 'border-primary-500 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-gray-400 border-t-transparent',
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`rounded-full animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
    />
  );
}

interface PageLoaderProps {
  title?: string;
  subtitle?: string;
}

export function PageLoader({ title = 'Loading...', subtitle }: PageLoaderProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
        {subtitle && <p className="text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

export function ErrorDisplay({
  error,
  onRetry,
  title = 'Something went wrong',
}: {
  error?: Error | string;
  onRetry?: () => void;
  title?: string;
}) {
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
        {errorMessage && <p className="text-gray-500 mb-6">{errorMessage}</p>}
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12">
      {icon && (
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>}
      {action}
    </div>
  );
}
