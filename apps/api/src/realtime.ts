// Real-time Queue Updates using Durable Objects
// This enables WebSocket connections for real-time queue updates

interface Env {
  QUEUE_ROOM: DurableObjectNamespace;
}

export interface QueueRoom {
  id: string;
  department: string;
  clients: Set<WebSocket>;
}

export class QueueRoomDO {
  private state: DurableObjectState;
  private department: string;
  private clients: Set<WebSocket> = new Set();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.department = 'default';
  }

  async fetch(request: Request): Promise<Response> {
    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      const { 0: client, 1: server } = new WebSocketPair();
      
      this.handleWebSocket(server);
      
      return new Response(null, { status: 101, webSocket: client });
    }

    // Return current queue state
    const data = await this.state.storage.get('queueData');
    return new Response(JSON.stringify(data || {}), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private handleWebSocket(ws: WebSocket) {
    this.clients.add(ws);
    
    ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data as string);
        this.handleMessage(message, ws);
      } catch (e) {
        console.error('Invalid message:', e);
      }
    });

    ws.addEventListener('close', () => {
      this.clients.delete(ws);
    });

    ws.addEventListener('error', () => {
      this.clients.delete(ws);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      department: this.department,
      clientCount: this.clients.size
    }));
  }

  private handleMessage(message: any, sender: WebSocket) {
    switch (message.type) {
      case 'subscribe':
        // Handle department subscription
        if (message.department) {
          this.department = message.department;
        }
        break;
        
      case 'ping':
        sender.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  }

  // Broadcast to all connected clients
  async broadcast(data: any) {
    const message = JSON.stringify(data);
    
    for (const client of this.clients) {
      try {
        client.send(message);
      } catch (e) {
        console.error('Failed to send to client:', e);
        this.clients.delete(client);
      }
    }
  }
}

// Broadcast queue update to all rooms
export async function broadcastQueueUpdate(
  env: {
    QUEUE_ROOM: DurableObjectNamespace;
  },
  department: string,
  data: any
): Promise<void> {
  const id = env.QUEUE_ROOM.idFromName(department);
  const stub = env.QUEUE_ROOM.get(id);
  
  // Get the DO instance to broadcast
  // Note: In production, you'd want to call a method on the DO
  // For now, this demonstrates the pattern
  console.log(`Broadcasting queue update to department: ${department}`, data);
}

// Patient Sync Durable Object for offline sync
export class PatientSyncDO {
  private state: DurableObjectState;
  private pendingChanges: any[] = [];

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method === 'POST') {
      const change = await request.json();
      this.pendingChanges.push(change);
      await this.state.storage.put('pendingChanges', this.pendingChanges);
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return pending changes
    const changes = await this.state.storage.get('pendingChanges');
    return new Response(JSON.stringify(changes || []), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async syncToServer(db: D1Database): Promise<number> {
    const changes = await this.state.storage.get('pendingChanges') as any[] || [];
    let synced = 0;
    
    for (const change of changes) {
      try {
        // Process the change
        await this.processChange(db, change);
        synced++;
      } catch (e) {
        console.error('Failed to sync change:', e);
      }
    }
    
    // Clear synced changes
    this.pendingChanges = [];
    await this.state.storage.delete('pendingChanges');
    
    return synced;
  }

  private async processChange(db: D1Database, change: any): Promise<void> {
    // Process different change types
    switch (change.type) {
      case 'queue_join':
        // Already handled by API, just log
        console.log('Synced queue join:', change.data);
        break;
      // Add more change types as needed
    }
  }
}
