'use client';

import React, { ButtonHTMLAttributes, forwardRef, ReactNode, useState, useCallback, Children, isValidElement, cloneElement } from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  iconOnly?: ReactNode;
  iconOnlyAriaLabel?: string;
  isFullWidth?: boolean;
  isIconButton?: boolean;
  ripple?: boolean;
  spinnerVariant?: 'spinner' | 'dots' | 'pulse';
}

const variantStyles: Record<ButtonVariant, { base: string; hover: string; focus: string; active: string }> = {
  primary: {
    base: 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-500/25',
    hover: 'hover:from-teal-500 hover:to-teal-400 hover:shadow-teal-500/40',
    focus: 'focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900 dark:focus:ring-offset-slate-950',
    active: 'active:from-teal-700 active:to-teal-600',
  },
  secondary: {
    base: 'bg-slate-700 dark:bg-slate-700 text-white border border-slate-600 dark:border-slate-600',
    hover: 'hover:bg-slate-600 dark:hover:bg-slate-600 hover:border-slate-500',
    focus: 'focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 dark:focus:ring-offset-slate-950',
    active: 'active:bg-slate-800 dark:active:bg-slate-800',
  },
  outline: {
    base: 'bg-transparent text-teal-500 border-2 border-teal-500 dark:text-teal-400 dark:border-teal-400',
    hover: 'hover:bg-teal-500/10 dark:hover:bg-teal-400/10 hover:border-teal-600 dark:hover:border-teal-300',
    focus: 'focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900 dark:focus:ring-offset-slate-950',
    active: 'active:bg-teal-500/20 dark:active:bg-teal-400/20',
  },
  ghost: {
    base: 'bg-transparent text-white border border-white/20',
    hover: 'hover:bg-white/10 hover:border-white/30',
    focus: 'focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900 dark:focus:ring-offset-slate-950',
    active: 'active:bg-white/15',
  },
  danger: {
    base: 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/25',
    hover: 'hover:from-red-500 hover:to-red-400 hover:shadow-red-500/40',
    focus: 'focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900 dark:focus:ring-offset-slate-950',
    active: 'active:from-red-700 active:to-red-600',
  },
  success: {
    base: 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/25',
    hover: 'hover:from-emerald-500 hover:to-emerald-400 hover:shadow-emerald-500/40',
    focus: 'focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 dark:focus:ring-offset-slate-950',
    active: 'active:from-emerald-700 active:to-emerald-600',
  },
  warning: {
    base: 'bg-gradient-to-r from-amber-500 to-amber-400 text-amber-950 shadow-lg shadow-amber-500/25',
    hover: 'hover:from-amber-400 hover:to-amber-300 hover:shadow-amber-500/40',
    focus: 'focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900 dark:focus:ring-offset-slate-950',
    active: 'active:from-amber-600 active:to-amber-500',
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5 min-h-[32px]',
  md: 'px-4 py-2 text-base gap-2 min-h-[40px]',
  lg: 'px-6 py-3 text-lg gap-2 min-h-[48px]',
  xl: 'px-8 py-4 text-xl gap-3 min-h-[56px]',
  icon: 'p-2 min-w-[40px] min-h-[40px]',
};

const iconSizes: Record<Exclude<ButtonSize, 'icon'>, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-7 h-7',
};

const LoadingSpinner = ({ variant = 'spinner' }: { variant?: 'spinner' | 'dots' | 'pulse' }) => {
  if (variant === 'dots') {
    return (
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    );
  }
  if (variant === 'pulse') {
    return <Loader2 className="w-5 h-5 animate-pulse" />;
  }
  return <Loader2 className="w-5 h-5 animate-spin" />;
};

