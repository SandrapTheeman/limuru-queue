'use client';

import { InputHTMLAttributes, forwardRef, ReactNode, useState, useCallback, useEffect } from 'react';
import { Eye, EyeOff, X, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

type InputSize = 'sm' | 'md' | 'lg' | 'xl';
type InputStatus = 'default' | 'success' | 'error';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  label?: string;
  error?: string;
  hint?: string;
  success?: string;
  helperText?: string;
  labelIcon?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  showPasswordToggle?: boolean;
  showClearButton?: boolean;
  isSearch?: boolean;
  inputPrefix?: ReactNode;
  inputSuffix?: ReactNode;
  size?: InputSize;
  status?: InputStatus;
  required?: boolean;
  showCharCount?: boolean;
  maxLength?: number;
  fullWidth?: boolean;
  containerClassName?: string;
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'px-4 py-2.5 text-base min-h-[44px]',
  lg: 'px-4 py-3 text-lg min-h-[52px]',
  xl: 'px-5 py-4 text-xl min-h-[60px]',
};

const iconSizes: Record<InputSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
};

const iconPadding: Record<InputSize, string> = {
  sm: 'pl-9 pr-10',
  md: 'pl-11 pr-12',
  lg: 'pl-11 pr-12',
  xl: 'pl-12 pr-14',
};

