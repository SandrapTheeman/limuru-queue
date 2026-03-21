'use client';

import { useState, useRef, useEffect, useCallback, forwardRef, ReactNode } from 'react';
import { ChevronDown, Check, Search, AlertCircle, X } from 'lucide-react';
import { clsx } from 'clsx';

type SelectSize = 'sm' | 'md' | 'lg' | 'xl';
type SelectStatus = 'default' | 'error' | 'success';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface SelectProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  hint?: string;
  error?: string;
  success?: string;
  helperText?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  size?: SelectSize;
  status?: SelectStatus;
  statusIcon?: 'none' | 'error' | 'success' | 'both';
  searchable?: boolean;
  clearable?: boolean;
  multiSelect?: boolean;
  selectedValues?: string[];
  onMultiChange?: (values: string[]) => void;
  prefix?: ReactNode;
  suffix?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  containerClassName?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  showCheckmark?: boolean;
  optionClassName?: string;
}

const sizeStyles: Record<SelectSize, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'px-4 py-2.5 text-base min-h-[44px]',
  lg: 'px-4 py-3 text-lg min-h-[52px]',
  xl: 'px-5 py-4 text-xl min-h-[60px]',
};

const iconSizes: Record<SelectSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
};

const getStatusStyles = (status: SelectStatus, hasError: boolean) => {
  if (hasError) {
    return 'border-red-500/70 focus-within:ring-red-500/50 focus-within:border-red-500 bg-red-500/5';
  }
  switch (status) {
    case 'success':
      return 'border-emerald-500/70 focus-within:ring-emerald-500/50 focus-within:border-emerald-500 bg-emerald-500/5';
    case 'error':
      return 'border-red-500/70 focus-within:ring-red-500/50 focus-within:border-red-500 bg-red-500/5';
    default:
      return 'border-slate-700/50 focus-within:border-teal-500 dark:border-slate-600 dark:focus-within:border-teal-400';
  }
};

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      id,
      name,
      value,
      defaultValue,
      onChange,
      onValueChange,
      options,
      placeholder = 'Select an option',
      label,
      hint,
      error,
      success,
      helperText,
      disabled = false,
      readOnly = false,
      required = false,
      size = 'md',
      status = 'default',
      searchable = false,
      clearable = false,
      multiSelect = false,
      selectedValues: controlledSelectedValues,
      onMultiChange,
      prefix,
      suffix,
      fullWidth = true,
      className = '',
      containerClassName = '',
      leftIcon,
      rightIcon,
      showCheckmark = true,
      optionClassName = '',
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [internalValue, setInternalValue] = useState(defaultValue || '');
    const [internalSelected, setInternalSelected] = useState<string[]>(controlledSelectedValues || []);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const currentValue = multiSelect
      ? internalSelected
      : value !== undefined
      ? value
      : internalValue;

    const selectedOption = options.find((opt) => opt.value === currentValue);
    const selectedOptions = options.filter((opt) => internalSelected.includes(opt.value));

    const handleSelect = useCallback(
      (optionValue: string) => {
        if (multiSelect) {
          const newSelected = internalSelected.includes(optionValue)
            ? internalSelected.filter((v) => v !== optionValue)
            : [...internalSelected, optionValue];
          setInternalSelected(newSelected);
          onMultiChange?.(newSelected);
        } else {
          setInternalValue(optionValue);
          onChange?.(optionValue);
          onValueChange?.(optionValue);
          setIsOpen(false);
          setSearchQuery('');
        }
      },
      [multiSelect, internalSelected, onChange, onValueChange, onMultiChange]
    );

    const handleClear = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (multiSelect) {
          setInternalSelected([]);
          onMultiChange?.([]);
        } else {
          setInternalValue('');
          onChange?.('');
          onValueChange?.('');
        }
      },
      [multiSelect, onChange, onValueChange, onMultiChange]
    );

    const filteredOptions = searchable
      ? options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            opt.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : options;

    const isOptionSelected = (optionValue: string) => {
      if (multiSelect) {
        return internalSelected.includes(optionValue);
      }
      return currentValue === optionValue;
    };

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen, searchable]);

    const getDisplayValue = () => {
      if (multiSelect) {
        if (selectedOptions.length === 0) return placeholder;
        if (selectedOptions.length === 1) return selectedOptions[0].label;
        return `${selectedOptions.length} selected`;
      }
      return selectedOption?.label || placeholder;
    };

    return (
      <div
        ref={containerRef}
        className={clsx('relative', fullWidth && 'w-full', containerClassName)}
      >
        {label && (
          <label
            htmlFor={id}
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
        <button
          ref={ref}
          id={id}
          type="button"
          disabled={disabled || readOnly}
          onClick={() => !disabled && !readOnly && setIsOpen(!isOpen)}
          className={clsx(
            'relative w-full rounded-xl transition-all duration-200 text-left',
            'bg-slate-800/50 dark:bg-slate-900/80',
            'border focus:outline-none focus:ring-2 focus:ring-offset-0',
            sizeStyles[size],
            getStatusStyles(status, !!error),
            'dark:focus:ring-offset-slate-900',
            leftIcon && 'pl-11',
            (rightIcon || clearable || selectedOption || internalSelected.length > 0) && 'pr-11',
            'hover:border-slate-600 dark:hover:border-slate-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isOpen && 'ring-2',
            className
          )}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-invalid={!!error}
          aria-labelledby={label ? `${id}-label` : undefined}
        >
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <span className={clsx(
            'block truncate pr-6',
            (!selectedOption && internalSelected.length === 0) && 'text-slate-500 dark:text-slate-400'
          )}>
            {getDisplayValue()}
          </span>
          {clearable && (selectedOption || internalSelected.length > 0) && (
            <button
              type="button"
              onClick={handleClear}
              className={clsx(
                'absolute right-8 top-1/2 -translate-y-1/2',
                'text-slate-400 hover:text-slate-300 transition-colors p-0.5 rounded',
                'dark:text-slate-500 dark:hover:text-slate-400'
              )}
              tabIndex={-1}
              aria-label="Clear selection"
            >
              <X className={iconSizes[size]} />
            </button>
          )}
          <div className={clsx(
            'absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}>
            <ChevronDown className={iconSizes[size]} />
          </div>
        </button>

        {isOpen && (
          <div
            className={clsx(
              'absolute z-50 w-full mt-2 rounded-xl overflow-hidden',
              'bg-slate-800 dark:bg-slate-900',
              'border border-slate-700 dark:border-slate-700',
              'shadow-xl shadow-black/20 dark:shadow-black/40',
              'animate-in fade-in slide-in-from-top-2 duration-200'
            )}
            role="listbox"
          >
            {searchable && (
              <div className="p-2 border-b border-slate-700 dark:border-slate-700">
                <div className="relative">
                  <Search className={clsx(
                    'absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500',
                    iconSizes[size]
                  )} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className={clsx(
                      'w-full pl-10 pr-4 py-2 rounded-lg',
                      'bg-slate-700/50 dark:bg-slate-800',
                      'text-white dark:text-slate-100',
                      'placeholder-slate-500 dark:placeholder-slate-400',
                      'border border-slate-600 dark:border-slate-600',
                      'focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500',
                      'text-sm'
                    )}
                  />
                </div>
              </div>
            )}
            <div
              className={clsx(
                'max-h-60 overflow-y-auto',
                '[&::-webkit-scrollbar]:w-2',
                '[&::-webkit-scrollbar-track]:bg-slate-800 dark:[&::-webkit-scrollbar-track]:bg-slate-900',
                '[&::-webkit-scrollbar-thumb]:bg-slate-600 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700',
                '[&::-webkit-scrollbar-thumb]:rounded-full'
              )}
            >
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    className={clsx(
                      'w-full px-4 py-3 text-left flex items-center gap-3 transition-colors',
                      'hover:bg-slate-700/50 dark:hover:bg-slate-700',
                      option.disabled && 'opacity-50 cursor-not-allowed',
                      isOptionSelected(option.value) && 'bg-teal-500/10 dark:bg-teal-500/20',
                      optionClassName
                    )}
                    role="option"
                    aria-selected={isOptionSelected(option.value)}
                  >
                    {option.icon && (
                      <span className="flex-shrink-0 text-slate-400 dark:text-slate-500">
                        {option.icon}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-white dark:text-slate-100 truncate">
                        {option.label}
                      </div>
                      {option.description && (
                        <div className="text-sm text-slate-400 dark:text-slate-500 truncate">
                          {option.description}
                        </div>
                      )}
                    </div>
                    {multiSelect && (
                      <div className={clsx(
                        'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                        isOptionSelected(option.value)
                          ? 'bg-teal-500 border-teal-500'
                          : 'border-slate-600 dark:border-slate-500'
                      )}>
                        {isOptionSelected(option.value) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                    )}
                    {!multiSelect && showCheckmark && isOptionSelected(option.value) && (
                      <Check className={clsx('flex-shrink-0 text-teal-500 dark:text-teal-400', iconSizes[size])} />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between items-start mt-2 gap-2">
          <div className="flex-1">
            {error && (
              <p className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1.5" role="alert">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </p>
            )}
            {success && !error && (
              <p className="text-sm text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5">
                <Check className="w-4 h-4 flex-shrink-0" />
                {success}
              </p>
            )}
            {(hint || helperText) && !error && !success && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {hint || helperText}
              </p>
            )}
          </div>
          {suffix}
        </div>

        <input type="hidden" name={name} value={multiSelect ? internalSelected.join(',') : currentValue} />
      </div>
    );
  }
);

Select.displayName = 'Select';

export interface SelectOptionGroupProps {
  label: string;
  children: ReactNode;
}

export const SelectOptionGroup = ({ label, children }: SelectOptionGroupProps) => (
  <div className="py-1">
    <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
      {label}
    </div>
    {children}
  </div>
);

SelectOptionGroup.displayName = 'SelectOptionGroup';
