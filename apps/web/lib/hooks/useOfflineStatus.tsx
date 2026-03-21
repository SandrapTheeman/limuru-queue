'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';

interface PendingAction {
  id: string;
  type: string;
  data: unknown;
  timestamp: number;
  retries: number;
}

interface OfflineState {
  isOnline: boolean;
  isOffline: boolean;
  pendingActions: PendingAction[];
  lastOnlineAt: number | null;
  addPendingAction: (type: string, data: unknown) => string;
  removePendingAction: (id: string) => void;
  syncPendingActions: () => Promise<void>;
  clearPendingActions: () => void;
}

const PENDING_ACTIONS_KEY = 'hospital_pending_actions';

function getPendingActions(): PendingAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(PENDING_ACTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setPendingActions(actions: PendingAction[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(actions));
  } catch {
    console.error('Failed to save pending actions');
  }
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  
  const handleOnline = () => callback();
  const handleOffline = () => callback();
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

export function useOfflineStatus(): OfflineState {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, () => true);
  const [pendingActions, setPendingActionsState] = useState<PendingAction[]>([]);
  const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setPendingActionsState(getPendingActions());
  }, []);

  useEffect(() => {
    if (isOnline) {
      setLastOnlineAt(Date.now());
    }
  }, [isOnline]);

  const addPendingAction = useCallback((type: string, data: unknown): string => {
    const id = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const action: PendingAction = {
      id,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
    };
    
    setPendingActionsState((prev) => {
      const updated = [...prev, action];
      setPendingActions(updated);
      return updated;
    });
    
    return id;
  }, []);

  const removePendingAction = useCallback((id: string) => {
    setPendingActionsState((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      setPendingActions(updated);
      return updated;
    });
  }, []);

  const syncPendingActions = useCallback(async () => {
    if (isSyncing || !isOnline) return;
    
    const actions = getPendingActions();
    if (actions.length === 0) return;
    
    setIsSyncing(true);
    
    for (const action of actions) {
      try {
        console.log(`Syncing action: ${action.type}`, action.data);
        await new Promise((resolve) => setTimeout(resolve, 100));
        removePendingAction(action.id);
      } catch (error) {
        console.error(`Failed to sync action ${action.id}:`, error);
        setPendingActionsState((prev) =>
          prev.map((a) =>
            a.id === action.id ? { ...a, retries: a.retries + 1 } : a
          )
        );
      }
    }
    
    setIsSyncing(false);
  }, [isSyncing, isOnline, removePendingAction]);

  const clearPendingActions = useCallback(() => {
    setPendingActionsState([]);
    setPendingActions([]);
  }, []);

  useEffect(() => {
    if (isOnline && pendingActions.length > 0) {
      const timer = setTimeout(syncPendingActions, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingActions.length, syncPendingActions]);

  return {
    isOnline,
    isOffline: !isOnline,
    pendingActions,
    lastOnlineAt,
    addPendingAction,
    removePendingAction,
    syncPendingActions,
    clearPendingActions,
  };
}

export interface OfflineBannerProps {
  className?: string;
  showSyncButton?: boolean;
  showPendingCount?: boolean;
}

export function OfflineBanner({
  className = '',
  showSyncButton = true,
  showPendingCount = true,
}: OfflineBannerProps) {
  const { isOffline, pendingActions, syncPendingActions } = useOfflineStatus();

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        bg-warning-500 text-white px-4 py-3 flex items-center justify-between
        animate-slide-in
        ${className}
      `}
    >
      <div className="flex items-center gap-3">
        <svg
          className="w-5 h-5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
          />
        </svg>
        <span className="text-sm font-medium">
          You are offline. Changes will be saved locally.
          {showPendingCount && pendingActions.length > 0 && (
            <span className="ml-2">
              ({pendingActions.length} action{pendingActions.length !== 1 ? 's' : ''} pending)
            </span>
          )}
        </span>
      </div>
      {showSyncButton && pendingActions.length > 0 && (
        <button
          onClick={syncPendingActions}
          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
        >
          Sync Now
        </button>
      )}
    </div>
  );
}
