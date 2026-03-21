'use client';

import { useEffect, useState, useCallback, forwardRef } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { create } from 'zustand';

export interface ToastProps {
  id: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const defaultIcons = {
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const styles = {
  success: 'bg-gradient-to-r from-emerald-900/95 to-emerald-800/95 border-emerald-500/50 text-emerald-100',
  error: 'bg-gradient-to-r from-red-900/95 to-red-800/95 border-red-500/50 text-red-100',
  warning: 'bg-gradient-to-r from-amber-900/95 to-amber-800/95 border-amber-500/50 text-amber-100',
  info: 'bg-gradient-to-r from-teal-900/95 to-teal-800/95 border-teal-500/50 text-teal-100',
};

const iconStyles = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-teal-400',
};

export const Toast = forwardRef<HTMLDivElement, ToastProps>(({
  id,
  type = 'info',
  title,
  message,
  duration = 5000,
  onClose,
  action,
  icon,
  className = '',
}: ToastProps) => {
  const [isLeaving, setIsLeaving] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (duration === 0) return;
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);

    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [id, duration, onClose]);

  const handleClose = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => onClose(id), 300);
  }, [id, onClose]);

  const Icon = icon || defaultIcons[type];

  return (
    <div
      className={clsx(
        'relative flex items-start gap-3 px-4 py-3 rounded-xl border-l-4 shadow-2xl overflow-hidden',
        'transition-all duration-300 ease-out',
        styles[type],
        isLeaving ? 'translate-x-full opacity-0 scale-95' : 'translate-x-0 opacity-100 scale-100',
        className
      )}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={clsx('flex-shrink-0 mt-0.5', iconStyles[type])}>
        {Icon}
      </div>
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-sm mb-0.5">{title}</p>}
        <p className="text-sm opacity-90">{message}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-current rounded"
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        onClick={handleClose}
        className="p-1 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-white/20"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div 
            className={clsx('h-full transition-all duration-50 ease-linear', iconStyles[type])}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
});

Toast.displayName = 'Toast';

export interface ToastItem {
  id: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts.slice(-4), { ...toast, id }],
    }));
    return id;
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  clearToasts: () => {
    set({ toasts: [] });
  },
}));

export interface ToastContainerProps {
  toasts: ToastItem[];
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  className?: string;
}

const positionStyles = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

export const ToastContainer = forwardRef<HTMLDivElement, ToastContainerProps>(({
  toasts,
  onClose,
  position = 'bottom-right',
  className = '',
}: ToastContainerProps) => {
  return (
    <div 
      className={clsx(
        'fixed z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none',
        positionStyles[position],
        className
      )}
      aria-label="Notifications"
      role="region"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
});

ToastContainer.displayName = 'ToastContainer';

export const toast = {
  success: (message: string, options?: Partial<Omit<ToastItem, 'id' | 'type' | 'message'>>) => 
    useToastStore.getState().addToast({ type: 'success', message, ...options }),
  error: (message: string, options?: Partial<Omit<ToastItem, 'id' | 'type' | 'message'>>) => 
    useToastStore.getState().addToast({ type: 'error', message, ...options }),
  warning: (message: string, options?: Partial<Omit<ToastItem, 'id' | 'type' | 'message'>>) => 
    useToastStore.getState().addToast({ type: 'warning', message, ...options }),
  info: (message: string, options?: Partial<Omit<ToastItem, 'id' | 'type' | 'message'>>) => 
    useToastStore.getState().addToast({ type: 'info', message, ...options }),
  custom: (toast: Omit<ToastItem, 'id'>) => 
    useToastStore.getState().addToast(toast),
  dismiss: (id: string) => 
    useToastStore.getState().removeToast(id),
  clear: () => 
    useToastStore.getState().clearToasts(),
};

export interface ToastProviderProps {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function ToastProvider({ children, position = 'bottom-right' }: ToastProviderProps) {
  const { toasts, removeToast } = useToastStore();

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} position={position} />
    </>
  );
}
