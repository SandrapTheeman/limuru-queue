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
  success: 'bg-green-50 border-green-500 text-green-800',
  error: 'bg-red-50 border-red-500 text-red-800',
  warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
  info: 'bg-blue-50 border-blue-500 text-blue-800',
};

export function Toast({ id, type = 'info', message, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const Icon = icons[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 shadow-lg
        transition-all duration-300 ${styles[type]}
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose(id), 300);
        }}
        className="p-1 hover:bg-black/10 rounded transition-colors"
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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}
