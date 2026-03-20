# Data Flow - Request Lifecycle

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Description:** Complete data flow documentation for the Limuru Queue System

---

## Table of Contents

1. [Overview](#overview)
2. [Patient Registration Flow](#patient-registration-flow)
3. [Queue Management Flow](#queue-management-flow)
4. [Patient Calling Flow](#patient-calling-flow)
5. [TV Display Update Flow](#tv-display-update-flow)
6. [Staff Authentication Flow](#staff-authentication-flow)
7. [WhatsApp Message Flow](#whatsapp-message-flow)
8. [HMS Integration Flow](#hms-integration-flow)
9. [Offline Sync Flow](#offline-sync-flow)
10. [Notification Flow](#notification-flow)

---

## Overview

This document details all major data flows in the Limuru Queue Management System, from patient registration through service completion. Each flow includes step-by-step descriptions, sequence diagrams, and error handling.

### Data Flow Types

| Category | Flows |
|----------|-------|
| Core Queue | Registration, Calling, Serving, Completion |
| Authentication | Login, Session, Logout, Token Refresh |
| Display | TV Update, Audio Announcement |
| Integration | WhatsApp, HMS, SMS |
| Offline | Sync, Conflict Resolution |

---

## Patient Registration Flow

### Flow Diagram

```
+----------+     +--------+     +--------+     +--------+     +----------+
| Patient  |     | Web/   |     |  API   |     |   D1   |     | External |
| arrives  | --> | Mobile | --> | Server | --> |   DB   | --> | Services |
+----------+     +--------+     +--------+     +--------+     +----------+
                       |              |              |               |
                       | 1. Submit    | 2. Validate  | 3. Create    | 4. Send
                       |    form      |    data      |    record    |    SMS
                       |------------->|------------>|------------>|
                       |              |              |               |
                       |              |<------------|               |
                       | 5. Ticket    | 6. Generate |               |
                       |<-------------|   number    |               |
                       |              |              |               |
```

### Step-by-Step

#### Step 1: Patient Submits Registration Form

**Input Data:**
```json
{
  "patientName": "John Kamau",
  "patientPhone": "+254700123456",
  "patientIdNumber": "12345678",
  "departmentCode": "MED",
  "visitType": "new",
  "priority": "normal",
  "notes": "Follow-up visit"
}
```

#### Step 2: API Validates and Creates Ticket

**File:** `apps/api/src/services/ticket.ts:45`

```typescript
// Validate patient exists or create new
const patient = await PatientService.findOrCreate(input);

// Generate ticket number
const ticket = await TicketService.generate({
  patientId: patient.id,
  departmentCode: input.departmentCode,
  priority: input.priority,
});

// Calculate position
const position = await QueueService.calculatePosition(ticket.id);
```

#### Step 3: Database Insert

**Tables Updated:**
- `patients` (upsert)
- `tickets` (insert)
- `queue_entries` (insert)
- `audit_log` (insert)

#### Step 4: SMS Notification (Optional)

```typescript
// Send ticket via SMS
if (settings.smsEnabled) {
  await NotificationService.sendSMS({
    phone: patient.phone,
    message: `Your ticket: ${ticket.number}. Position: ${position}. Dept: ${department.name}`,
  });
}
```

### Response

```json
{
  "success": true,
  "data": {
    "ticketId": "TKT-001-MED-20260320-001",
    "ticketNumber": "MED/R---/001",
    "patientName": "John K***",
    "department": "Medical",
    "priority": "normal",
    "position": 1,
    "estimatedWait": "15 minutes",
    "createdAt": "2026-03-20T10:30:00.000Z",
    "validUntil": "2026-03-20T17:30:00.000Z"
  }
}
```

---

## Queue Management Flow

### Flow Diagram

```
+----------+     +--------+     +--------+     +--------+     +----------+
| Staff    |     | Web/   |     |  API   |     |   D1   |     | Durable  |
| Dashboard| --> | Mobile | --> | Server | --> |   DB   | --> | Objects  |
+----------+     +--------+     +--------+     +--------+     +----------+
                       |              |              |               |
                       | 1. Get queue | 2. Query     | 3. Fetch    | 4. State
                       |------------->|------------>|------------>|
                       |              |              |               |
                       | 3. Return   | 4. Sorted    |               |
                       |<-------------|   queue     |               |
                       |              |              |               |
```

### Priority Queue Algorithm

**File:** `apps/api/src/services/queue.ts:78`

```typescript
// Min-heap with wait-time scoring
interface QueueEntry {
  ticketId: string;
  score: number;      // Lower is higher priority
  createdAt: Date;
  waitingMinutes: number;
}

// Score calculation
const calculateScore = (priority: number, waitingMinutes: number): number => {
  const priorityWeight = 100;
  const waitTimeBoost = Math.floor(waitingMinutes / 10);
  return priorityWeight * priority + waitTimeBoost;
};
```

**Priority Levels:**
| Level | Name | Weight | Description |
|-------|------|--------|-------------|
| 1 | Emergency | 100 | Life-threatening |
| 2 | Urgent | 200 | Needs attention soon |
| 3 | Normal | 300 | Regular patients |
| 4 | Low | 400 | Non-urgent |

### Aging Algorithm

After 30 minutes, a normal priority patient gains priority over newer normal patients:
- 0-10 min: +0 points
- 10-20 min: +1 point
- 20-30 min: +2 points
- 30-40 min: +3 points (overtakes newer patients)
- ...

---

## Patient Calling Flow

### Flow Diagram

```
+----------+     +--------+     +--------+     +--------+     +----------+
| Staff    |     | Web/   |     |  API   |     |   D1   |     | WebSocket|
| clicks   | --> | Mobile | --> | Server | --> |   DB   | --> |  Hub     |
| "Call"   |     +--------+     +--------+     +--------+     +----------+
+----------+                       |              |               |
                                   | 1. Validate | 2. Update    | 3. Emit
                                   |    request  |    state     |   event
                                   |------------>|------------->|
                                   |              |               |
                                   | 4. Return   |               |
                                   |<------------|               |
                                   |              |               |
                                   +--------+     +--------+     +----------+
                                   |  Audio |     |   TV   |     | WebSocket|
                                   | Service| --> | Display| --> |  Clients |
                                   +--------+     +--------+     +----------+
```

### Step-by-Step

#### Step 1: Staff Calls Patient

**Request:**
```json
{
  "ticketId": "TKT-001-MED-20260320-001",
  "roomNumber": "R201",
  "callType": "manual",  // or "auto", "recall"
  "calledBy": "user_123"
}
```

#### Step 2: API Updates Queue State

**File:** `apps/api/src/services/queue.ts:145`

```typescript
// Update ticket status
await db.transaction(async (tx) => {
  // 1. Update ticket
  await tx.update(tickets)
    .set({ status: 'called', roomNumber, calledAt: now })
    .where(eq(tickets.id, ticketId));

  // 2. Create queue entry for call event
  await tx.insert(queueEvents).values({
    ticketId,
    eventType: 'called',
    roomNumber,
    calledBy,
    calledAt: now,
  });

  // 3. Update audit log
  await tx.insert(auditLog).values({
    userId: calledBy,
    action: 'CALL_PATIENT',
    entityType: 'ticket',
    entityId: ticketId,
    metadata: { roomNumber },
  });
});
```

#### Step 3: WebSocket Broadcast

**File:** `apps/api/src/workers/websocket.ts:89`

```typescript
// Broadcast to all subscribers of this department
await hub.broadcast({
  type: 'PATIENT_CALLED',
  payload: {
    ticketId,
    ticketNumber,
    patientName: maskName(patient.name),
    roomNumber,
    departmentCode,
    calledAt: now.toISOString(),
  },
  room: `dept:${departmentCode}`,
});
```

#### Step 4: TV Display Update

**WebSocket Message:**
```json
{
  "type": "PATIENT_CALLED",
  "payload": {
    "ticketNumber": "MED/R201/001",
    "patientName": "John K",
    "roomNumber": "R201",
    "department": "Medical",
    "priority": "normal",
    "calledAt": "10:30 AM"
  }
}
```

---

## TV Display Update Flow

### Flow Diagram

```
+-------------+     +-------------+     +-------------+     +-------------+
|   Durable   |     |   WebSocket |     |  Next.js   |     |   Browser   |
|   Objects   | --> |    Event    | --> |  API Route | --> |   (TV)      |
+-------------+     +-------------+     +-------------+     +-------------+
      |                   |                   |                    |
      | 1. Event          | 2. Forward       | 3. SSR + SSG      | 4. Render
      |    triggered       |    to room        |    update         |    board
      |------------------->|------------------>|------------------>|
      |                   |                   |                    |
```

### Display Update Types

| Event | Display Action |
|-------|----------------|
| PATIENT_CALLED | Highlight called patient, animate in |
| QUEUE_UPDATED | Re-sort and animate queue list |
| EMERGENCY | Flash red, sound alarm |
| ANNOUNCEMENT | Show banner message |
| DOCTOR_CALLED | Update doctor info |

### Fallback: Polling

If WebSocket connection fails:
```typescript
// Poll every 5 seconds
const poll = () => {
  fetch(`/api/queue/${department}?since=${lastUpdate}`)
    .then(r => r.json())
    .then(updateDisplay);
  setTimeout(poll, 5000);
};
```

---

## Staff Authentication Flow

### Flow Diagram

```
+----------+     +--------+     +--------+     +--------+     +----------+
| Staff    |     | Web/   |     |  API   |     |   KV   |     |   JWT    |
| enters   | --> | Mobile | --> | Server | --> | Session| --> | Response |
| creds    |     +--------+     +--------+     +--------+     +----------+
+----------+                       |              |               |
                                   | 1. Validate  | 2. Create    | 3. Return
                                   |    password   |    session    |   JWT
                                   |------------->|-------------->|
                                   |              |               |
                                   | 4. Token     |               |
                                   |<-------------|               |
                                   |              |               |
```

### Step-by-Step

#### Step 1: Login Request

**Request:**
```json
{
  "email": "doctor@limuru.cottage",
  "password": "securePassword123"
}
```

#### Step 2: Password Verification

**File:** `apps/api/src/services/auth.ts:34`

```typescript
const user = await db.query.users.findFirst({
  where: eq(users.email, email),
});

if (!user || !await bcrypt.compare(password, user.passwordHash)) {
  throw new AuthError('Invalid credentials');
}
```

#### Step 3: Create Session in KV

```typescript
const sessionId = crypto.randomUUID();
const session = {
  userId: user.id,
  role: user.role,
  departmentId: user.departmentId,
  createdAt: Date.now(),
  expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
};

// Store in KV with TTL
await KV.put(`session:${sessionId}`, JSON.stringify(session), {
  expirationTtl: 24 * 60 * 60,
});
```

#### Step 4: Generate JWT

```typescript
const token = await jwt.sign({
  sub: user.id,
  email: user.email,
  role: user.role,
  sessionId,
}, JWT_SECRET, { expiresIn: '1h' });
```

#### Step 5: Response

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user_123",
      "email": "doctor@limuru.cottage",
      "name": "Dr. Jane Smith",
      "role": "doctor",
      "department": "Medical"
    },
    "expiresAt": "2026-03-20T11:30:00.000Z"
  }
}
```

---

## WhatsApp Message Flow

### Flow Diagram

```
+----------+     +-----------+     +--------+     +--------+     +----------+
| Patient  |     | WhatsApp  |     |  API   |     |   D1   |     |  Queue   |
| sends    | --> | Cloud API | --> | Webhook| --> |   DB   |     |  Engine  |
| message  |     +-----------+     +--------+     +--------+     +----------+
+----------+                       |              |               |
                                   | 1. Incoming  | 2. Process   | 3. Reply
                                   |    message   |    intent     |   or act
                                   |------------->|-------------->|
                                   |              |               |
                                   | 4. Response  |               |
                                   |<-------------|               |
                                   |              |               |
```

### Supported Commands

| Command | Response | Action |
|---------|----------|--------|
| `QUEUE` | Current position | Lookup and reply |
| `STATUS` | Visit status | Check if called |
| `CALL ME` | Request callback | Add to callback list |
| `HELP` | Available commands | Send help message |
| `LANG EN/SW` | Language set | Update preference |

### Webhook Handler

**File:** `apps/api/src/routes/notifications.ts:67`

```typescript
app.post('/webhook/whatsapp', async (c) => {
  const body = await c.req.json();
  
  // Verify webhook signature
  if (!verifyWebhookSignature(body)) {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  // Extract message
  const { from, text } = body.messages[0];
  
  // Process command
  const result = await WhatsAppService.processCommand({
    phone: from,
    command: text.body.toUpperCase().trim(),
  });

  // Send reply
  await WhatsAppCloudAPI.sendMessage(from, result.reply);
});
```

---

## HMS Integration Flow

### Flow Diagram

```
+----------+     +--------+     +--------+     +--------+     +----------+
|   HMS    |     |  API   |     |   D1   |     |  Queue |     | Patient  |
| System   | --> |Webhook | --> |   DB   | --> | Engine | --> | Notified |
+----------+     +--------+     +--------+     +--------+     +----------+
                      |              |               |               |
                      | 1. Patient  | 2. Sync        | 3. Queue      | 4. SMS
                      |    visit    |    patient     |    update     |  通知
                      |----------->|-------------->|-------------->|
                      |              |               |               |
                      | 5. HMS Ack  |               |               |
                      |<------------|               |               |
                      |              |               |               |
```

### HMS Events

| Event | Action |
|-------|--------|
| PATIENT_ADMITTED | Auto-generate ticket if configured |
| VISIT_COMPLETED | Complete queue entry |
| PATIENT_TRANSFERRED | Transfer queue entry |
| APPOINTMENT_CREATED | Pre-book queue slot |

### Webhook Verification

```typescript
// Verify HMS webhook signature
const verifyHmsWebhook = (body: HmsPayload, signature: string): boolean => {
  const expected = crypto
    .createHmac('sha256', HMS_WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
};
```

---

## Offline Sync Flow

### Flow Diagram

```
+----------+     +--------+     +--------+     +--------+     +----------+
|  Mobile  |     | Service |    | Local  |     |  API   |     |   D1     |
|  Device  | --> | Worker  | --> |  IDB   | --> | Server | --> |   DB     |
+----------+     +--------+     +--------+     +--------+     +----------+
                      |              |               |               |
                      | 1. Offline  | 2. Queue      | 3. Sync      | 4. Resolve
                      |    action   |    locally     |    when      |    conflicts
                      |----------->|-------------->|   online     |----------->|
                      |              |               |               |
```

### Offline Capabilities

| Feature | Implementation |
|---------|----------------|
| View queue | Service Worker cache |
| Generate ticket | IndexedDB + queue for sync |
| Call patient | Optimistic UI + sync queue |
| Display updates | Background sync |

### Conflict Resolution

```typescript
// Last-write-wins with timestamp
const resolveConflict = (local: Ticket, server: Ticket): Ticket => {
  if (local.updatedAt > server.updatedAt) {
    return { ...local, conflictResolved: true };
  }
  return { ...server, conflictResolved: true, localVersion: local };
};
```

---

## Notification Flow

### Flow Types

| Channel | Trigger | Content |
|---------|---------|---------|
| SMS | Ticket created | Ticket number, position |
| SMS | Patient called | Room, proceed now |
| WhatsApp | Status query | Current position |
| WhatsApp | Patient called | Full announcement |
| Push | Position change | Queue updated |
| Email | Daily report | Summary stats |

### Notification Service

**File:** `apps/api/src/services/notification.ts:23`

```typescript
interface NotificationPayload {
  type: 'SMS' | 'WHATSAPP' | 'PUSH' | 'EMAIL';
  recipient: string;
  template: string;
  data: Record<string, string>;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
}

// Queue notifications for delivery
await NotificationService.queue({
  type: 'SMS',
  recipient: '+254700123456',
  template: 'TICKET_CALLED',
  data: { room: 'R201', ticket: 'MED/R201/001' },
  priority: 'HIGH',
});
```

---

## Error Handling

### Retry Strategy

| Retry | Delay | Max Attempts |
|-------|-------|--------------|
| 1 | 1 second | 3 |
| 2 | 5 seconds | 3 |
| 3 | 30 seconds | 3 |

### Dead Letter Queue

Failed notifications are stored in `failed_notifications` table for manual review.

---

## Related Documents

| Document | Path |
|----------|------|
| System Architecture | [../system-design/ARCHITECTURE.md](../system-design/ARCHITECTURE.md) |
| Components | [../component-models/COMPONENTS.md](../component-models/COMPONENTS.md) |
| Security | [../security-architecture/SECURITY.md](../security-architecture/SECURITY.md) |
| API Reference | [../../04-API/MASTER.md](../../04-API/MASTER.md) |
| Queue Engine | [../../03-Queue-Engine/MASTER.md](../../03-Queue-Engine/MASTER.md) |

---

*Last updated: March 20, 2026*
