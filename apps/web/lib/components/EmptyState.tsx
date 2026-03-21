'use client';

import { ReactNode } from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon = '📭', 
  title, 
  description, 
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div 
      className={`
        flex flex-col items-center justify-center py-12 px-4 text-center
        ${className}
      `}
    >
      <div className="text-6xl mb-4 opacity-50">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-slate-400 max-w-md mb-6">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Specialized empty states for common scenarios
export function NoPatientsEmpty({ onAddPatient }: { onAddPatient?: () => void }) {
  return (
    <EmptyState
      icon="👥"
      title="No Patients"
      description="There are no patients in queue right now."
      action={onAddPatient ? { label: 'Add Patient', onClick: onAddPatient } : undefined}
    />
  );
}

export function NoResultsEmpty({ searchQuery, onClear }: { searchQuery?: string; onClear?: () => void }) {
  return (
    <EmptyState
      icon="🔍"
      title="No Results Found"
      description={searchQuery ? `No results found for "${searchQuery}". Try adjusting your search.` : 'No results found.'}
      action={onClear ? { label: 'Clear Search', onClick: onClear } : undefined}
    />
  );
}

export function NoDataEmpty({ title = 'No Data', onRefresh }: { title?: string; onRefresh?: () => void }) {
  return (
    <EmptyState
      icon="📊"
      title={title}
      description="There's no data available at the moment."
      action={onRefresh ? { label: 'Refresh', onClick: onRefresh } : undefined}
    />
  );
}

export function ErrorEmpty({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="⚠️"
      title="Something Went Wrong"
      description={message || 'An error occurred while loading data.'}
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
    />
  );
}
