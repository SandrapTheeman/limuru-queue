'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles = {
  primary: 'bg-gradient-to-r from-teal-600 to-teal-500 text-white hover:from-teal-500 hover:to-teal-400 focus:ring-teal-500 shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40',
  secondary: 'bg-slate-700 text-white hover:bg-slate-600 focus:ring-slate-500 border border-slate-600',
  ghost: 'bg-transparent text-white hover:bg-white/10 focus:ring-teal-500 border border-white/20 hover:border-white/30',
  danger: 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400 focus:ring-red-500 shadow-lg shadow-red-500/25 hover:shadow-red-500/40',
  success: 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 focus:ring-emerald-500 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40',
  warning: 'bg-gradient-to-r from-amber-500 to-amber-400 text-amber-950 hover:from-amber-400 hover:to-amber-300 focus:ring-amber-500 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-base gap-2',
  lg: 'px-6 py-3 text-lg gap-2',
  xl: 'px-8 py-4 text-xl gap-3',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, disabled, className = '', children, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          inline-flex items-center justify-center rounded-xl font-semibold
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
          disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
          hover:scale-[1.02] active:scale-[0.98]
          ${variantStyles[variant]} ${sizeStyles[size]} ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Specialized button variants for hospital theme
export const GlassButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={`
          bg-white/10 backdrop-blur-sm border border-white/20
          hover:bg-white/20 hover:border-white/30
          text-white shadow-lg
          ${className}
        `}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

GlassButton.displayName = 'GlassButton';
