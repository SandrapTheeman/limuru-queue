'use client';

import { ReactNode, forwardRef, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode;
  variant?: 'default' | 'striped' | 'bordered' | 'hover';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}: TableProps) => {
  const sizeStyles = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-700/50">
      <table 
        className={clsx(
          'w-full border-collapse',
          'bg-slate-800/50 backdrop-blur-sm',
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  );
});

Table.displayName = 'Table';

export interface TheadProps {
  children: ReactNode;
  className?: string;
}

export const Thead = forwardRef<HTMLTableSectionElement, TheadProps>(({
  children,
  className = '',
}: TheadProps) => {
  return (
    <thead 
      className={clsx(
        'bg-gradient-to-r from-teal-600/20 to-teal-500/10',
        'border-b border-slate-700/50',
        className
      )}
    >
      {children}
    </thead>
  );
});

Thead.displayName = 'Thead';

export interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc';
  onSort?: () => void;
}

export const Th = forwardRef<HTMLTableCellElement, ThProps>(({
  children,
  sortable = false,
  sortDirection,
  onSort,
  className = '',
  ...props
}: ThProps) => {
  return (
    <th 
      className={clsx(
        'px-4 py-3 text-left font-semibold uppercase tracking-wide',
        'text-teal-400',
        'transition-colors duration-200',
        sortable && 'cursor-pointer select-none hover:text-teal-300',
        className
      )}
      onClick={sortable ? onSort : undefined}
      aria-sort={sortDirection ? sortDirection === 'asc' ? 'ascending' : 'descending' : undefined}
      {...props}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <span className="flex flex-col">
            <svg 
              className={clsx(
                'w-3 h-3 -mb-1',
                sortDirection === 'asc' ? 'text-teal-400' : 'text-slate-500'
              )} 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 5l-7 7h14l-7-7z" />
            </svg>
            <svg 
              className={clsx(
                'w-3 h-3 -mt-1',
                sortDirection === 'desc' ? 'text-teal-400' : 'text-slate-500'
              )} 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 19l7-7H5l7 7z" />
            </svg>
          </span>
        )}
      </div>
    </th>
  );
});

Th.displayName = 'Th';

export interface TbodyProps {
  children: ReactNode;
  className?: string;
}

export const Tbody = forwardRef<HTMLTableSectionElement, TbodyProps>(({
  children,
  className = '',
}: TbodyProps) => {
  return (
    <tbody className={clsx('divide-y divide-slate-700/30', className)}>
      {children}
    </tbody>
  );
});

Tbody.displayName = 'Tbody';

export interface TrProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode;
  selected?: boolean;
  clickable?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export const Tr = forwardRef<HTMLTableRowElement, TrProps>(({
  children,
  selected = false,
  clickable = false,
  variant = 'default',
  className = '',
  ...props
}: TrProps) => {
  const variantStyles = {
    default: '',
    success: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    warning: 'bg-amber-500/10 hover:bg-amber-500/20',
    danger: 'bg-red-500/10 hover:bg-red-500/20',
  };

  return (
    <tr 
      className={clsx(
        'transition-all duration-200',
        'hover:bg-slate-700/30',
        selected && 'bg-teal-500/20 hover:bg-teal-500/30',
        variantStyles[variant],
        clickable && 'cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
});

Tr.displayName = 'Tr';

export interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
}

export const Td = forwardRef<HTMLTableCellElement, TdProps>(({
  children,
  className = '',
  ...props
}: TdProps) => {
  return (
    <td 
      className={clsx(
        'px-4 py-3',
        'border-b border-slate-700/30',
        'text-slate-300',
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
});

Td.displayName = 'Td';

export interface TableActionsProps {
  children: ReactNode;
  className?: string;
}

export const TableActions = forwardRef<HTMLDivElement, TableActionsProps>(({
  children,
  className = '',
}: TableActionsProps) => {
  return (
    <td className="px-4 py-3 border-b border-slate-700/30">
      <div className={clsx('flex items-center gap-2 justify-end', className)}>
        {children}
      </div>
    </td>
  );
});

TableActions.displayName = 'TableActions';

export interface TableEmptyProps {
  colSpan: number;
  message?: string;
  icon?: ReactNode;
}

export function TableEmpty({ colSpan, message = 'No data available', icon }: TableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          {icon && <div className="opacity-50">{icon}</div>}
          <p className="text-sm">{message}</p>
        </div>
      </td>
    </tr>
  );
}

export interface TableLoadingProps {
  colSpan: number;
  rows?: number;
}

export function TableLoading({ colSpan, rows = 5 }: TableLoadingProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: colSpan }).map((_, j) => (
            <td key={j} className="px-4 py-3 border-b border-slate-700/30">
              <div className="h-4 bg-slate-700 rounded w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
