import { ReactNode } from 'react';

export interface CardProps {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ header, footer, children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden ${className}`}>
      {header && (
        <div className="px-6 py-4 border-b border-gray-200">
          {header}
        </div>
      )}
      <div className="px-6 py-4">
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
}
