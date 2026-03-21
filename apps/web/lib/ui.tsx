'use client';

import { useEffect, useState, createContext, useContext, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from './store';
import { api } from './api';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface ToastContextType {
  showToast: (type: Toast['type'], message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`animate-scale-in glass-card px-6 py-4 flex items-center gap-3 min-w-[300px] ${
              toast.type === 'success' ? 'border-green-500/50' :
              toast.type === 'error' ? 'border-red-500/50' :
              toast.type === 'warning' ? 'border-yellow-500/50' :
              'border-blue-500/50'
            }`}
          >
            <span className={`text-lg ${
              toast.type === 'success' ? 'text-green-400' :
              toast.type === 'error' ? 'text-red-400' :
              toast.type === 'warning' ? 'text-yellow-400' :
              'text-blue-400'
            }`}>
              {toast.type === 'success' ? '✓' :
               toast.type === 'error' ? '✕' :
               toast.type === 'warning' ? '⚠' : 'ℹ'}
            </span>
            <span className="text-white flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/60 hover:text-white"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useAuthGuard() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super_admin'))) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, user, router]);

  return { mounted, isAuthenticated, user };
}

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass-card animate-pulse">
          <div className="flex gap-4">
            <div className="w-24 h-6 bg-white/10 rounded"></div>
            <div className="flex-1 h-6 bg-white/10 rounded"></div>
            <div className="w-20 h-6 bg-white/10 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon = '📭',
  title = 'No data found',
  description = 'There are no items to display.',
  actionLabel,
  onAction
}: {
  icon?: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="glass-card text-center py-16">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-white/60 mb-6">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="glass-button-primary px-6 py-3">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger'
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass-card max-w-md w-full animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
        <p className="text-white/70 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="glass-button px-6 py-2">
            {cancelLabel}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-6 py-2 rounded-xl font-semibold transition ${
              variant === 'danger' ? 'bg-red-500 hover:bg-red-600 text-white' :
              variant === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
              'glass-button-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DataTableHeader({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>{children}</div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  );
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
      <span className="text-sm text-white/60">
        Showing {startItem} to {endItem} of {totalItems} entries
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="glass-button px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
          let page: number;
          if (totalPages <= 5) {
            page = i + 1;
          } else if (currentPage <= 3) {
            page = i + 1;
          } else if (currentPage >= totalPages - 2) {
            page = totalPages - 4 + i;
          } else {
            page = currentPage - 2 + i;
          }
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 rounded-lg transition ${
                currentPage === page
                  ? 'bg-primary-500 text-white'
                  : 'glass-button hover:bg-white/10'
              }`}
            >
              {page}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="glass-button px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function AdminHeader({
  title,
  breadcrumb,
  children
}: {
  title: string;
  breadcrumb?: { label: string; href: string }[];
  children?: ReactNode;
}) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="glass border-b border-white/10 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            {breadcrumb && breadcrumb.length > 0 && (
              <button
                onClick={() => router.push(breadcrumb[0].href)}
                className="text-white/60 hover:text-white"
              >
                ← Back
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">{title}</h1>
              {breadcrumb && breadcrumb.length > 0 && (
                <div className="text-sm text-white/50">
                  {breadcrumb.map((b, i) => (
                    <span key={i}>
                      {i > 0 && ' / '}
                      <span className={i === breadcrumb.length - 1 ? 'text-white/80' : ''}>
                        {b.label}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {children}
            <span className="text-sm text-white/70 hidden sm:block">
              {user?.name}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export function SearchFilter({
  searchTerm,
  onSearchChange,
  placeholder = 'Search...',
  filters
}: {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  placeholder?: string;
  filters?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="glass-input px-4 py-2 text-sm w-full sm:w-64"
      />
      {filters}
    </div>
  );
}

export function SortableHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort
}: {
  label: string;
  column: string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
}) {
  return (
    <button
      onClick={() => onSort(column)}
      className="flex items-center gap-1 text-left hover:text-white transition"
    >
      {label}
      <span className="text-white/40">
        {sortColumn === column ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  );
}

export function useDataTable<T>(initialData: T[] = []) {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedData = [...data].sort((a: any, b: any) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredData = searchTerm
    ? sortedData.filter((item: any) =>
        Object.values(item).some(val =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : sortedData;

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const refresh = () => {
    setCurrentPage(1);
  };

  return {
    data,
    setData,
    loading,
    setLoading,
    error,
    setError,
    searchTerm,
    setSearchTerm,
    sortColumn,
    sortDirection,
    handleSort,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    totalPages,
    filteredData,
    paginatedData,
    refresh
  };
}

export { api };