const getStatusStyles = (status: InputStatus, hasError: boolean, hasSuccess: boolean) => {
  if (hasError) {
    return 'border-red-500/70 focus:ring-red-500/50 focus:border-red-500 bg-red-500/5';
  }
  if (hasSuccess) {
    return 'border-emerald-500/70 focus:ring-emerald-500/50 focus:border-emerald-500 bg-emerald-500/5';
  }
  switch (status) {
    case 'success':
      return 'border-emerald-500/70 focus:ring-emerald-500/50 focus:border-emerald-500 bg-emerald-500/5';
    case 'error':
      return 'border-red-500/70 focus:ring-red-500/50 focus:border-red-500 bg-red-500/5';
    default:
      return 'border-slate-700/50 focus:border-teal-500 dark:border-slate-600 dark:focus:border-teal-400';
  }
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      success,
      helperText,
      labelIcon,
      leftIcon,
      rightIcon,
      showPasswordToggle = false,
      showClearButton = false,
      isSearch = false,
      inputPrefix,
      inputSuffix,
      size = 'md',
      status = 'default',
      required = false,
      showCharCount = false,
      maxLength,
      fullWidth = true,
      containerClassName = '',
      className = '',
      type = 'text',
      value,
      onChange,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [internalValue, setInternalValue] = useState('');
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;
    const currentValue = value !== undefined ? String(value) : internalValue;
    const charCount = currentValue.length;

    const handleClear = useCallback(() => {
      if (onChange) {
        const event = { target: { value: '' } } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }
      setInternalValue('');
    }, [onChange]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setInternalValue(e.target.value);
        onChange?.(e);
      },
      [onChange]
    );

    const displayRightIcon = rightIcon || (isSearch && currentValue && showClearButton && (
      <button
        type="button"
        onClick={handleClear}
        className={clsx(
          'absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors p-1 rounded-full hover:bg-slate-700/50',
          'dark:text-slate-500 dark:hover:text-slate-400'
        )}
        tabIndex={-1}
        aria-label="Clear input"
      >
        <X className={iconSizes[size]} />
      </button>
    ));

    const displayLeftIcon = leftIcon || (isSearch && (
      <Search className={iconSizes[size]} />
    ));

    return (
      <div className={clsx('w-full', fullWidth && 'w-full', containerClassName)}>
        {label && (
          <label className={clsx(
            'block text-sm font-medium mb-2',
            'text-slate-700 dark:text-slate-300',
            disabled && 'opacity-50 cursor-not-allowed'
          )}>
            {labelIcon && <span className="inline-flex mr-2">{labelIcon}</span>}
            {label}
            {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {inputPrefix && (
            <div className={clsx(
              'absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none font-medium',
              size === 'sm' && 'text-xs',
              size === 'lg' && 'text-base',
              size === 'xl' && 'text-lg'
            )}>
              {inputPrefix}
            </div>
          )}
          {displayLeftIcon && (
            <div className={clsx(
              'absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none',
              !isSearch && 'dark:hover:text-slate-300'
            )}>
              {displayLeftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            maxLength={maxLength}
            className={clsx(
              'w-full rounded-xl transition-all duration-200',
              'bg-slate-800/50 dark:bg-slate-900/80',
              'text-white dark:text-slate-100',
              'placeholder-slate-500 dark:placeholder-slate-500',
              'border focus:outline-none focus:ring-2',
              sizeStyles[size],
              getStatusStyles(status, !!error, !!success),
              displayLeftIcon && iconPadding[size],
              (displayRightIcon || isPassword) && !displayLeftIcon && 'pr-11',
              (displayRightIcon || isPassword) && displayLeftIcon && iconPadding[size],
              inputPrefix && 'pl-8',
              inputSuffix && 'pr-12',
              'hover:border-slate-600 dark:hover:border-slate-500',
              'disabled:bg-slate-900/50 disabled:cursor-not-allowed disabled:opacity-60',
              'focus:ring-2 focus:ring-offset-0',
              'dark:focus:ring-offset-slate-900',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${props.id}-error` : hint ? `${props.id}-hint` : undefined}
            {...props}
          />
          {inputSuffix && (
            <div className={clsx(
              'absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none font-medium',
              size === 'sm' && 'text-xs',
              size === 'lg' && 'text-base',
              size === 'xl' && 'text-lg'
            )}>
              {inputSuffix}
            </div>
          )}
          {displayRightIcon && !isPassword && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              {displayRightIcon}
            </div>
          )}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={clsx(
                'absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500',
                'hover:text-slate-300 dark:hover:text-slate-400 transition-colors p-1 rounded-lg',
                'hover:bg-slate-700/50 dark:hover:bg-slate-700'
              )}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className={iconSizes[size]} /> : <Eye className={iconSizes[size]} />}
            </button>
          )}
        </div>
        <div className="flex justify-between items-start mt-2 gap-2">
          <div className="flex-1">
            {error && (
              <p
                id={`${props.id}-error`}
                className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1.5"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </p>
            )}
            {success && !error && (
              <p className="text-sm text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                {success}
              </p>
            )}
            {(hint || helperText) && !error && !success && (
              <p id={`${props.id}-hint`} className="text-sm text-slate-500 dark:text-slate-400">
                {hint || helperText}
              </p>
            )}
          </div>
          {showCharCount && maxLength && (
            <p className={clsx(
              'text-xs tabular-nums',
              charCount >= maxLength ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
            )}>
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface SearchInputProps extends Omit<InputProps, 'isSearch' | 'leftIcon'> {
  onSearch?: (value: string) => void;
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className = '', onSearch, onClear, showClearButton = true, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearch) {
        onSearch((e.target as HTMLInputElement).value);
      }
      props.onKeyDown?.(e);
    };

    return (
      <Input
        ref={ref}
        isSearch
        showClearButton={showClearButton}
        onKeyDown={handleKeyDown}
        className={className}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

export interface NumberInputProps extends Omit<InputProps, 'type' | 'onChange'> {
  value?: number;
  onChange?: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  decrementLabel?: string;
  incrementLabel?: string;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onChange,
      min = 0,
      max = 999,
      step = 1,
      decrementLabel = 'Decrease',
      incrementLabel = 'Increase',
      size = 'md',
      className = '',
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(value ?? 0);

    const currentValue = value !== undefined ? value : internalValue;

    const handleDecrement = () => {
      const newValue = Math.max(min, currentValue - step);
      setInternalValue(newValue);
      onChange?.(newValue);
    };

    const handleIncrement = () => {
      const newValue = Math.min(max, currentValue + step);
      setInternalValue(newValue);
      onChange?.(newValue);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFloat(e.target.value);
      if (!isNaN(parsed)) {
        const clamped = Math.min(max, Math.max(min, parsed));
        setInternalValue(clamped);
        onChange?.(clamped);
      }
    };

    const iconSize = iconSizes[size];

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="number"
          value={currentValue}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          className={clsx('pr-16', className)}
          {...props}
        />
        <div className={clsx(
          'absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5'
        )}>
          <button
            type="button"
            onClick={handleIncrement}
            className={clsx(
              'p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors',
              'dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700'
            )}
            aria-label={incrementLabel}
            disabled={currentValue >= max}
          >
            <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDecrement}
            className={clsx(
              'p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors',
              'dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700'
            )}
            aria-label={decrementLabel}
            disabled={currentValue <= min}
          >
            <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }
);

NumberInput.displayName = 'NumberInput';
