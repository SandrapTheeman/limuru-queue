# Ticket Generation System

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Description:** Complete documentation of the ticket generation system

---

## Table of Contents

1. [Overview](#overview)
2. [Ticket Format](#ticket-format)
3. [Department Codes](#department-codes)
4. [Ticket Lifecycle](#ticket-lifecycle)
5. [Generation Process](#generation-process)
6. [Anti-Fraud Measures](#anti-fraud-measures)
7. [Reprint and Void](#reprint-and-void)
8. [HMS Integration](#hms-integration)
9. [API Reference](#api-reference)

---

## Overview

The Ticket Generation System is responsible for creating unique, trackable tickets for patients joining the queue. Each ticket contains encoded information about the department, room assignment, and sequence number.

### Ticket Characteristics

| Characteristic | Value |
|----------------|-------|
| Format | `{DEPT}/{ROOM}/{SEQ}` |
| Length | 12-15 characters |
| Uniqueness | Per department per day |
| Lifetime | 8 hours (resets daily) |
| Printable | Yes (thermal printer support) |

---

## Ticket Format

### Standard Format

```
{DEPT}/{ROOM}/{SEQ}
```

**Example:** `MED/R201/001`

| Component | Description | Format | Example |
|-----------|-------------|--------|---------|
| DEPT | Department code | 3 letters | MED |
| ROOM | Room number | R### or R--- | R201 or R--- |
| SEQ | Daily sequence | 001-999 | 001 |

### Format Breakdown

```
MED / R201 / 001
  |     |      |
  |     |      +-- Sequence number (resets at midnight)
  |     +--------- Room number (assigned when called, R--- = pending)
  +--------------- Department code (MED = Medical)
```

### Special Formats

| State | Format | Example |
|-------|--------|---------|
| Pending room | `{DEPT}/R---/{SEQ}` | `MED/R---/001` |
| Overflow | `{DEPT}/OVF/{SEQ}` | `MED/OVF/001` |
| Transfer | `{DEPT}/{ROOM}/T{SEQ}` | `MED/R201/T001` |

---

## Department Codes

### Primary Departments

| Code | Full Name | Description |
|------|-----------|-------------|
| MED | Medical | General medicine consultations |
| PED | Pediatric | Children and adolescent care |
| EMR | Emergency | Emergency room |
| GYN | Gynecology | Women's health |
| ORT | Orthopedic | Bone and joint care |
| DEN | Dental | Dental services |
| CAR | Cardiology | Heart and cardiovascular |
| PHY | Physiotherapy | Physical therapy |
| SUR | Surgical | Surgical consultations |
| URG | Urgent | Urgent care walk-ins |

### Support Departments

| Code | Full Name | Description |
|------|-----------|-------------|
| LAB | Laboratory | Blood tests, diagnostics |
| RAD | Radiology | X-rays, ultrasound |
| PHM | Pharmacy | Prescription fulfillment |
| OPH | Ophthalmology | Eye care |
| PSY | Psychiatry | Mental health |
| ENT | ENT | Ear, nose, throat |

### Department Configuration

```typescript
// apps/api/src/services/constants.ts
export const DEPARTMENTS = {
  MED: { name: 'Medical', color: '#3B82F6', icon: 'stethoscope' },
  PED: { name: 'Pediatric', color: '#10B981', icon: 'baby' },
  EMR: { name: 'Emergency', color: '#EF4444', icon: 'alert' },
  // ...
} as const;
```

---

## Ticket Lifecycle

### State Diagram

```
                    +-----------+
                    | GENERATED |
                    +-----+-----+
                          |
                          v
                    +-----------+
                    |  WAITING  |<------------------+
                    +-----+-----+                   |
                          |                         |
          +---------------+---------------+         |
          |               |               |         |
          v               v               v         |
    +-----------+   +-----------+   +-----------+  |
    | CALLED    |   | TRANSFER  |   |  EXPIRED  |  |
    +-----+-----+   +-----------+   +-----------+  |
          |                                       |
          v                                       |
    +-----------+                                 |
    | SERVING   |                                 |
    +-----+-----+                                 |
          |                                       |
          +---------------+-----------------------+
                          |
                          v
                    +-----------+
                    | COMPLETED |
                    +-----------+

    CANCELLED from any state (except COMPLETED)
```

### State Definitions

| State | Description | Duration |
|-------|-------------|----------|
| GENERATED | Ticket created, not yet in queue | < 1 second |
| WAITING | In queue, waiting to be called | Variable |
| CALLED | Patient called, awaiting response | 5 min default |
| SERVING | Patient is being served | Variable |
| COMPLETED | Service finished | Terminal |
| CANCELLED | Patient left or ticket voided | Terminal |
| EXPIRED | Ticket expired (8 hours) | Terminal |
| TRANSFERRED | Moved to another department | Terminal |

---

## Generation Process

### Step-by-Step Flow

**File:** `apps/api/src/services/ticket.ts:34`

```typescript
async function generateTicket(params: {
  patientId: string;
  departmentCode: string;
  priority: Priority;
  notes?: string;
  hmsVisitId?: string;
}): Promise<Ticket> {
  // Step 1: Validate department exists
  const department = await getDepartment(params.departmentCode);
  if (!department) {
    throw new ValidationError('Invalid department code');
  }

  // Step 2: Get next sequence number
  const sequence = await getNextSequence(params.departmentCode);

  // Step 3: Format ticket number
  const ticketNumber = formatTicketNumber(
    params.departmentCode,
    sequence
  );

  // Step 4: Create ticket record
  const ticket = await db.transaction(async (tx) => {
    // Insert ticket
    const [newTicket] = await tx.insert(tickets).values({
      id: generateUUID(),
      number: ticketNumber,
      sequence,
      patientId: params.patientId,
      departmentCode: params.departmentCode,
      priority: params.priority,
      status: 'generated',
      hmsVisitId: params.hmsVisitId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
    });

    // Add to queue
    await tx.insert(queueEntries).values({
      id: generateUUID(),
      ticketId: newTicket.id,
      departmentCode: params.departmentCode,
      score: calculateScore(params.priority, 0),
      enqueuedAt: new Date(),
    });

    // Create audit log
    await tx.insert(auditLog).values({
      id: generateUUID(),
      userId: params.patientId,
      action: 'TICKET_CREATED',
      entityType: 'ticket',
      entityId: newTicket.id,
      metadata: { ticketNumber, departmentCode, priority },
    });

    return newTicket;
  });

  // Step 5: Broadcast queue update
  await broadcastQueueUpdate(params.departmentCode);

  // Step 6: Send notification (optional)
  if (patient.phone) {
    await NotificationService.sendTicketCreated(ticket, patient);
  }

  return ticket;
}
```

### Ticket Number Formatting

```typescript
// apps/api/src/services/ticket.ts:12
function formatTicketNumber(
  departmentCode: string,
  sequence: number
): string {
  // Format: DEPT/R---/SEQ
  const dept = departmentCode.toUpperCase();
  const seq = sequence.toString().padStart(3, '0');
  return `${dept}/R---/${seq}`;
}

function formatTicketNumberWithRoom(
  departmentCode: string,
  roomNumber: string,
  sequence: number
): string {
  // Format: DEPT/ROOM/SEQ
  const dept = departmentCode.toUpperCase();
  const room = roomNumber.startsWith('R') ? roomNumber : `R${roomNumber}`;
  const seq = sequence.toString().padStart(3, '0');
  return `${dept}/${room}/${seq}`;
}
```

### Sequence Management

```typescript
// apps/api/src/services/ticket.ts:56
async function getNextSequence(departmentCode: string): Promise<number> {
  // Get max sequence for today
  const today = startOfDay(new Date());
  
  const result = await db
    .select({ maxSeq: sql`MAX(sequence)` })
    .from(tickets)
    .where(
      and(
        eq(tickets.departmentCode, departmentCode),
        gte(tickets.createdAt, today)
      )
    );

  const lastSeq = result[0]?.maxSeq ?? 0;
  return lastSeq + 1;
}
```

---

## Anti-Fraud Measures

### Validation Rules

| Rule | Implementation |
|------|----------------|
| One ticket per patient per department per day | Unique constraint on (patient_id, department_code, date) |
| Ticket expiry | 8-hour validity check |
| Ticket status | Cannot reuse completed/cancelled tickets |
| Sequence integrity | Atomic increment, no gaps |
| Department limits | Max queue size per department (configurable) |

### Fraud Detection

```typescript
// apps/api/src/services/ticket.ts:89
async function validateTicketCreation(
  patientId: string,
  departmentCode: string
): Promise<ValidationResult> {
  // Check for existing active ticket
  const existing = await db
    .select()
    .from(tickets)
    .where(
      and(
        eq(tickets.patientId, patientId),
        eq(tickets.departmentCode, departmentCode),
        inArray(tickets.status, ['generated', 'waiting', 'called', 'serving'])
      )
    );

  if (existing.length > 0) {
    return {
      valid: false,
      error: 'DUPLICATE_TICKET',
      existingTicket: existing[0],
    };
  }

  // Check queue capacity
  const queueSize = await getQueueSize(departmentCode);
  const maxCapacity = await getDepartmentCapacity(departmentCode);

  if (queueSize >= maxCapacity) {
    return {
      valid: false,
      error: 'QUEUE_FULL',
      queueSize,
      maxCapacity,
    };
  }

  return { valid: true };
}
```

### Ticket Validation on Check-in

```typescript
// apps/api/src/services/ticket.ts:112
async function validateTicket(ticketId: string): Promise<ValidationResult> {
  const ticket = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .leftJoin(patients, eq(tickets.patientId, patients.id))
    .get();

  if (!ticket) {
    return { valid: false, error: 'NOT_FOUND' };
  }

  // Check expiry
  if (new Date() > ticket.expiresAt) {
    return { valid: false, error: 'EXPIRED' };
  }

  // Check status
  if (!['called', 'waiting'].includes(ticket.status)) {
    return { valid: false, error: 'INVALID_STATUS' };
  }

  return { valid: true, ticket };
}
```

---

## Reprint and Void

### Reprint Ticket

```typescript
// apps/api/src/services/ticket.ts:145
async function reprintTicket(ticketId: string): Promise<TicketPrint> {
  const ticket = await getTicket(ticketId);

  // Check reprint limit
  const reprintCount = await getReprintCount(ticketId);
  if (reprintCount >= MAX_REPRINTS) {
    throw new ValidationError('Maximum reprints exceeded');
  }

  // Log reprint
  await db.insert(ticketReprints).values({
    ticketId,
    reprintedAt: new Date(),
    reason: 'REPRINT',
  });

  // Return print data
  return {
    ticketNumber: ticket.number,
    patientName: maskPatientName(ticket.patient.name),
    department: ticket.department.name,
    priority: ticket.priority,
    createdAt: ticket.createdAt,
    reprintCount: reprintCount + 1,
    barcode: generateBarcode(ticket.id),
  };
}
```

### Void Ticket

```typescript
// apps/api/src/services/ticket.ts:167
async function voidTicket(
  ticketId: string,
  reason: string,
  userId: string
): Promise<void> {
  const ticket = await getTicket(ticketId);

  if (ticket.status === 'completed') {
    throw new ValidationError('Cannot void completed ticket');
  }

  await db.transaction(async (tx) => {
    // Update ticket status
    await tx
      .update(tickets)
      .set({ status: 'cancelled', voidedAt: new Date(), voidReason: reason })
      .where(eq(tickets.id, ticketId));

    // Remove from queue
    await tx
      .delete(queueEntries)
      .where(eq(queueEntries.ticketId, ticketId));

    // Log void action
    await tx.insert(auditLog).values({
      id: generateUUID(),
      userId,
      action: 'TICKET_VOIDED',
      entityType: 'ticket',
      entityId: ticketId,
      metadata: { reason, previousStatus: ticket.status },
    });
  });

  // Broadcast update
  await broadcastQueueUpdate(ticket.departmentCode);
}
```

---

## HMS Integration

### Automatic Ticket Creation

When HMS sends patient admission webhook:

```typescript
// apps/api/src/services/hms.ts:34
async function handlePatientAdmitted(hmsData: HmsAdmission): Promise<void> {
  // Sync patient if not exists
  const patient = await PatientService.syncFromHms(hmsData.patient);

  // Check if auto-queue is enabled
  if (!settings.autoQueueEnabled) {
    return;
  }

  // Create ticket
  const ticket = await TicketService.generate({
    patientId: patient.id,
    departmentCode: hmsData.departmentCode,
    priority: mapHmsPriority(hmsData.priority),
    hmsVisitId: hmsData.visitId,
    notes: `HMS Visit: ${hmsData.visitId}`,
  });

  // Send confirmation to HMS
  await hmsClient.sendTicketCreated({
    visitId: hmsData.visitId,
    ticketId: ticket.id,
    ticketNumber: ticket.number,
    position: await QueueService.getPosition(ticket.id),
  });
}
```

### Visit Completion Sync

```typescript
// apps/api/src/services/hms.ts:67
async function handleVisitCompleted(
  hmsData: HmsVisitCompleted
): Promise<void> {
  // Find ticket by HMS visit ID
  const ticket = await db
    .select()
    .from(tickets)
    .where(eq(tickets.hmsVisitId, hmsData.visitId))
    .get();

  if (ticket) {
    await TicketService.complete(ticket.id, {
      completedAt: new Date(hmsData.completedAt),
      notes: hmsData.notes,
    });
  }
}
```

---

## API Reference

### Create Ticket

```http
POST /api/v1/tickets
Content-Type: application/json
Authorization: Bearer {token}

{
  "patientId": "pat_123",
  "departmentCode": "MED",
  "priority": "normal",
  "notes": "Follow-up visit"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "TKT-001-MED-20260320",
    "number": "MED/R---/001",
    "status": "waiting",
    "position": 1,
    "estimatedWait": "15 minutes",
    "createdAt": "2026-03-20T10:00:00.000Z",
    "expiresAt": "2026-03-20T18:00:00.000Z"
  }
}
```

### Get Ticket

```http
GET /api/v1/tickets/{id}
Authorization: Bearer {token}
```

### Void Ticket

```http
POST /api/v1/tickets/{id}/void
Content-Type: application/json
Authorization: Bearer {token}

{
  "reason": "Patient left without being served"
}
```

---

## Related Documents

| Document | Path |
|----------|------|
| Priority Algorithm | [../priority-queue/PRIORITY-ALGORITHM.md](../priority-queue/PRIORITY-ALGORITHM.md) |
| Call System | [../call-system/CALL-SYSTEM.md](../call-system/CALL-SYSTEM.md) |
| API Reference | [../../04-API/MASTER.md](../../04-API/MASTER.md) |
| Database | [../../05-Database/MASTER.md](../../05-Database/MASTER.md) |

---

*Last updated: March 20, 2026*
