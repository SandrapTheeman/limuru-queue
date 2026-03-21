'use client';

import { ReactNode, useState, useMemo, useCallback, forwardRef } from 'react';
import { clsx } from 'clsx';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, X } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'select' | 'date' | 'number';
  filterOptions?: { label: string; value: string }[];
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  cellClassName?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  variant?: 'default' | 'striped' | 'bordered' | 'hover' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  rowKey: keyof T | ((row: T) => string);
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  filterable?: boolean;
  sortable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  loading?: boolean;
  loadingRows?: number;
  className?: string;
  stickyHeader?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  variant = 'default',
  size = 'md',
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  rowKey,
  onRowClick,
  searchable = false,
  searchPlaceholder = 'Search...',
  searchKeys = [],
  filterable = false,
  sortable = true,
  pagination = true,
  pageSize = 10,
  emptyMessage = 'No data available',
  emptyIcon,
  loading = false,
  loadingRows = 5,
  className = '',
  stickyHeader = false,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const getRowId = useCallback((row: T): string => {
    if (typeof rowKey === 'function') {
      return rowKey(row);
    }
    return String(row[rowKey]);
  }, [rowKey]);

  const filteredData = useMemo(() => {
    let result = [...data];

    if (searchQuery && searchKeys.length > 0) {
      const query = searchQuery.toLowerCase();
      result = result.filter((row) =>
        searchKeys.some((key) => {
          const value = row[key];
          return value !== null && value !== undefined && String(value).toLowerCase().includes(query);
        })
      );
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        result = result.filter((row) => {
          const cellValue = String(row[key]).toLowerCase();
          return cellValue.includes(value.toLowerCase());
        });
      }
    });

    if (sortConfig?.key && sortConfig.direction) {
      const column = columns.find((col) => col.key === sortConfig.key);
      if (column) {
        result.sort((a, b) => {
          const aValue = column.accessor(a);
          const bValue = column.accessor(b);
          
          if (aValue === bValue) return 0;
          
          const comparison = aValue < bValue ? -1 : 1;
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
      }
    }

    return result;
  }, [data, searchQuery, searchKeys, filters, sortConfig, columns]);

  const paginatedData = useMemo(() => {
    if (!pagination) return filteredData;
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, pagination, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleSort = useCallback((key: string) => {
    if (!sortable) return;
    setSortConfig((prev) => {
      if (prev?.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return null;
      }
      return { key, direction: 'asc' };
    });
  }, [sortable]);

  const handleSelectAll = useCallback(() => {
    if (!selectable || !onSelectionChange) return;
    if (selectedRows.length === paginatedData.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(paginatedData.map(getRowId));
    }
  }, [selectable, onSelectionChange, selectedRows.length, paginatedData, getRowId]);

  const handleSelectRow = useCallback((row: T) => {
    if (!selectable || !onSelectionChange) return;
    const id = getRowId(row);
    if (selectedRows.includes(id)) {
      onSelectionChange(selectedRows.filter((r) => r !== id));
    } else {
      onSelectionChange([...selectedRows, id]);
    }
  }, [selectable, onSelectionChange, selectedRows, getRowId]);

  const sizeStyles = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const paddingStyles = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-5 py-4',
  };

  const variantStyles = {
    default: 'bg-slate-800/50',
    striped: 'bg-slate-800/50 [&>tbody>tr:nth-child(even)]:bg-slate-800/30',
    bordered: 'border border-slate-700/50',
    hover: 'bg-slate-800/50 [&>tbody>tr]:hover:bg-slate-700/30',
    glass: 'glass-card',
  };

  return (
    <div className={clsx('flex flex-col gap-4', className)}>
      {(searchable || filterable) && (
        <div className="flex items-center gap-3">
          {searchable && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={searchPlaceholder}
                className={clsx(
                  'w-full pl-10 pr-10 py-2 rounded-xl',
                  'bg-slate-800/50 border border-slate-700/50',
                  'text-white placeholder-slate-400',
                  'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent',
                  'transition-all duration-200'
                )}
                aria-label="Search"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          {filterable && (
            <select
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className={clsx(
                'px-3 py-2 rounded-xl',
                'bg-slate-800/50 border border-slate-700/50',
                'text-white',
                'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'
              )}
              aria-label="Filter options"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          )}
        </div>
      )}

      <div className={clsx(
        'w-full overflow-x-auto rounded-xl',
        variantStyles[variant],
        variant === 'bordered' && 'border',
        stickyHeader && '[&>table]:sticky [&>table]:top-0'
      )}>
        <table className={clsx('w-full border-collapse', sizeStyles[size])}>
          <thead className="bg-gradient-to-r from-teal-600/20 to-teal-500/10 border-b border-slate-700/50">
            <tr>
              {selectable && (
                <th className={clsx(paddingStyles[size], 'w-12')}>
                  <input
                    type="checkbox"
                    checked={selectedRows.length === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-teal-500 focus:ring-teal-500 focus:ring-offset-0"
                    aria-label="Select all"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={clsx(
                    paddingStyles[size],
                    'text-left font-semibold uppercase tracking-wide text-teal-400',
                    column.headerClassName,
                    column.sortable && sortable && 'cursor-pointer select-none hover:text-teal-300',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className={clsx(
                    'flex items-center gap-2',
                    column.align === 'center' && 'justify-center',
                    column.align === 'right' && 'justify-end'
                  )}>
                    {column.header}
                    {column.sortable && sortable && (
                      <span className="flex flex-col">
                        <ChevronUp 
                          className={clsx(
                            'w-3 h-3 -mb-1',
                            sortConfig?.key === column.key && sortConfig.direction === 'asc' ? 'text-teal-400' : 'text-slate-500'
                          )} 
                        />
                        <ChevronDown 
                          className={clsx(
                            'w-3 h-3 -mt-1',
                            sortConfig?.key === column.key && sortConfig.direction === 'desc' ? 'text-teal-400' : 'text-slate-500'
                          )} 
                        />
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {loading ? (
              Array.from({ length: loadingRows }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {selectable && <td className={paddingStyles[size]}><div className="w-4 h-4 bg-slate-700 rounded" /></td>}
                  {columns.map((col) => (
                    <td key={col.key} className={clsx(paddingStyles[size], col.cellClassName)}>
                      <div className="h-4 bg-slate-700 rounded w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className={clsx(paddingStyles[size], 'text-center py-12')}>
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    {emptyIcon && <div className="opacity-50">{emptyIcon}</div>}
                    <p>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => {
                const rowId = getRowId(row);
                const isSelected = selectedRows.includes(rowId);
                return (
                  <tr
                    key={rowId}
                    className={clsx(
                      'transition-all duration-200',
                      isSelected && 'bg-teal-500/20',
                      onRowClick && 'cursor-pointer hover:bg-slate-700/30'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className={paddingStyles[size]} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(row)}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-teal-500 focus:ring-teal-500 focus:ring-offset-0"
                          aria-label={`Select row ${rowId}`}
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={clsx(
                          paddingStyles[size],
                          column.cellClassName,
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right'
                        )}
                      >
                        {column.accessor(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium',
                'bg-slate-800/50 border border-slate-700/50 text-slate-300',
                'hover:bg-slate-700 hover:border-slate-600',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-200'
              )}
              aria-label="Previous page"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page = i + 1;
              if (totalPages > 5) {
                if (currentPage > 3) {
                  page = currentPage - 2 + i;
                }
                if (currentPage > totalPages - 2) {
                  page = totalPages - 4 + i;
                }
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={clsx(
                    'w-8 h-8 rounded-lg text-sm font-medium',
                    'transition-all duration-200',
                    currentPage === page
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
                  )}
                  aria-label={`Page ${page}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium',
                'bg-slate-800/50 border border-slate-700/50 text-slate-300',
                'hover:bg-slate-700 hover:border-slate-600',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-200'
              )}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
