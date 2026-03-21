'use client';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'white' | 'muted';
  className?: string;
  label?: string;
}

const sizeStyles = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

const variantStyles = {
  primary: 'text-teal-500',
  white: 'text-white',
  muted: 'text-slate-400',
};

export function Spinner({ 
  size = 'md', 
  variant = 'primary', 
  className = '',
  label = 'Loading...',
}: SpinnerProps) {
  return (
    <div 
      className={`inline-flex items-center justify-center ${className}`}
      role="status"
      aria-label={label}
    >
      <svg
        className={`animate-spin ${sizeStyles[size]} ${variantStyles[variant]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}

// Full page loading overlay
export interface LoadingOverlayProps {
  isLoading: boolean;
  children?: React.ReactNode;
  message?: string;
}

export function LoadingOverlay({ isLoading, children, message }: LoadingOverlayProps) {
  if (!isLoading) return <>{children}</>;

  return (
    <div className="relative">
      {children && (
        <div className="absolute inset-0 pointer-events-none opacity-30">
          {children}
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-50">
        <div className="text-center">
          <Spinner size="xl" />
          {message && (
            <p className="mt-4 text-slate-300 font-medium">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Skeleton loading component
export interface SkeletonProps {
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
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  };

  return (
    <div
      className={`
        animate-pulse bg-slate-700/50
        ${variantStyles[variant]} ${className}
      `}
      style={{ 
        width: width || '100%',
        height: height || (variant === 'text' ? '1em' : '100px'),
      }}
      aria-hidden="true"
    />
  );
}

// Skeleton card for loading states
export interface SkeletonCardProps {
  lines?: number;
  showAvatar?: boolean;
}

export function SkeletonCard({ lines = 3, showAvatar = false }: SkeletonCardProps) {
  return (
    <div className="p-4 space-y-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
      {showAvatar && (
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="60%" height={14} />
            <Skeleton variant="text" width="40%" height={12} />
          </div>
        </div>
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          variant="text" 
          width={i === lines - 1 ? '70%' : '100%'} 
          height={12}
        />
      ))}
    </div>
  );
}
