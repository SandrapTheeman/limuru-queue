'use client';

import { Clock, User, ChevronRight } from 'lucide-react';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';

export interface QueueEntry {
  id: string;
  queueNumber: string;
  patientName: string;
  patientId: string;
  serviceType: string;
  status: 'waiting' | 'called' | 'in-progress' | 'completed';
  estimatedWait?: number;
  calledAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface QueueCardProps {
  entry: QueueEntry;
  onAction?: (id: string, action: string) => void;
  showActions?: boolean;
}

export function QueueCard({ entry, onAction, showActions = true }: QueueCardProps) {
  const formatTime = (isoString?: string) => {
    if (!isoString) return null;
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card
      header={
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-blue-600">{entry.queueNumber}</span>
          <StatusBadge status={entry.status} />
        </div>
      }
      footer={
        showActions && (
          <div className="flex gap-2">
            {entry.status === 'waiting' && onAction && (
              <Button size="sm" onClick={() => onAction(entry.id, 'call')}>
                Call Patient
              </Button>
            )}
            {entry.status === 'called' && onAction && (
              <Button size="sm" onClick={() => onAction(entry.id, 'start')}>
                Start Service
              </Button>
            )}
            {entry.status === 'in-progress' && onAction && (
              <Button size="sm" variant="success" onClick={() => onAction(entry.id, 'complete')}>
                Complete
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAction?.(entry.id, 'details')}
              className="ml-auto"
            >
              Details <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-900">{entry.patientName}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>ID: {entry.patientId}</span>
          <span className="px-2 py-1 bg-gray-100 rounded">{entry.serviceType}</span>
        </div>
        {entry.estimatedWait && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>Est. wait: {entry.estimatedWait} min</span>
          </div>
        )}
        {entry.calledAt && (
          <div className="text-xs text-gray-400">
            Called at: {formatTime(entry.calledAt)}
          </div>
        )}
      </div>
    </Card>
  );
}
