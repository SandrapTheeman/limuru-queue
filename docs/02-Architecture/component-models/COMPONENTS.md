# Component Models

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Description:** Detailed documentation of all system components

---

## Table of Contents

1. [Overview](#overview)
2. [API Service](#api-service)
3. [Queue Engine](#queue-engine)
4. [WebSocket Hub](#websocket-hub)
5. [Notification Service](#notification-service)
6. [TV Display Service](#tv-display-service)
7. [HMS Adapter](#hms-adapter)
8. [WhatsApp Bot](#whatsapp-bot)
9. [Mobile App](#mobile-app)

---

## Overview

This document provides detailed documentation of all major components in the Limuru Queue Management System, including their responsibilities, interfaces, and interactions.

### Component Hierarchy

```
+------------------------------------------------------------------+
|                      Limuru Queue System                          |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+      +------------------+                   |
|  |   API Service    |      |  Web Frontend    |                   |
|  |  (Cloudflare)    |      |    (Next.js)     |                   |
|  +--------+---------+      +--------+---------+                   |
|           |                         |                              |
|           +-------------+-----------+                              |
|                         |                                          |
|           +-------------+-------------+                             |
|           |             |             |                             |
|           v             v             v                             |
|  +------------------+ +------+ +------------------+                |
|  |   Queue Engine   | |  KV  | |  Notification    |                |
|  |                  | |Cache | |    Service       |                |
|  +------------------+ +------+ +------------------+                |
|           |                                                            |
|           v                                                            |
|  +------------------+                                                  |
|  |  WebSocket Hub   |                                                  |
|  | (Durable Objects)|                                                  |
|  +------------------+                                                  |
|           |                                                            |
|           v                                                            |
|  +------------------+                                                  |
|  |  TV Display Svc  |                                                  |
|  +------------------+                                                  |
|                                                                   |
+------------------------------------------------------------------+
```

---

## API Service

**Location:** `apps/api/src/index.ts`  
**Type:** Cloudflare Worker (Hono.js)  
**Runtime:** V8 isolates

### Responsibilities

- RESTful API endpoint handling
- Authentication and authorization
- Request validation
- Business logic execution
- Database operations
- External service integration

### Architecture

```
                    +------------------+
                    |   Hono Server    |
                    |  (API Gateway)   |
                    +--------+---------+
                             |
         +-------------------+-------------------+
         |                   |                   |
+--------v--------+ +--------v--------+ +--------v--------+
|    Routes       | |   Middleware    | |    Services     |
|                 | |                 | |                 |
| - auth.ts       | | - auth.ts       | | - queue.ts     |
| - queue.ts      | | - rbac.ts       | | - ticket.ts    |
| - patients.ts   | | - validate.ts   | | - patient.ts   |
| - display.ts    | | - rateLimit.ts  | | - notification  |
| - admin.ts      | | - logger.ts     | | - analytics    |
|                 | | - errorHandle   | |                 |
+-----------------+ +-----------------+ +-----------------+
```

### Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Worker entry point, server setup |
| `src/routes/*.ts` | API route handlers |
| `src/middleware/*.ts` | Request middleware |
| `src/services/*.ts` | Business logic |
| `src/db/client.ts` | D1 database client |
| `src/config.ts` | Configuration |

### API Endpoints

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/logout` | User logout |
| POST | `/api/v1/auth/refresh` | Refresh token |
| GET | `/api/v1/auth/me` | Get current user |

#### Queue Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/tickets` | Create new ticket |
| GET | `/api/v1/tickets/:id` | Get ticket details |
| POST | `/api/v1/queue/:dept/call` | Call next patient |
| POST | `/api/v1/queue/:dept/recall` | Recall patient |
| POST | `/api/v1/queue/:dept/transfer` | Transfer patient |
| POST | `/api/v1/queue/complete` | Complete service |

#### Patients
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/patients` | Create patient |
| GET | `/api/v1/patients/:id` | Get patient |
| PUT | `/api/v1/patients/:id` | Update patient |
| GET | `/api/v1/patients/search` | Search patients |

#### Display
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/display/:dept` | Get display data |
| GET | `/api/v1/display/:dept/stream` | SSE for updates |

### Middleware Stack

```typescript
// apps/api/src/index.ts
const app = new Hono()
  .use('*', logger())
  .use('*', cors())
  .use('*', bodyParser())
  .use('/api/*', rateLimit({ limit: 100 }))
  .use('/api/v1/*', auth())
  .route('/api/v1', routes);
```

---

## Queue Engine

**Location:** `apps/api/src/services/queue.ts`  
**Type:** Service module

### Responsibilities

- Ticket generation
- Priority queue management (min-heap)
- Wait time calculation
- Queue state transitions
- Position calculation

### Architecture

```
+------------------------------------------------------------------+
|                        Queue Engine                               |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+      +------------------+                   |
|  |  Ticket Service  |      | Priority Calc    |                   |
|  |                  |      |                  |                   |
|  | - generate()     | ---> | - calculateScore()                   |
|  | - validate()     |      | - agingBonus()    |                   |
|  | - format()       |      | - position()      |                   |
|  +--------+---------+      +--------+---------+                   |
|           |                         |                             |
|           v                         v                             |
|  +------------------+      +------------------+                   |
|  |   Queue Store    |      |   State Machine  |                   |
|  |                  |      |                  |                   |
|  | - enqueue()      |      | - GENERATED      |                   |
|  | - dequeue()      |      | - WAITING        |                   |
|  | - peek()         |      | - CALLED         |                   |
|  | - update()       |      | - SERVING        |                   |
|  +--------+---------+      | - COMPLETED      |                   |
|           |                | - CANCELLED      |                   |
|           +----------------+                  |                   |
|                        +------------------+                       |
|                                                                   |
+------------------------------------------------------------------+
```

### State Machine

```
     +----------+
     | GENERATED|
     +----+-----+
          |
          v
     +----------+
+-----+ WAITING +-----+
|     +----+----+      |
|          |           |
|    +-----+-----+     |
|    |  CALLED  |     |
|    +----+-----+     |
|         |           |
|    +----+-----+     |
|    | SERVING  |<----+
|    +----+-----+     |
|         |           |
+---------+-----------+
          |
          v
   +-----------+
   | COMPLETED |
   +-----------+

   CANCELLED: Any state except COMPLETED
   EXPIRED: WAITING after 8 hours
   TRANSFERRED: WAITING to another dept
```

### Key Functions

#### Ticket Generation
```typescript
// apps/api/src/services/ticket.ts:34
async function generateTicket(params: {
  patientId: string;
  departmentCode: string;
  priority: Priority;
  notes?: string;
}): Promise<Ticket> {
  // 1. Get next sequence number for department
  const seq = await getNextSequence(params.departmentCode);
  
  // 2. Format ticket number: DEPT/R---/SEQ
  const ticketNumber = formatTicketNumber(params.departmentCode, seq);
  
  // 3. Create ticket record
  const ticket = await db.insert(tickets).values({
    id: generateUUID(),
    number: ticketNumber,
    sequence: seq,
    patientId: params.patientId,
    departmentCode: params.departmentCode,
    priority: params.priority,
    status: 'generated',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
  });
  
  // 4. Add to queue
  await enqueue(ticket.id);
  
  return ticket;
}
```

#### Priority Calculation
```typescript
// apps/api/src/services/priority.ts:12
function calculateScore(priority: Priority, waitingMinutes: number): number {
  const priorityWeights = {
    emergency: 100,
    urgent: 200,
    normal: 300,
    low: 400,
  };
  
  const priorityWeight = priorityWeights[priority];
  const waitTimeBoost = Math.floor(waitingMinutes / 10);
  
  // Lower score = higher priority
  return priorityWeight + waitTimeBoost;
}
```

---

## WebSocket Hub

**Location:** `apps/api/src/workers/websocket.ts`  
**Type:** Durable Object

### Responsibilities

- Maintain WebSocket connections
- Room-based subscriptions (by department)
- Broadcast events to subscribers
- Connection state management

### Architecture

```
                    +------------------+
                    |  WebSocket Hub   |
                    | (Durable Object) |
                    +--------+---------+
                             |
     +-----------------------+-----------------------+
     |                       |                       |
     v                       v                       v
+----------------+ +----------------+ +----------------+
|   TV Display   | |   Mobile App   | |    Dashboard   |
|   (subscribe) | |   (subscribe)  | |   (subscribe)  |
|                | |                | |                |
| Room: MED     | | Room: own      | | Room: dept    |
+----------------+ +----------------+ +----------------+
```

### Room Management

| Room | Subscribers | Events |
|------|-------------|--------|
| `dept:MED` | All MED TV displays | Queue updates for Medical |
| `dept:PED` | All PED TV displays | Queue updates for Pediatrics |
| `dept:*` | Admin dashboards | All queue events |
| `user:123` | Specific user | Personal notifications |

### Events

```typescript
type WSEvent = 
  | { type: 'PATIENT_CALLED'; payload: CalledPayload }
  | { type: 'QUEUE_UPDATED'; payload: QueuePayload }
  | { type: 'PATIENT_COMPLETED'; payload: CompletedPayload }
  | { type: 'EMERGENCY'; payload: EmergencyPayload }
  | { type: 'ANNOUNCEMENT'; payload: AnnouncementPayload };
```

### Connection Handler

```typescript
// apps/api/src/workers/websocket.ts:45
class WebSocketHub implements DurableObject {
  async fetch(request: Request): Promise<Response> {
    const { 0: client, 1: server } = new WebSocketPair();
    
    // Accept the WebSocket connection
    server.accept();
    
    // Handle incoming messages
    server.addEventListener('message', async (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'SUBSCRIBE') {
        await this.subscribe(client, message.room);
      } else if (message.type === 'UNSUBSCRIBE') {
        await this.unsubscribe(client, message.room);
      }
    });
    
    // Cleanup on close
    server.addEventListener('close', () => {
      this.removeClient(client);
    });
    
    return new Response(null, { webSocket: client });
  }
}
```

---

## Notification Service

**Location:** `apps/api/src/services/notification.ts`  
**Type:** Service module

### Responsibilities

- Send SMS via Africa's Talking
- Send WhatsApp messages
- Queue notifications for delivery
- Handle delivery failures

### Channels

| Channel | Provider | Use Case |
|---------|----------|----------|
| SMS | Africa's Talking | Ticket confirmation, called |
| WhatsApp | WhatsApp Cloud API | Status queries, rich content |
| Push | Expo Push | Mobile app notifications |
| Email | SendGrid | Daily reports |

### Templates

```typescript
const templates = {
  TICKET_CREATED: {
    sms: 'Your ticket: {ticketNumber}. Position: {position}. Dept: {department}',
    whatsapp: 'New Ticket\n\nTicket: {ticketNumber}\nPosition: {position}\nWait: ~{estimatedWait}\n\nWe'll notify you when called.',
  },
  PATIENT_CALLED: {
    sms: 'Your turn! Please proceed to {roomNumber}.',
    whatsapp: 'Called\n\n{ticketNumber}\n\nPlease proceed to *{roomNumber}* now.',
    audio: 'Patient {name}, please proceed to room {roomNumber}',
  },
};
```

---

## TV Display Service

**Location:** `apps/web/components/display/`  
**Type:** React components

### Responsibilities

- Render queue board
- Display called patient prominently
- Show queue list
- Handle audio announcements
- IPTV overlay

### Components

| Component | Purpose |
|-----------|---------|
| `QueueBoard` | Main container |
| `CalledPatient` | Large display of called patient |
| `UpNext` | Next patient in queue |
| `WaitingList` | List of waiting patients |
| `Announcements` | Banner messages |
| `Clock` | Date/time display |
| `VideoOverlay` | IPTV PiP |
| `AudioControl` | Volume and mute |

### Layout

```
+------------------------------------------------------------------+
|  [Logo]        MEDICAL DEPARTMENT         [Date] [Time] [Audio] |
+------------------------------------------------------------------+
|                                                                   |
|                    +------------------------+                     |
|                    |                        |                     |
|                    |   NOW CALLING          |                     |
|                    |                        |                     |
|                    |    MED/R201/001        |                     |
|                    |                        |                     |
|                    |    John K.             |                     |
|                    |                        |                     |
|                    |   [ROOM 201]           |                     |
|                    |                        |                     |
|                    +------------------------+                     |
|                                                                   |
+------------------------------------------------------------------+
|  UP NEXT                                                           |
|  ---------------------------------------------------------------- |
|  1. MED/R---/002 - Mary W.    |  Priority: Normal | Wait: 15 min |
|  2. MED/R---/003 - James K.   |  Priority: Normal | Wait: 8 min  |
|  ---------------------------------------------------------------- |
|                                                                   |
|  WAITING: 3 patients | Avg Wait: 12 min | Called Today: 45      |
+------------------------------------------------------------------+
```

---

## HMS Adapter

**Location:** `apps/api/src/services/hms.ts`  
**Type:** Service module

### Responsibilities

- Sync patient data from HMS
- Send visit data to HMS
- Handle HMS webhooks
- Map data between systems

### Data Mapping

| HMS Field | Queue System | Direction |
|-----------|--------------|-----------|
| `patient.id` | `patients.hms_id` | HMS → Queue |
| `visit.id` | `visits.hms_id` | HMS → Queue |
| `visit.status` | `queue_entries.status` | HMS → Queue |
| `queue_entry` | `visit.created` | Queue → HMS |
| `queue_complete` | `visit.completed` | Queue → HMS |

### Webhook Handler

```typescript
// apps/api/src/routes/webhooks.ts:23
app.post('/webhook/hms', async (c) => {
  const body = await c.req.json();
  
  // Verify signature
  if (!verifyHmsSignature(body, c.req.headers.get('x-hms-signature'))) {
    return c.json({ error: 'Invalid signature' }, 401);
  }
  
  // Process based on event type
  switch (body.event) {
    case 'PATIENT_ADMITTED':
      await handlePatientAdmitted(body.data);
      break;
    case 'VISIT_COMPLETED':
      await handleVisitCompleted(body.data);
      break;
    // ... other events
  }
  
  return c.json({ received: true });
});
```

---

## WhatsApp Bot

**Location:** `apps/api/src/services/whatsapp.ts`  
**Type:** Service module

### Responsibilities

- Process incoming WhatsApp messages
- Parse user commands
- Generate responses
- Handle session state

### Commands

| Command | Description | Example |
|---------|-------------|---------|
| `QUEUE` | Check position | `QUEUE` |
| `STATUS` | Visit status | `STATUS` |
| `CALL ME` | Request callback | `CALL ME` |
| `HELP` | Help menu | `HELP` |
| `LANG EN` | English | `LANG EN` |
| `LANG SW` | Swahili | `LANG SW` |

### Conversation Flow

```
User: QUEUE
Bot: Your Current Position
     
Ticket: MED/R---/001
Position: 3
Wait: ~45 minutes
Dept: Medical
     
Reply HELP for more commands.
```

---

## Mobile App

**Location:** `apps/mobile/`  
**Type:** React Native (Expo)

### Responsibilities

- Patient self-service
- Staff workflow
- Real-time notifications
- Offline support

### Screens

#### Patient Screens
| Screen | Purpose |
|--------|---------|
| Home | Quick actions |
| Queue Status | Current position |
| Book Appointment | Schedule visit |
| History | Past visits |

#### Staff Screens
| Screen | Purpose |
|--------|---------|
| Dashboard | Overview |
| Queue View | See queue |
| Call Patient | Call next |
| Patient Details | View patient |

### Architecture

```
+------------------------------------------------------------------+
|                      React Native App                            |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+      +------------------+                   |
|  |  Expo Router     |      |   Tanstack       |                   |
|  |  (Navigation)    |      |   Query          |                   |
|  |                  |      |   (State)        |                   |
|  +--------+---------+      +--------+---------+                   |
|           |                         |                             |
|           v                         v                             |
|  +------------------+      +------------------+                   |
|  |   Components     |      |    Services      |                   |
|  |                  |      |                  |                   |
|  | - ui/            |      | - api.ts         |                   |
|  | - queue/         |      | - websocket.ts   |                   |
|  | - patient/       |      | - notifications  |                   |
|  |                  |      | - storage.ts     |                   |
|  +------------------+      +------------------+                   |
|                                   |                                |
|                                   v                                |
|                          +------------------+                      |
|                          |   AsyncStorage   |                      |
|                          |   (Offline)      |                      |
|                          +------------------+                      |
|                                                                   |
+------------------------------------------------------------------+
```

---

## Related Documents

| Document | Path |
|----------|------|
| System Architecture | [../system-design/ARCHITECTURE.md](../system-design/ARCHITECTURE.md) |
| Data Flow | [../data-flow/REQUEST-LIFECYCLE.md](../data-flow/REQUEST-LIFECYCLE.md) |
| Queue Engine | [../../03-Queue-Engine/MASTER.md](../../03-Queue-Engine/MASTER.md) |
| API Reference | [../../04-API/MASTER.md](../../04-API/MASTER.md) |

---

*Last updated: March 20, 2026*
