'use client';

import { useEffect, useCallback, useRef, type ReactNode } from 'react';

interface FocusTrapOptions {
  enabled?: boolean;
  onEscape?: () => void;
}

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  options: FocusTrapOptions = {}
) {
  const { enabled = true, onEscape } = options;
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      if (e.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      if (e.key === 'Tab') {
        const container = containerRef.current;
        if (!container) return;

        const focusableElements = container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    },
    [enabled, onEscape, containerRef]
  );

  useEffect(() => {
    if (!enabled) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (container) {
      const focusableElements = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [enabled, handleKeyDown, containerRef]);
}

interface FocusManagementProps {
  children: ReactNode;
  restoreFocus?: boolean;
}

export function FocusProvider({ children, restoreFocus = true }: FocusManagementProps) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    return () => {
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [restoreFocus]);

  return <>{children}</>;
}

export function SkipToContent({ href = '#main-content' }: { href?: string }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-white focus:text-gray-900 focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      Skip to main content
    </a>
  );
}

export function LiveRegion({
  children,
  politeness = 'polite',
  className = 'sr-only',
}: {
  children: ReactNode;
  politeness?: 'polite' | 'assertive';
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className={className}
    >
      {children}
    </div>
  );
}

export function Announcer({
  message,
  politeness = 'polite',
}: {
  message: string;
  politeness?: 'polite' | 'assertive';
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
