import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { saveLocally, getLocal, clearLocal } from './storage';

export type NetworkStatus = 'online' | 'offline';
export type ConflictStrategy = 'client-wins' | 'server-wins' | 'merge';

interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: number;
  attempts: number;
  synced: boolean;
  lastError?: string;
}

interface OfflineStatus {
  isOnline: boolean;
  pendingCount: number;
  lastSyncTime: number | null;
  isSyncing: boolean;
}

const PENDING_OPS_KEY = 'pending_operations';
const LAST_SYNC_KEY = 'last_sync_time';
const SYNC_BACKOFF_KEY = 'sync_backoff';

const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 60000;

let networkListener: ((status: NetworkStatus) => void) | null = null;
let pendingOperations: PendingOperation[] = [];
let isOnline = true;
let isSyncing = false;
let lastSyncTime: number | null = null;
let currentBackoff = INITIAL_BACKOFF_MS;
let syncTimeoutId: NodeJS.Timeout | null = null;

export async function queueOperation(
  type: 'create' | 'update' | 'delete',
  entity: string,
  data: any
): Promise<string> {
  const operation: PendingOperation = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    entity,
    data,
    timestamp: Date.now(),
    attempts: 0,
    synced: false,
  };

  pendingOperations.push(operation);
  await saveLocalOperations();

  if (isOnline) {
    syncPending();
  }

  return operation.id;
}

export async function syncPending(): Promise<{ success: number; failed: number }> {
  if (isSyncing || !isOnline) {
    return { success: 0, failed: 0 };
  }

  isSyncing = true;
  let success = 0;
  let failed = 0;

  await loadLocalOperations();

  const pending = pendingOperations.filter((op) => !op.synced);

  for (const operation of pending) {
    try {
      const response = await fetchOperation(operation);

      if (response.ok) {
        operation.synced = true;
        operation.lastError = undefined;
        success++;
        currentBackoff = INITIAL_BACKOFF_MS;
      } else if (response.status === 409) {
        const serverData = await response.json();
        await resolveConflict(operation, serverData);
        operation.synced = true;
        operation.lastError = undefined;
        success++;
      } else {
        operation.attempts++;
        operation.lastError = `HTTP ${response.status}`;
        if (operation.attempts >= MAX_RETRIES) {
          failed++;
        }
      }
    } catch (error: any) {
      operation.attempts++;
      operation.lastError = error.message || 'Network error';
      if (operation.attempts >= MAX_RETRIES) {
        failed++;
      }
    }
  }

  pendingOperations = pendingOperations.filter(
    (op) => !op.synced || op.attempts < MAX_RETRIES
  );
  await saveLocalOperations();

  lastSyncTime = Date.now();
  await AsyncStorage.setItem(LAST_SYNC_KEY, lastSyncTime.toString());
  isSyncing = false;

  if (pendingOperations.filter(op => !op.synced).length > 0 && isOnline) {
    scheduleSync();
  }

  return { success, failed };
}

async function fetchOperation(operation: PendingOperation): Promise<Response> {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://limuru-queue-api.timnaessy-gitome.workers.dev/api';
  const token = await AsyncStorage.getItem('auth-storage');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    try {
      const { state } = JSON.parse(token);
      if (state?.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
      }
    } catch {
    }
  }

  let url = `${baseUrl}/api/${operation.entity}`;
  let method = 'POST';

  if (operation.type === 'update' || operation.type === 'delete') {
    url = `${baseUrl}/api/${operation.entity}/${operation.data.id}`;
    method = operation.type === 'update' ? 'PUT' : 'DELETE';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: operation.type !== 'delete' ? JSON.stringify(operation.data) : undefined,
  });

  return response;
}

function scheduleSync(): void {
  if (syncTimeoutId) {
    clearTimeout(syncTimeoutId);
  }

  syncTimeoutId = setTimeout(() => {
    if (isOnline && !isSyncing) {
      syncPending();
    }
  }, currentBackoff);

  currentBackoff = Math.min(currentBackoff * 2, MAX_BACKOFF_MS);
}

export async function resolveConflict(
  operation: PendingOperation,
  serverData: any,
  strategy: ConflictStrategy = 'server-wins'
): Promise<any> {
  switch (strategy) {
    case 'client-wins':
      return operation.data;
    case 'server-wins':
      return serverData;
    case 'merge':
      return {
        ...serverData,
        ...operation.data,
        id: serverData.id || operation.data.id,
        updatedAt: new Date().toISOString(),
      };
    default:
      return serverData;
  }
}

export async function getOfflineStatus(): Promise<OfflineStatus> {
  await loadLocalOperations();

  const pendingCount = pendingOperations.filter((op) => !op.synced).length;

  if (lastSyncTime === null) {
    const stored = await AsyncStorage.getItem(LAST_SYNC_KEY);
    lastSyncTime = stored ? parseInt(stored, 10) : null;
  }

  return {
    isOnline,
    pendingCount,
    lastSyncTime,
    isSyncing,
  };
}

async function loadLocalOperations(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(PENDING_OPS_KEY);
    if (stored) {
      pendingOperations = JSON.parse(stored);
    }
  } catch {
    pendingOperations = [];
  }
}

async function saveLocalOperations(): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_OPS_KEY, JSON.stringify(pendingOperations));
  } catch (error) {
    console.error('Failed to save pending operations:', error);
  }
}

export function initOfflineSync(
  onNetworkChange?: (status: NetworkStatus) => void
): () => void {
  networkListener = onNetworkChange || null;

  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const wasOnline = isOnline;
    isOnline = state.isConnected ?? false;

    if (networkListener) {
      networkListener(isOnline ? 'online' : 'offline');
    }

    if (!wasOnline && isOnline) {
      currentBackoff = INITIAL_BACKOFF_MS;
      syncPending();
    }
  });

  NetInfo.fetch().then((state: NetInfoState) => {
    isOnline = state.isConnected ?? false;
    if (networkListener) {
      networkListener(isOnline ? 'online' : 'offline');
    }
  });

  loadLocalOperations().then(() => {
    if (isOnline) {
      syncPending();
    }
  });

  return unsubscribe;
}

export async function clearPendingOperations(): Promise<void> {
  pendingOperations = [];
  await AsyncStorage.removeItem(PENDING_OPS_KEY);
}

export async function getPendingOperations(): Promise<PendingOperation[]> {
  await loadLocalOperations();
  return pendingOperations.filter((op) => !op.synced);
}

export async function retryFailedOperations(): Promise<void> {
  await loadLocalOperations();
  
  for (const op of pendingOperations) {
    if (op.attempts >= MAX_RETRIES) {
      op.attempts = 0;
      op.lastError = undefined;
    }
  }
  
  await saveLocalOperations();
  
  if (isOnline) {
    currentBackoff = INITIAL_BACKOFF_MS;
    syncPending();
  }
}

export async function removeOperation(id: string): Promise<void> {
  await loadLocalOperations();
  pendingOperations = pendingOperations.filter(op => op.id !== id);
  await saveLocalOperations();
}