interface Ripple {
  x: number;
  y: number;
  id: number;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText = 'Loading...',
      leftIcon,
      rightIcon,
      iconOnly,
      iconOnlyAriaLabel,
      isFullWidth = false,
      isIconButton = false,
      ripple = false,
      spinnerVariant = 'spinner',
      className = '',
      children,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = useState<Ripple[]>([]);
    const variantConfig = variantStyles[variant];

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (ripple && !disabled && !isLoading) {
          const button = e.currentTarget;
          const rect = button.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const newRipple = { x, y, id: Date.now() };
          setRipples((prev) => [...prev, newRipple]);
          setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
          }, 600);
        }
        onClick?.(e);
      },
      [ripple, disabled, isLoading, onClick]
    );

    const buttonClasses = clsx(
      'relative inline-flex items-center justify-center rounded-xl font-semibold',
      'transition-all duration-200 ease-out',
      'focus:outline-none focus:ring-2',
      variantConfig.focus,
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100',
      !disabled && !isLoading && 'hover:scale-[1.02] active:scale-[0.98]',
      variantConfig.base,
      variantConfig.hover,
      variantConfig.active,
      isFullWidth && 'w-full',
      isIconButton || size === 'icon' ? sizeStyles.icon : sizeStyles[size],
      className
    );

    const content = isLoading ? (
      <>
        <LoadingSpinner variant={spinnerVariant} />
        {loadingText && <span>{loadingText}</span>}
      </>
    ) : (
      <>
        {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        {!isIconButton && children}
        {iconOnly}
        {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </>
    );

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        onClick={handleClick}
        className={buttonClasses}
        aria-label={iconOnlyAriaLabel || (isIconButton && typeof children === 'string' ? children : undefined)}
        aria-busy={isLoading}
        {...props}
      >
        {ripple && ripples.map((r) => (
          <span
            key={r.id}
            className="absolute rounded-full bg-white/30 pointer-events-none animate-ripple"
            style={{
              left: r.x,
              top: r.y,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

export interface IconButtonProps extends Omit<ButtonProps, 'iconOnly' | 'isIconButton'> {
  icon: ReactNode;
  label: string;
  size?: Exclude<ButtonSize, 'icon'>;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, size = 'md', className = '', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        isIconButton
        iconOnly={icon}
        iconOnlyAriaLabel={label}
        size={size}
        className={clsx(
          size === 'sm' && 'min-w-[32px] min-h-[32px] p-1.5',
          size === 'md' && 'min-w-[40px] min-h-[40px] p-2',
          size === 'lg' && 'min-w-[48px] min-h-[48px] p-2.5',
          size === 'xl' && 'min-w-[56px] min-h-[56px] p-3',
          className
        )}
        {...props}
      >
        {label}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

export interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  size?: Exclude<ButtonSize, 'icon'>;
  variant?: ButtonVariant;
  isAttached?: boolean;
}

export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ children, className = '', orientation = 'horizontal', size = 'md', variant = 'secondary', isAttached = true }, ref) => {
    const childArray = Array.isArray(children) ? children : [children];
    
    return (
      <div
        ref={ref}
        role="group"
        className={clsx(
          'flex',
          orientation === 'horizontal' ? 'flex-row' : 'flex-col',
          isAttached && (orientation === 'horizontal' ? '[&>button]:-ml-px [&>button:first-child]:ml-0' : '[&>button]:-mt-px [&>button:first-child]:mt-0'),
          '[&>button]:rounded-none',
          orientation === 'horizontal' ? '[&>button:first-child]:rounded-l-xl [&>button:last-child]:rounded-r-xl' : '[&>button:first-child]:rounded-t-xl [&>button:last-child]:rounded-b-xl',
          className
        )}
      >
        {childArray.map((child, index) => {
          if (!isValidElement<ButtonProps>(child)) return child;
          return cloneElement(child as React.ReactElement<ButtonProps>, {
            key: index,
            size,
            variant: index === 0 ? variant : 'ghost',
            className: clsx(child.props.className),
          });
        })}
      </div>
    );
  }
);

ButtonGroup.displayName = 'ButtonGroup';

export const GlassButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="ghost"
        className={clsx(
          'bg-white/10 backdrop-blur-sm border border-white/20',
          'hover:bg-white/20 hover:border-white/30',
          'text-white shadow-lg',
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

GlassButton.displayName = 'GlassButton';

export const CircleButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'isIconButton'>>(
  ({ size = 'md', className = '', children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        isIconButton
        size={size}
        className={clsx('rounded-full', className)}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

CircleButton.displayName = 'CircleButton';
