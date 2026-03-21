'use client';

import { InputHTMLAttributes, forwardRef, ReactNode, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    error, 
    hint,
    icon, 
    leftIcon,
    rightIcon,
    showPasswordToggle,
    type = 'text',
    className = '', 
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;
    
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={`
              w-full px-4 py-3 
              bg-slate-800/50 border border-slate-700/50 rounded-xl
              text-white placeholder-slate-500
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500
              hover:border-slate-600
              disabled:bg-slate-900/50 disabled:cursor-not-allowed disabled:opacity-60
              ${leftIcon ? 'pl-11' : ''}
              ${(rightIcon || isPassword) ? 'pr-11' : ''}
              ${error ? 'border-red-500/70 focus:ring-red-500/50 focus:border-red-500' : ''}
              ${className}
            `}
            {...props}
          />
          {rightIcon && !isPassword && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {rightIcon}
            </div>
          )}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors p-1"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          )}
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-red-400"></span>
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="mt-2 text-sm text-slate-500">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Specialized search input with icon
export interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
  onSearch?: (value: string) => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className = '', onSearch, ...props }, ref) => {
    return (
      <div className="relative">
        <Input
          ref={ref}
          leftIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
          className={className}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
