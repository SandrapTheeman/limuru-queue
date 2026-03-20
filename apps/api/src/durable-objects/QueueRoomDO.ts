declare const DurableObjectState: {
  new (): unknown;
  readonly blocked: {
    get: <T>(key: string) => Promise<T | null>;
    put: (key: string, value: unknown) => Promise<void>;
    delete: (key: string) => Promise<boolean>;
  };
};

declare const D1Database: {
  prepare: (sql: string) => unknown;
};

declare const WebSocketPair: {
  new (): { socket: WebSocket; accept: () => void };
};

declare const crypto: {
  randomUUID: () => string;
};

export interface QueueRoomEnv {
  DB: unknown;
}

export interface QueueState {
  queue: Array<{
    id: string;
    patientId: string;
    ticketNumber: number;
    status: string;
    calledAt?: number;
  }>;
  lastUpdated: number;
}

const DEFAULT_QUEUE_STATE: QueueState = {
  queue: [],
  lastUpdated: Date.now(),
};

export class QueueRoomDO {
  private state: { blocked: { get: <T>(key: string) => Promise<T | null>; put: (key: string, value: unknown) => Promise<void> } };
  private _env: QueueRoomEnv;
  private wsClients: Map<WebSocket, Set<string>> = new Map();

  constructor(state: unknown, env: QueueRoomEnv) {
    this.state = state as QueueRoomDO['state'];
    this._env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    if (method === 'GET' && url.pathname === '/ws') {
      return this.handleWebSocket(request);
    }

    if (method === 'GET' && url.pathname === '/state') {
      const state = await this.getQueueState();
      return new Response(JSON.stringify(state), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'POST' && url.pathname === '/action') {
      const body = await request.json();
      await this.handleQueueAction(body as { type: string; data: unknown });
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  private async handleWebSocket(_request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const ws = pair.socket;
    pair.accept();

    this.wsClients.set(ws, new Set());

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

    const state = await this.getQueueState();
    ws.send(JSON.stringify({
      type: 'queue_state',
      payload: state,
      timestamp: Date.now(),
    }));

    return new Response(null, { status: 101, webSocket: ws } as ResponseInit);
  }

  private async handleClientMessage(ws: WebSocket, message: { type: string; channel?: string }): Promise<void> {
    const channels = this.wsClients.get(ws);
    if (!channels) return;

    if (message.type === 'subscribe' && message.channel) {
      channels.add(message.channel);
      ws.send(JSON.stringify({ type: 'subscribed', channel: message.channel }));
    } else if (message.type === 'unsubscribe' && message.channel) {
      channels.delete(message.channel);
      ws.send(JSON.stringify({ type: 'unsubscribed', channel: message.channel }));
    }
  }

  async handleQueueAction(args: { type: string; data: unknown }): Promise<void> {
    const { type, data } = args;

    switch (type) {
      case 'add_patient':
        await this.addPatient(data as { patientId: string; ticketNumber: number });
        break;
      case 'call_patient':
        await this.callPatient(data as { patientId: string });
        break;
      case 'complete_patient':
        await this.completePatient(data as { patientId: string });
        break;
      case 'cancel_patient':
        await this.cancelPatient(data as { patientId: string });
        break;
      case 'update_status':
        await this.updatePatientStatus(data as { patientId: string; status: string });
        break;
    }

    await this.broadcastQueueUpdate();
  }

  private async addPatient(data: { patientId: string; ticketNumber: number }): Promise<void> {
    const state = await this.getQueueState();
    state.queue.push({
      id: crypto.randomUUID(),
      patientId: data.patientId,
      ticketNumber: data.ticketNumber,
      status: 'waiting',
    });
    state.lastUpdated = Date.now();
    await this.state.blocked.put('queue', state);
  }

  private async callPatient(data: { patientId: string }): Promise<void> {
    const state = await this.getQueueState();
    const patient = state.queue.find(p => p.patientId === data.patientId);
    if (patient) {
      patient.status = 'called';
      patient.calledAt = Date.now();
      state.lastUpdated = Date.now();
      await this.state.blocked.put('queue', state);
      await this.broadcastPatientCalled(data.patientId, patient.ticketNumber);
    }
  }

  private async completePatient(data: { patientId: string }): Promise<void> {
    const state = await this.getQueueState();
    const index = state.queue.findIndex(p => p.patientId === data.patientId);
    if (index !== -1) {
      state.queue.splice(index, 1);
      state.lastUpdated = Date.now();
      await this.state.blocked.put('queue', state);
    }
  }

  private async cancelPatient(data: { patientId: string }): Promise<void> {
    await this.completePatient(data);
  }

  private async updatePatientStatus(data: { patientId: string; status: string }): Promise<void> {
    const state = await this.getQueueState();
    const patient = state.queue.find(p => p.patientId === data.patientId);
    if (patient) {
      patient.status = data.status;
      state.lastUpdated = Date.now();
      await this.state.blocked.put('queue', state);
    }
  }

  async broadcastQueueUpdate(): Promise<void> {
    const state = await this.getQueueState();
    const message = JSON.stringify({
      type: 'queue_update',
      payload: state,
      timestamp: Date.now(),
    });

    for (const [ws, channels] of this.wsClients) {
      if (ws.readyState === WebSocket.OPEN && channels.has('queue')) {
        ws.send(message);
      }
    }
  }

  async broadcastPatientCalled(patientId: string, ticketNumber: number): Promise<void> {
    const message = JSON.stringify({
      type: 'patient_called',
      payload: { patientId, ticketNumber },
      timestamp: Date.now(),
    });

    for (const [ws, channels] of this.wsClients) {
      if (ws.readyState === WebSocket.OPEN && channels.has('notifications')) {
        ws.send(message);
      }
    }
  }

  private async getQueueState(): Promise<QueueState> {
    const stored = await this.state.blocked.get<QueueState>('queue');
    return stored ?? DEFAULT_QUEUE_STATE;
  }
}