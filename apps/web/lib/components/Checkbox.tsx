'use client';

import React, { InputHTMLAttributes, forwardRef, useState, useCallback, useRef, useEffect } from 'react';
import { Check, Minus, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

type CheckboxSize = 'sm' | 'md' | 'lg' | 'xl';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  error?: string;
  size?: CheckboxSize;
  indeterminate?: boolean;
  showIndeterminate?: boolean;
  checkedIcon?: React.ReactNode;
  fullWidth?: boolean;
  labelClassName?: string;
  containerClassName?: string;
  animation?: 'none' | 'ripple' | 'bounce';
}

const sizeConfig: Record<CheckboxSize, { box: string; icon: string; gap: string; label: string; description: string }> = {
  sm: {
    box: 'w-4 h-4',
    icon: 'w-3 h-3',
    gap: 'gap-2',
    label: 'text-sm',
    description: 'text-xs',
  },
  md: {
    box: 'w-5 h-5',
    icon: 'w-3.5 h-3.5',
    gap: 'gap-2.5',
    label: 'text-base',
    description: 'text-sm',
  },
  lg: {
    box: 'w-6 h-6',
    icon: 'w-4 h-4',
    gap: 'gap-3',
    label: 'text-lg',
    description: 'text-base',
  },
  xl: {
    box: 'w-7 h-7',
    icon: 'w-5 h-5',
    gap: 'gap-3',
    label: 'text-xl',
    description: 'text-lg',
  },
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      error,
      size = 'md',
      indeterminate = false,
      showIndeterminate = true,
      checkedIcon,
      fullWidth = false,
      labelClassName = '',
      containerClassName = '',
      animation = 'bounce',
      className = '',
      disabled,
      checked,
      onChange,
      ...props
    },
    ref
  ) => {
    const [internalChecked, setInternalChecked] = useState(checked || false);
    const [ripples, setRipples] = useState<{ x: number; y: number; key: number }[]>([]);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const containerRef = useRef<HTMLLabelElement>(null);

    const isChecked = checked !== undefined ? checked : internalChecked;
    const isIndeterminate = indeterminate || (isChecked === false && internalChecked === null);

    const config = sizeConfig[size];

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (checked === undefined) {
          setInternalChecked(e.target.checked ? true : false);
        }
        onChange?.(e);
      },
      [checked, onChange]
    );

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLLabelElement>) => {
        if (animation === 'ripple' && !disabled) {
          const label = e.currentTarget;
          const rect = label.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          setRipples((prev) => [...prev, { x, y, key: Date.now() }]);
          setTimeout(() => {
            setRipples((prev) => prev.slice(1));
          }, 500);
        }
      },
      [animation, disabled]
    );

    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = isIndeterminate;
      }
    }, [isIndeterminate]);

    return (
      <div className={clsx('relative', fullWidth && 'w-full', containerClassName)}>
        <label
          ref={containerRef}
          className={clsx(
            'relative flex items-start cursor-pointer',
            config.gap,
            disabled && 'opacity-50 cursor-not-allowed',
            !disabled && 'hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg p-1 -m-1 transition-colors',
            fullWidth && 'w-full',
            containerClassName
          )}
          onClick={handleClick}
        >
          <input
            ref={(node) => {
              inputRef.current = node;
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            }}
            type="checkbox"
            checked={isChecked}
            onChange={handleChange}
            disabled={disabled}
            className={clsx(
              'sr-only peer',
              className
            )}
            {...props}
          />
          
          <div
            className={clsx(
              'flex-shrink-0 rounded border-2 transition-all duration-200',
              'flex items-center justify-center',
              config.box,
              'bg-slate-800/50 dark:bg-slate-900/80',
              'border-slate-600 dark:border-slate-500',
              'peer-checked:bg-teal-500 peer-checked:border-teal-500',
              'peer-hover:border-teal-400 dark:peer-hover:border-teal-300',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500 peer-focus-visible:ring-offset-2',
              'peer-focus-visible:ring-offset-slate-900 dark:peer-focus-visible:ring-offset-slate-950',
              'peer-indeterminate:bg-teal-500/50 peer-indeterminate:border-teal-500',
              error && 'border-red-500 peer-focus-visible:ring-red-500',
              animation === 'bounce' && isChecked && 'animate-checkbox-bounce',
              disabled && 'cursor-not-allowed'
            )}
          >
            {isIndeterminate && showIndeterminate ? (
              <Minus className={clsx(config.icon, 'text-white')} strokeWidth={3} />
            ) : isChecked ? (
              checkedIcon ? (
                <span className={config.icon}>{checkedIcon}</span>
              ) : (
                <Check className={clsx(config.icon, 'text-white')} strokeWidth={3} />
              )
            ) : null}
          </div>

          {animation === 'ripple' && ripples.map((ripple) => (
            <span
              key={ripple.key}
              className="absolute rounded-full bg-teal-500/30 pointer-events-none animate-ripple"
              style={{
                left: ripple.x,
                top: ripple.y,
                transform: 'translate(-50%, -50%)',
                width: 20,
                height: 20,
              }}
            />
          ))}

          {(label || description) && (
            <div className="flex flex-col">
              {label && (
                <span className={clsx(
                  config.label,
                  'text-white dark:text-slate-100 font-medium leading-tight',
                  labelClassName
                )}>
                  {label}
                </span>
              )}
              {description && (
                <span className={clsx(
                  config.description,
                  'text-slate-400 dark:text-slate-500 mt-0.5'
                )}>
                  {description}
                </span>
              )}
            </div>
          )}
        </label>

        {error && (
          <p className="mt-1 ml-7 text-sm text-red-500 dark:text-red-400 flex items-center gap-1.5" role="alert">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export interface CheckboxGroupProps {
  children: React.ReactNode;
  label?: string;
  hint?: string;
  error?: string;
  description?: string;
  orientation?: 'horizontal' | 'vertical';
  size?: CheckboxSize;
  fullWidth?: boolean;
  className?: string;
  containerClassName?: string;
}

export const CheckboxGroup = forwardRef<HTMLDivElement, CheckboxGroupProps>(
  (
    {
      children,
      label,
      hint,
      error,
      description,
      orientation = 'vertical',
      size = 'md',
      fullWidth = false,
      className = '',
      containerClassName = '',
    },
    ref
  ) => {
    const childArray = Array.isArray(children) ? children : [children];

    return (
      <div
        ref={ref}
        className={clsx(
          'w-full',
          containerClassName
        )}
        role="group"
        aria-labelledby={label ? `${label}-checkbox-group` : undefined}
      >
        {(label || description) && (
          <div className="mb-3">
            {label && (
              <span
                id={`${label}-checkbox-group`}
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                {label}
              </span>
            )}
            {description && (
              <span className="block text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {description}
              </span>
            )}
          </div>
        )}
        <div
          className={clsx(
            'flex',
            orientation === 'horizontal' ? 'flex-row flex-wrap gap-4' : 'flex-col gap-2',
            fullWidth && 'w-full',
            className
          )}
        >
          {childArray.map((child, index) => {
            if (!React.isValidElement(child)) return child;
            return React.cloneElement(child as React.ReactElement<CheckboxProps>, {
              key: index,
              size,
              fullWidth,
            });
          })}
        </div>
        {hint && !error && (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{hint}</p>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-500 dark:text-red-400 flex items-center gap-1.5" role="alert">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

CheckboxGroup.displayName = 'CheckboxGroup';

export interface SwitchProps extends Omit<CheckboxProps, 'indeterminate' | 'showIndeterminate'> {
  thumbClassName?: string;
  trackClassName?: string;
}

const switchTrackSizes = {
  sm: 'w-8 h-4',
  md: 'w-11 h-6',
  lg: 'w-14 h-7',
  xl: 'w-16 h-8',
};

const switchThumbSizes = {
  sm: 'w-3 h-3',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-7 h-7',
};

const switchTranslations = {
  sm: 'translate-x-4',
  md: 'translate-x-5',
  lg: 'translate-x-7',
  xl: 'translate-x-8',
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ size = 'md', className = '', trackClassName = '', thumbClassName = '', checked, defaultChecked, onChange, disabled, label, ...props }, ref) => {
    const config = sizeConfig[size];
    const [internalChecked, setInternalChecked] = useState(defaultChecked || false);
    const isChecked = checked !== undefined ? checked : internalChecked;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalChecked(e.target.checked);
      onChange?.(e);
    };

    return (
      <div className={clsx('relative inline-flex items-center', className)}>
        <div
          className={clsx(
            'relative inline-flex rounded-full transition-colors duration-200',
            'flex-shrink-0',
            switchTrackSizes[size],
            isChecked
              ? 'bg-teal-500 dark:bg-teal-400'
              : 'bg-slate-600 dark:bg-slate-700',
            disabled && 'opacity-50 cursor-not-allowed',
            trackClassName
          )}
        >
          <div
            className={clsx(
              'absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg transition-transform duration-200',
              switchThumbSizes[size],
              isChecked ? switchTranslations[size] : 'translate-x-0.5',
              thumbClassName
            )}
          />
        </div>
        {label && (
          <span className={clsx(config.label, 'text-white dark:text-slate-100 font-medium ml-2')}>
            {label}
          </span>
        )}
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
      </div>
    );
  }
);

Switch.displayName = 'Switch';
