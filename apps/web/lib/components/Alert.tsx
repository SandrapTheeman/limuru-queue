'use client';

import { ReactNode, forwardRef, HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: ReactNode;
  className?: string;
}

const variantStyles = {
  info: {
    container: 'bg-gradient-to-r from-teal-900/50 to-teal-800/30 border-teal-500/50',
    icon: 'text-teal-400 bg-teal-500/20',
    title: 'text-teal-300',
    text: 'text-teal-100',
  },
  success: {
    container: 'bg-gradient-to-r from-emerald-900/50 to-emerald-800/30 border-emerald-500/50',
    icon: 'text-emerald-400 bg-emerald-500/20',
    title: 'text-emerald-300',
    text: 'text-emerald-100',
  },
  warning: {
    container: 'bg-gradient-to-r from-amber-900/50 to-amber-800/30 border-amber-500/50',
    icon: 'text-amber-400 bg-amber-500/20',
    title: 'text-amber-300',
    text: 'text-amber-100',
  },
  danger: {
    container: 'bg-gradient-to-r from-red-900/50 to-red-800/30 border-red-500/50',
    icon: 'text-red-400 bg-red-500/20',
    title: 'text-red-300',
    text: 'text-red-100',
  },
};

const defaultIcons = {
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  danger: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const sizeStyles = {
  sm: 'p-3 text-sm',
  md: 'p-4 text-sm',
  lg: 'p-5 text-base',
};

const iconSizes = {
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-2.5',
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(({
  variant = 'info',
  size = 'md',
  title,
  children,
  icon,
  dismissible = false,
  onDismiss,
  action,
  className = '',
  ...props
}: AlertProps) => {
  const styles = variantStyles[variant];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={clsx(
        'rounded-xl border backdrop-blur-sm',
        'transition-all duration-200',
        sizeStyles[size],
        styles.container,
        className
      )}
      {...props}
    >
      <div className="flex gap-3">
        {(icon || defaultIcons[variant]) && (
          <div className={clsx('flex-shrink-0 rounded-lg', iconSizes[size], styles.icon)}>
            {icon || defaultIcons[variant]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={clsx('font-semibold mb-1', styles.title)}>
              {title}
            </h4>
          )}
          <div className={styles.text}>
            {children}
          </div>
          {action && (
            <div className="mt-3">
              {action}
            </div>
          )}
        </div>
        {dismissible && (
          <button
            onClick={onDismiss}
            className={clsx(
              'flex-shrink-0 p-1 rounded-lg transition-colors',
              'hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20',
              styles.text
            )}
            aria-label="Dismiss alert"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});

Alert.displayName = 'Alert';

export interface InlineAlertProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

const inlineVariantStyles = {
  info: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  danger: 'bg-red-500/20 text-red-300 border-red-500/30',
};

export const InlineAlert = forwardRef<HTMLSpanElement, InlineAlertProps>(({
  variant = 'info',
  children,
  icon,
  className = '',
  ...props
}: InlineAlertProps) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        inlineVariantStyles[variant],
        className
      )}
      role="status"
      {...props}
    >
      {icon}
      {children}
    </span>
  );
});

InlineAlert.displayName = 'InlineAlert';

export interface BannerAlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const bannerIcons = {
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  danger: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const bannerVariantStyles = {
  info: 'from-teal-600/20 to-teal-500/10 border-teal-500/30 text-teal-300',
  success: 'from-emerald-600/20 to-emerald-500/10 border-emerald-500/30 text-emerald-300',
  warning: 'from-amber-600/20 to-amber-500/10 border-amber-500/30 text-amber-300',
  danger: 'from-red-600/20 to-red-500/10 border-red-500/30 text-red-300',
};

export const BannerAlert = forwardRef<HTMLDivElement, BannerAlertProps>(({
  variant = 'info',
  title,
  description,
  action,
  dismissible = false,
  onDismiss,
  className = '',
  ...props
}: BannerAlertProps) => {
  return (
    <div
      className={clsx(
        'rounded-xl border backdrop-blur-md p-4',
        'bg-gradient-to-r',
        bannerVariantStyles[variant],
        className
      )}
      role="alert"
      aria-live="polite"
      {...props}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {bannerIcons[variant]}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white">
            {title}
          </h4>
          {description && (
            <p className="mt-1 text-sm opacity-80">
              {description}
            </p>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className={clsx(
                'mt-3 px-4 py-1.5 rounded-lg text-sm font-medium',
                'bg-white/10 hover:bg-white/20',
                'transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-white/20'
              )}
            >
              {action.label}
            </button>
          )}
        </div>
        {dismissible && (
          <button
            onClick={onDismiss}
            className={clsx(
              'flex-shrink-0 p-1 rounded-lg transition-colors',
              'hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20'
            )}
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});

BannerAlert.displayName = 'BannerAlert';
