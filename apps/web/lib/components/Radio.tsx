'use client';

import React, { InputHTMLAttributes, forwardRef, useState, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

type RadioSize = 'sm' | 'md' | 'lg' | 'xl';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  error?: string;
  size?: RadioSize;
  fullWidth?: boolean;
  labelClassName?: string;
  containerClassName?: string;
  indicatorClassName?: string;
  animation?: 'none' | 'scale' | 'ripple';
}

const sizeConfig: Record<RadioSize, { indicator: string; icon: string; gap: string; label: string; description: string }> = {
  sm: {
    indicator: 'w-4 h-4',
    icon: 'w-2 h-2',
    gap: 'gap-2',
    label: 'text-sm',
    description: 'text-xs',
  },
  md: {
    indicator: 'w-5 h-5',
    icon: 'w-2.5 h-2.5',
    gap: 'gap-2.5',
    label: 'text-base',
    description: 'text-sm',
  },
  lg: {
    indicator: 'w-6 h-6',
    icon: 'w-3 h-3',
    gap: 'gap-3',
    label: 'text-lg',
    description: 'text-base',
  },
  xl: {
    indicator: 'w-7 h-7',
    icon: 'w-3.5 h-3.5',
    gap: 'gap-3',
    label: 'text-xl',
    description: 'text-lg',
  },
};

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      label,
      description,
      error,
      size = 'md',
      fullWidth = false,
      labelClassName = '',
      containerClassName = '',
      indicatorClassName = '',
      animation = 'scale',
      className = '',
      disabled,
      checked,
      onChange,
      name,
      value,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = useState<{ x: number; y: number; key: number }[]>([]);
    const config = sizeConfig[size];

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

    return (
      <div className={clsx('relative', fullWidth && 'w-full', containerClassName)}>
        <label
          className={clsx(
            'relative flex items-start cursor-pointer',
            config.gap,
            disabled && 'opacity-50 cursor-not-allowed',
            !disabled && 'hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg p-1 -m-1 transition-colors',
            fullWidth && 'w-full'
          )}
          onClick={handleClick}
        >
          <input
            ref={ref}
            type="radio"
            name={name}
            value={value}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className={clsx('sr-only peer', className)}
            {...props}
          />
          
          <div
            className={clsx(
              'relative flex-shrink-0 rounded-full border-2 transition-all duration-200',
              'flex items-center justify-center',
              config.indicator,
              'bg-slate-800/50 dark:bg-slate-900/80',
              'border-slate-600 dark:border-slate-500',
              'peer-checked:border-teal-500 dark:peer-checked:border-teal-400',
              'peer-hover:border-teal-400 dark:peer-hover:border-teal-300',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500 peer-focus-visible:ring-offset-2',
              'peer-focus-visible:ring-offset-slate-900 dark:peer-focus-visible:ring-offset-slate-950',
              error && 'border-red-500 peer-focus-visible:ring-red-500',
              disabled && 'cursor-not-allowed',
              indicatorClassName
            )}
          >
            <div
              className={clsx(
                'rounded-full bg-teal-500 dark:bg-teal-400 transition-all duration-200',
                config.icon,
                animation === 'scale' && 'scale-0 peer-checked:scale-100',
                animation === 'ripple' && 'animate-radio-ripple'
              )}
            />
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

Radio.displayName = 'Radio';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface RadioGroupProps {
  options: RadioOption[];
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  label?: string;
  hint?: string;
  error?: string;
  description?: string;
  orientation?: 'horizontal' | 'vertical';
  size?: RadioSize;
  fullWidth?: boolean;
  className?: string;
  containerClassName?: string;
  indicatorClassName?: string;
  animation?: 'none' | 'scale' | 'ripple';
}

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      options,
      name,
      value,
      defaultValue,
      onChange,
      label,
      hint,
      error,
      description,
      orientation = 'vertical',
      size = 'md',
      fullWidth = false,
      className = '',
      containerClassName = '',
      indicatorClassName = '',
      animation = 'scale',
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(defaultValue || '');
    const currentValue = value !== undefined ? value : internalValue;

    const handleChange = useCallback(
      (selectedValue: string) => {
        setInternalValue(selectedValue);
        onChange?.(selectedValue);
      },
      [onChange]
    );

    return (
      <div
        ref={ref}
        className={clsx('w-full', containerClassName)}
        role="radiogroup"
        aria-labelledby={label ? `${label}-radio-group` : undefined}
      >
        {(label || description) && (
          <div className="mb-3">
            {label && (
              <span
                id={`${label}-radio-group`}
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
          {options.map((option) => (
            <Radio
              key={option.value}
              name={name}
              value={option.value}
              checked={currentValue === option.value}
              onChange={() => handleChange(option.value)}
              label={option.label}
              description={option.description}
              disabled={option.disabled}
              size={size}
              fullWidth={fullWidth}
              animation={animation}
              indicatorClassName={indicatorClassName}
            />
          ))}
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

RadioGroup.displayName = 'RadioGroup';

export interface RadioCardProps extends Omit<RadioGroupProps, 'orientation' | 'containerClassName'> {
  orientation?: 'horizontal' | 'vertical';
  columns?: 2 | 3 | 4;
  gridContainerClassName?: string;
}

export const RadioCard = forwardRef<HTMLDivElement, RadioCardProps>(
  ({ columns = 2, gridContainerClassName = '', ...props }, ref) => {
    const gridCols = {
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
    };

    return (
      <RadioGroup
        ref={ref}
        {...props}
        containerClassName={clsx(
          'grid gap-3',
          gridCols[columns],
          gridContainerClassName
        )}
      />
    );
  }
);

RadioCard.displayName = 'RadioCard';
