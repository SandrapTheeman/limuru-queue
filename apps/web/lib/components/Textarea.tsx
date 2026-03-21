'use client';

import { TextareaHTMLAttributes, forwardRef, useState, useCallback, useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { clsx } from 'clsx';

type TextareaSize = 'sm' | 'md' | 'lg' | 'xl';
type TextareaStatus = 'default' | 'error' | 'success';

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  success?: string;
  helperText?: string;
  size?: TextareaSize;
  status?: TextareaStatus;
  showCharCount?: boolean;
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;
  fullWidth?: boolean;
  containerClassName?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onResize?: (height: number) => void;
}

const sizeStyles: Record<TextareaSize, string> = {
  sm: 'px-3 py-2 text-sm min-h-[80px]',
  md: 'px-4 py-3 text-base min-h-[120px]',
  lg: 'px-4 py-4 text-lg min-h-[160px]',
  xl: 'px-5 py-5 text-xl min-h-[200px]',
};

const getStatusStyles = (status: TextareaStatus, hasError: boolean, hasSuccess: boolean) => {
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

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      success,
      helperText,
      size = 'md',
      status = 'default',
      showCharCount = false,
      autoResize = false,
      minRows = 3,
      maxRows = 10,
      fullWidth = true,
      containerClassName = '',
      leftIcon,
      rightIcon,
      className = '',
      required = false,
      disabled,
      value,
      onChange,
      onResize,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const combinedRef = (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const currentValue = value !== undefined ? String(value) : internalValue;
    const charCount = currentValue.length;
    const maxLength = props.maxLength;

    const adjustHeight = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea || !autoResize) return;

      textarea.style.height = 'auto';
      const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 24;
      const minHeight = lineHeight * minRows;
      const maxHeight = lineHeight * maxRows;
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
      onResize?.(newHeight);
    }, [autoResize, minRows, maxRows, onResize]);

    useEffect(() => {
      adjustHeight();
    }, [currentValue, adjustHeight]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInternalValue(e.target.value);
        onChange?.(e);
        if (autoResize) {
          requestAnimationFrame(adjustHeight);
        }
      },
      [onChange, autoResize, adjustHeight]
    );

    const handleClear = useCallback(() => {
      const event = { target: { value: '' } } as React.ChangeEvent<HTMLTextAreaElement>;
      setInternalValue('');
      onChange?.(event);
      if (autoResize) {
        requestAnimationFrame(adjustHeight);
      }
    }, [onChange, autoResize, adjustHeight]);

    return (
      <div className={clsx('w-full', fullWidth && 'w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={props.id}
            className={clsx(
              'block text-sm font-medium mb-2',
              'text-slate-700 dark:text-slate-300',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-3 text-slate-400 dark:text-slate-500 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <textarea
            ref={combinedRef}
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            rows={minRows}
            className={clsx(
              'w-full rounded-xl transition-all duration-200 resize-none',
              'bg-slate-800/50 dark:bg-slate-900/80',
              'text-white dark:text-slate-100',
              'placeholder-slate-500 dark:placeholder-slate-500',
              'border focus:outline-none focus:ring-2',
              sizeStyles[size],
              getStatusStyles(status, !!error, !!success),
              leftIcon && 'pl-11',
              (rightIcon || showCharCount) && 'pr-11',
              'hover:border-slate-600 dark:hover:border-slate-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              autoResize && 'overflow-hidden',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${props.id}-error` : hint ? `${props.id}-hint` : undefined}
            {...props}
          />
          {rightIcon && !showCharCount && (
            <div className="absolute right-3 top-3 text-slate-400 dark:text-slate-500 pointer-events-none">
              {rightIcon}
            </div>
          )}
          {showCharCount && (
            <div className={clsx(
              'absolute right-3 top-3 text-xs tabular-nums',
              charCount >= (maxLength || Infinity) ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
            )}>
              {charCount}{maxLength && `/${maxLength}`}
            </div>
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
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export interface RichTextareaProps extends TextareaProps {
  toolbar?: React.ReactNode;
}

export const RichTextarea = forwardRef<HTMLTextAreaElement, RichTextareaProps>(
  ({ toolbar, className = '', ...props }, ref) => {
    return (
      <div className="rounded-xl border border-slate-700/50 dark:border-slate-600 overflow-hidden bg-slate-800/50 dark:bg-slate-900/80">
        {toolbar && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/50 dark:border-slate-600 bg-slate-800/30 dark:bg-slate-900/50">
            {toolbar}
          </div>
        )}
        <Textarea
          ref={ref}
          className={clsx(
            'border-0 rounded-none bg-transparent',
            'focus:ring-0 focus:border-transparent',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

RichTextarea.displayName = 'RichTextarea';
