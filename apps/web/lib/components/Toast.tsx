'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export interface ToastProps {
  id: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: 'bg-gradient-to-r from-emerald-900/95 to-emerald-800/95 border-emerald-500/50 text-emerald-100 backdrop-blur-md',
  error: 'bg-gradient-to-r from-red-900/95 to-red-800/95 border-red-500/50 text-red-100 backdrop-blur-md',
  warning: 'bg-gradient-to-r from-amber-900/95 to-amber-800/95 border-amber-500/50 text-amber-100 backdrop-blur-md',
  info: 'bg-gradient-to-r from-teal-900/95 to-teal-800/95 border-teal-500/50 text-teal-100 backdrop-blur-md',
};

export function Toast({ id, type = 'info', message, duration = 5000, onClose }: ToastProps) {
  const [isLeaving, setIsLeaving] = useState(false);
  const Icon = icons[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onClose(id), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 shadow-2xl
        transition-all duration-300 ease-out
        ${styles[type]}
        ${isLeaving ? 'translate-x-full opacity-0 scale-95' : 'translate-x-0 opacity-100 scale-100'}
      `}
      role="alert"
      aria-live="polite"
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={handleClose}
        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export interface ToastContainerProps {
  toasts: Array<{ id: string; type?: 'success' | 'error' | 'warning' | 'info'; message: string }>;
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div 
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-md w-full"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}

// Toast notification hook for easy usage
import { create } from 'zustand';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

// Helper function to show toasts
export const toast = {
  success: (message: string) => useToastStore.getState().addToast({ type: 'success', message }),
  error: (message: string) => useToastStore.getState().addToast({ type: 'error', message }),
  warning: (message: string) => useToastStore.getState().addToast({ type: 'warning', message }),
  info: (message: string) => useToastStore.getState().addToast({ type: 'info', message }),
};
