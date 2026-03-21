'use client';

import { ReactNode, useEffect, useRef, forwardRef } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { createPortal } from 'react-dom';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'wide';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: ReactNode;
  variant?: 'default' | 'danger' | 'success';
  isLoading?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  wide: 'max-w-4xl',
  full: 'max-w-[90vw]',
};

const variantStyles = {
  default: 'bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700/50',
  danger: 'bg-gradient-to-b from-red-900/50 to-slate-900 border-red-500/30',
  success: 'bg-gradient-to-b from-emerald-900/50 to-slate-900 border-emerald-500/30',
};

export const Modal = forwardRef<HTMLDivElement, ModalProps>(({ 
  isOpen, 
  onClose, 
  title, 
  description,
  children, 
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  variant = 'default',
  isLoading = false,
  className = '',
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      modalRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  useEffect(() => {
    if (isOpen && previousActiveElement.current) {
      const timer = setTimeout(() => {
        previousActiveElement.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
      aria-hidden={!isOpen}
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />
      
      <div 
        ref={modalRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={clsx(
          'relative w-full mx-4 overflow-hidden',
          'rounded-2xl shadow-2xl border',
          'backdrop-blur-xl',
          'animate-slide-up',
          'focus:outline-none',
          sizeStyles[size],
          variantStyles[variant],
          className
        )}
      >
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-5 border-b border-white/10">
            <div className="flex-1 min-w-0 pr-4">
              {title && (
                <h2 id="modal-title" className="text-xl font-bold text-white truncate">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="mt-1 text-sm text-slate-400">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                disabled={isLoading}
                className={clsx(
                  'p-2 rounded-xl transition-colors flex-shrink-0',
                  'text-slate-400 hover:text-white hover:bg-white/10',
                  'focus:outline-none focus:ring-2 focus:ring-teal-500',
                  'disabled:opacity-50'
                )}
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        
        <div className="p-5 max-h-[calc(90vh-200px)] overflow-y-auto">
          {children}
        </div>

        {footer && (
          <div className="px-5 py-4 border-t border-white/10 bg-white/5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
});

Modal.displayName = 'Modal';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
  icon?: ReactNode;
}

export const ConfirmModal = forwardRef<HTMLDivElement, ConfirmModalProps>(({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  isLoading = false,
  icon,
}: ConfirmModalProps) => {
  const buttonStyles = {
    danger: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-500/25 hover:shadow-red-500/40',
    warning: 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-500/25 hover:shadow-amber-500/40',
    info: 'bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 shadow-teal-500/25 hover:shadow-teal-500/40',
    success: 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-500/25 hover:shadow-emerald-500/40',
  };

  const iconColors = {
    danger: 'text-red-400',
    warning: 'text-amber-400',
    info: 'text-teal-400',
    success: 'text-emerald-400',
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title} 
      size="sm" 
      showCloseButton={false}
      variant={variant === 'danger' ? 'danger' : 'default'}
      footer={
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={clsx(
              'px-4 py-2 rounded-xl transition-all font-medium',
              'bg-slate-700 text-white hover:bg-slate-600',
              'focus:outline-none focus:ring-2 focus:ring-slate-500',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={clsx(
              'px-4 py-2 rounded-xl text-white font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              buttonStyles[variant]
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </span>
            ) : confirmText}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-4">
        {icon && (
          <div className={clsx('flex-shrink-0 p-2 rounded-full bg-white/10', iconColors[variant])}>
            {icon}
          </div>
        )}
        <p className="text-slate-300">{message}</p>
      </div>
    </Modal>
  );
});

ConfirmModal.displayName = 'ConfirmModal';

export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  message: string;
  buttonText?: string;
}

export const AlertModal = forwardRef<HTMLDivElement, AlertModalProps>(({
  isOpen,
  onClose,
  type = 'info',
  title,
  message,
  buttonText = 'OK',
}: AlertModalProps) => {
  const icons = {
    info: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    danger: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const colors = {
    info: 'text-teal-400 bg-teal-500/20',
    success: 'text-emerald-400 bg-emerald-500/20',
    warning: 'text-amber-400 bg-amber-500/20',
    danger: 'text-red-400 bg-red-500/20',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      footer={
        <button
          onClick={onClose}
          className={clsx(
            'w-full px-4 py-2 rounded-xl font-medium transition-all',
            'bg-teal-500 text-white hover:bg-teal-400',
            'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900'
          )}
        >
          {buttonText}
        </button>
      }
    >
      <div className="flex flex-col items-center text-center gap-4">
        <div className={clsx('p-3 rounded-full', colors[type])}>
          {icons[type]}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
          <p className="text-sm text-slate-400">{message}</p>
        </div>
      </div>
    </Modal>
  );
});

AlertModal.displayName = 'AlertModal';
