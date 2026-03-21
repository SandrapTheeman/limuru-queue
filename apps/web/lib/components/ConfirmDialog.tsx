'use client';

import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
  showUndo?: boolean;
  onUndo?: () => void;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  showUndo = false,
  onUndo,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      setIsAnimating(true);
      setTimeout(() => {
        dialogRef.current?.focus();
      }, 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, loading, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      const focusableElements = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        const first = focusableElements[0] as HTMLElement;
        const last = focusableElements[focusableElements.length - 1] as HTMLElement;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }, []);

  if (!mounted || !isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'text-error-500',
      iconBg: 'bg-error-100',
      button: 'bg-error-500 hover:bg-error-600 focus:ring-error-500',
      title: 'text-error-800',
    },
    warning: {
      icon: 'text-warning-500',
      iconBg: 'bg-warning-100',
      button: 'bg-warning-500 hover:bg-warning-600 focus:ring-warning-500',
      title: 'text-warning-800',
    },
    info: {
      icon: 'text-info-500',
      iconBg: 'bg-info-100',
      button: 'bg-info-500 hover:bg-info-600 focus:ring-info-500',
      title: 'text-info-800',
    },
  };

  const styles = variantStyles[variant];

  const dialogContent = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`
          relative bg-white rounded-xl shadow-2xl w-full max-w-md
          animate-bounce-in
          ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center`}>
              {variant === 'danger' ? (
                <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
              ) : variant === 'warning' ? (
                <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
              ) : (
                <svg className={`w-6 h-6 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h3 id="confirm-dialog-title" className={`text-lg font-semibold ${styles.title}`}>
                {title}
              </h3>
              <p id="confirm-dialog-description" className="mt-2 text-sm text-gray-600">
                {message}
              </p>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`
              px-4 py-2 text-sm font-medium text-white rounded-lg
              focus:outline-none focus:ring-2 focus:ring-offset-2
              disabled:opacity-50 transition-colors
              ${styles.button}
            `}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </button>
          {showUndo && onUndo && (
            <button
              onClick={onUndo}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              Undo
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}

export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string | ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    showUndo?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
    onUndo?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const confirm = useCallback((
    options: Omit<ConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        ...options,
        onConfirm: () => {
          resolve(true);
          setDialogState((prev) => ({ ...prev, isOpen: false }));
        },
        onCancel: () => {
          resolve(false);
          setDialogState((prev) => ({ ...prev, isOpen: false }));
        },
      });
    });
  }, []);

  const close = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const ConfirmDialogComponent = useCallback(() => (
    <ConfirmDialog
      isOpen={dialogState.isOpen}
      onClose={() => {
        close();
        dialogState.onCancel?.();
      }}
      onConfirm={() => {
        dialogState.onConfirm?.();
      }}
      title={dialogState.title}
      message={dialogState.message}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
      variant={dialogState.variant}
      showUndo={dialogState.showUndo}
      onUndo={dialogState.onUndo}
    />
  ), [dialogState, close]);

  return { confirm, close, ConfirmDialog: ConfirmDialogComponent };
}
