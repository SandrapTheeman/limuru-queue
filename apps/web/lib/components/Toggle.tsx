'use client';

import React, { forwardRef, useState, useCallback, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

type ToggleSize = 'sm' | 'md' | 'lg' | 'xl';
type ToggleVariant = 'default' | 'success' | 'warning' | 'danger';

export interface ToggleProps {
  id?: string;
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  onValueChange?: (value: boolean) => void;
  label?: string;
  description?: string;
  error?: string;
  size?: ToggleSize;
  variant?: ToggleVariant;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  labelClassName?: string;
  containerClassName?: string;
  trackClassName?: string;
  thumbClassName?: string;
  animation?: 'none' | 'spring' | 'bounce';
  className?: string;
}

const sizeConfig: Record<ToggleSize, {
  track: string;
  thumb: string;
  translate: string;
  gap: string;
  label: string;
  description: string;
}> = {
  sm: {
    track: 'w-8 h-4',
    thumb: 'w-3 h-3',
    translate: 'translate-x-4',
    gap: 'gap-2',
    label: 'text-sm',
    description: 'text-xs',
  },
  md: {
    track: 'w-11 h-6',
    thumb: 'w-5 h-5',
    translate: 'translate-x-5',
    gap: 'gap-2.5',
    label: 'text-base',
    description: 'text-sm',
  },
  lg: {
    track: 'w-14 h-7',
    thumb: 'w-6 h-6',
    translate: 'translate-x-7',
    gap: 'gap-3',
    label: 'text-lg',
    description: 'text-base',
  },
  xl: {
    track: 'w-16 h-8',
    thumb: 'w-7 h-7',
    translate: 'translate-x-8',
    gap: 'gap-3',
    label: 'text-xl',
    description: 'text-lg',
  },
};

const variantColors: Record<ToggleVariant, { on: string; off: string }> = {
  default: {
    on: 'bg-teal-500 dark:bg-teal-400',
    off: 'bg-slate-600 dark:bg-slate-700',
  },
  success: {
    on: 'bg-emerald-500 dark:bg-emerald-400',
    off: 'bg-slate-600 dark:bg-slate-700',
  },
  warning: {
    on: 'bg-amber-500 dark:bg-amber-400',
    off: 'bg-slate-600 dark:bg-slate-700',
  },
  danger: {
    on: 'bg-red-500 dark:bg-red-400',
    off: 'bg-slate-600 dark:bg-slate-700',
  },
};

const animations = {
  none: '',
  spring: 'transition-transform duration-300 ease-out',
  bounce: 'transition-transform duration-200 ease-in-out',
};

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  (
    {
      id,
      name,
      checked,
      defaultChecked = false,
      onChange,
      onValueChange,
      label,
      description,
      error,
      size = 'md',
      variant = 'default',
      disabled = false,
      readOnly = false,
      required = false,
      fullWidth = false,
      labelClassName = '',
      containerClassName = '',
      trackClassName = '',
      thumbClassName = '',
      animation = 'spring',
      className = '',
    },
    ref
  ) => {
    const [internalChecked, setInternalChecked] = useState(defaultChecked);
    const [isFocused, setIsFocused] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const containerRef = useRef<HTMLLabelElement>(null);

    const isChecked = checked !== undefined ? checked : internalChecked;
    const config = sizeConfig[size];
    const colors = variantColors[variant];

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (readOnly) return;
        const newChecked = e.target.checked;
        setInternalChecked(newChecked);
        onChange?.(newChecked);
        onValueChange?.(newChecked);
      },
      [readOnly, onChange, onValueChange]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === ' ' && !readOnly) {
          setIsPressed(true);
        }
      },
      [readOnly]
    );

    const handleKeyUp = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === ' ' && !readOnly) {
          setIsPressed(false);
          const newChecked = !isChecked;
          setInternalChecked(newChecked);
          onChange?.(newChecked);
          onValueChange?.(newChecked);
          if (inputRef.current) {
            inputRef.current.checked = newChecked;
            inputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      },
      [readOnly, isChecked, onChange, onValueChange]
    );

    return (
      <div className={clsx('relative', fullWidth && 'w-full', containerClassName)}>
        <label
          ref={containerRef}
          className={clsx(
            'flex items-start cursor-pointer select-none',
            config.gap,
            disabled && 'opacity-50 cursor-not-allowed',
            readOnly && 'cursor-default',
            !disabled && !readOnly && 'hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg p-1 -m-1 transition-colors',
            fullWidth && 'w-full'
          )}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
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
            role="switch"
            id={id}
            name={name}
            checked={isChecked}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            className={clsx('sr-only peer', className)}
            aria-checked={isChecked}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : description ? `${id}-description` : undefined}
          />
          
          <div
            className={clsx(
              'relative flex-shrink-0 rounded-full transition-colors duration-200',
              animations[animation],
              config.track,
              isChecked ? colors.on : colors.off,
              isFocused && 'ring-2 ring-offset-2 ring-teal-500 dark:ring-offset-slate-900',
              isPressed && 'scale-95',
              trackClassName
            )}
          >
            <div
              className={clsx(
                'absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg transition-transform duration-200',
                animations[animation],
                config.thumb,
                isChecked ? config.translate : 'translate-x-0.5',
                thumbClassName
              )}
            />
          </div>

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
                <span
                  id={description ? `${id}-description` : undefined}
                  className={clsx(
                    config.description,
                    'text-slate-400 dark:text-slate-500 mt-0.5'
                  )}
                >
                  {description}
                </span>
              )}
            </div>
          )}
        </label>

        {error && (
          <p
            id={`${id}-error`}
            className="mt-1 ml-7 text-sm text-red-500 dark:text-red-400 flex items-center gap-1.5"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

export interface ToggleGroupProps {
  children: React.ReactNode;
  label?: string;
  hint?: string;
  error?: string;
  description?: string;
  orientation?: 'horizontal' | 'vertical';
  size?: ToggleSize;
  variant?: ToggleVariant;
  fullWidth?: boolean;
  className?: string;
  containerClassName?: string;
}

export const ToggleGroup = forwardRef<HTMLDivElement, ToggleGroupProps>(
  (
    {
      children,
      label,
      hint,
      error,
      description,
      orientation = 'vertical',
      size = 'md',
      variant = 'default',
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
        className={clsx('w-full', containerClassName)}
        role="group"
        aria-labelledby={label ? `${label}-toggle-group` : undefined}
      >
        {(label || description) && (
          <div className="mb-3">
            {label && (
              <span
                id={`${label}-toggle-group`}
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
            orientation === 'horizontal' ? 'flex-row flex-wrap gap-4' : 'flex-col gap-3',
            fullWidth && 'w-full',
            className
          )}
        >
          {childArray.map((child, index) => {
            if (!React.isValidElement(child)) return child;
            return React.cloneElement(child as React.ReactElement<ToggleProps>, {
              key: index,
              size,
              variant,
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

ToggleGroup.displayName = 'ToggleGroup';

export interface ToggleSegmentProps {
  options: { value: string; label: string; icon?: React.ReactNode }[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  size?: Exclude<ToggleSize, 'sm'>;
  variant?: ToggleVariant;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export const ToggleSegment = forwardRef<HTMLDivElement, ToggleSegmentProps>(
  (
    {
      options,
      value,
      defaultValue,
      onChange,
      size = 'md',
      variant = 'default',
      disabled = false,
      fullWidth = false,
      className = '',
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(defaultValue || options[0]?.value || '');
    const currentValue = value !== undefined ? value : internalValue;

    const handleSelect = useCallback(
      (selectedValue: string) => {
        setInternalValue(selectedValue);
        onChange?.(selectedValue);
      },
      [onChange]
    );

    const config = sizeConfig[size];
    const colors = variantColors[variant];

    const padding = {
      sm: 'px-3 py-1.5',
      md: 'px-4 py-2',
      lg: 'px-5 py-3',
      xl: 'px-6 py-4',
    };

    return (
      <div
        ref={ref}
        className={clsx(
          'inline-flex rounded-xl bg-slate-800/50 dark:bg-slate-900/80 p-1 gap-1',
          fullWidth && 'w-full',
          className
        )}
        role="radiogroup"
      >
        {options.map((option) => {
          const isSelected = currentValue === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => handleSelect(option.value)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 rounded-lg transition-all duration-200',
                padding[size],
                config.label,
                isSelected
                  ? `${colors.on} text-white shadow-md`
                  : 'bg-transparent text-slate-400 dark:text-slate-500 hover:text-white',
                disabled && 'opacity-50 cursor-not-allowed',
                fullWidth && 'w-full'
              )}
              role="radio"
              aria-checked={isSelected}
            >
              {option.icon && <span className="w-4 h-4">{option.icon}</span>}
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }
);

ToggleSegment.displayName = 'ToggleSegment';
