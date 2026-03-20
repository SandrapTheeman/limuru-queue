declare const DurableObjectState: {
  new (): unknown;
  readonly blocked: {
    get: <T>(key: string) => Promise<T | null>;
    put: (key: string, value: unknown) => Promise<void>;
    delete: (key: string) => Promise<boolean>;
  };
};

declare const WebSocketPair: {
  new (): { socket: WebSocket; accept: () => void };
};

declare const crypto: {
  randomUUID: () => string;
};

export interface PatientSyncEnv {
  DB: unknown;
  CACHE_KV: unknown;
}

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'patient' | 'queue' | 'appointment';
  entityId: string;
  data: unknown;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
}

export interface SyncState {
  pendingOperations: SyncOperation[];
  lastSyncTimestamp: number;
  clientStates: Map<string, { lastSeen: number; syncVersion: number }>;
}

const DEFAULT_SYNC_STATE: SyncState = {
  pendingOperations: [],
  lastSyncTimestamp: 0,
  clientStates: new Map(),
};

export class PatientSyncDO {
  private state: { blocked: { get: <T>(key: string) => Promise<T | null>; put: (key: string, value: unknown) => Promise<void>; delete: (key: string) => Promise<boolean> } };
  private wsClients: Map<WebSocket, { clientId: string; lastSeen: number }> = new Map();

  constructor(state: unknown, _env: PatientSyncEnv) {
    this.state = state as PatientSyncDO['state'];
    void _env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    if (method === 'GET' && url.pathname === '/ws') {
      return this.handleWebSocket(request);
    }

    if (method === 'GET' && url.pathname === '/sync/state') {
      const state = await this.getSyncState();
      return new Response(JSON.stringify(state), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'POST' && url.pathname === '/sync/operations') {
      const body = await request.json();
      await this.queueOperation(body as Omit<SyncOperation, 'id' | 'timestamp' | 'status'>);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'POST' && url.pathname === '/sync/ack') {
      const body = await request.json();
      await this.acknowledgeOperations(body as { clientId: string; operationIds: string[] });
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  private async handleWebSocket(_request: Request): Promise<Response> {
    const url = new URL(_request.url);
    const clientId = url.searchParams.get('clientId') || crypto.randomUUID();

    const pair = new WebSocketPair();
    const ws = pair.socket;
    pair.accept();

    this.wsClients.set(ws, { clientId, lastSeen: Date.now() });

    ws.addEventListener('message', async (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string);
        await this.handleClientMessage(ws, message);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.addEventListener('close', () => {
      this.wsClients.delete(ws);
    });

    const syncState = await this.getSyncState();
    ws.send(JSON.stringify({
      type: 'sync_state',
      payload: syncState,
      timestamp: Date.now(),
    }));

    return new Response(null, { status: 101, webSocket: ws } as ResponseInit);
  }

  private async handleClientMessage(ws: WebSocket, message: { type: string; clientId?: string; operations?: SyncOperation[] }): Promise<void> {
    const clientInfo = this.wsClients.get(ws);
    if (!clientInfo) return;

    switch (message.type) {
      case 'sync_request':
        const state = await this.getSyncState();
        ws.send(JSON.stringify({
          type: 'sync_response',
          payload: state,
          timestamp: Date.now(),
        }));
        break;

      case 'operations_batch':
        if (message.operations) {
          for (const op of message.operations) {
            await this.queueOperation({
              type: op.type,
              entity: op.entity,
              entityId: op.entityId,
              data: op.data,
            });
          }
          await this.broadcastSyncUpdate();
        }
        break;

      case 'ack':
        if (message.clientId) {
          await this.updateClientState(message.clientId);
        }
        break;

      case 'ping':
        clientInfo.lastSeen = Date.now();
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
    }
  }

  async queueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'status'>): Promise<void> {
    const state = await this.getSyncState();
    state.pendingOperations.push({
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      status: 'pending',
    });
    state.lastSyncTimestamp = Date.now();
    await this.state.blocked.put('sync_state', state);
  }

  async acknowledgeOperations(args: { clientId: string; operationIds: string[] }): Promise<void> {
    const state = await this.getSyncState();
    state.pendingOperations = state.pendingOperations.filter(
      op => !args.operationIds.includes(op.id)
    );
    await this.updateClientState(args.clientId);
    await this.state.blocked.put('sync_state', state);
  }

  private async updateClientState(clientId: string): Promise<void> {
    const state = await this.getSyncState();
    const clientStates = new Map(state.clientStates);
    clientStates.set(clientId, { lastSeen: Date.now(), syncVersion: state.lastSyncTimestamp });
    state.clientStates = clientStates;
    await this.state.blocked.put('sync_state', state);
  }

  async broadcastSyncUpdate(): Promise<void> {
    const state = await this.getSyncState();
    const message = JSON.stringify({
      type: 'sync_update',
      payload: {
        pendingCount: state.pendingOperations.length,
        lastSync: state.lastSyncTimestamp,
      },
      timestamp: Date.now(),
    });

    for (const [ws] of this.wsClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  private async getSyncState(): Promise<SyncState> {
    const stored = await this.state.blocked.get<SyncState>('sync_state');
    if (stored && stored.clientStates instanceof Map === false) {
      stored.clientStates = new Map(Object.entries(stored.clientStates as unknown as Record<string, { lastSeen: number; syncVersion: number }>));
    }
    return stored ?? DEFAULT_SYNC_STATE;
  }

  async getPendingOperations(): Promise<SyncOperation[]> {
    const state = await this.getSyncState();
    return state.pendingOperations.filter(op => op.status === 'pending');
  }

  async markOperationSynced(operationId: string): Promise<void> {
    const state = await this.getSyncState();
    const operation = state.pendingOperations.find(op => op.id === operationId);
    if (operation) {
      operation.status = 'synced';
      await this.state.blocked.put('sync_state', state);
    }
  }

  async getClientState(clientId: string): Promise<{ lastSeen: number; syncVersion: number } | null> {
    const state = await this.getSyncState();
    return state.clientStates.get(clientId) ?? null;
  }
}