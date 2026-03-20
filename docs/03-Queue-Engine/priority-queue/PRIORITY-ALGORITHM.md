# Priority Queue Algorithm

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Description:** Complete documentation of the priority queue algorithm with aging support

---

## Table of Contents

1. [Overview](#overview)
2. [Priority Levels](#priority-levels)
3. [Score Calculation](#score-calculation)
4. [Aging Algorithm](#aging-algorithm)
5. [Queue Implementation](#queue-implementation)
6. [Override Mechanism](#override-mechanism)
7. [VIP Handling](#vip-handling)
8. [Overflow Management](#overflow-management)
9. [Wait Time Estimation](#wait-time-estimation)

---

## Overview

The Priority Queue Algorithm ensures patients are called in the correct order based on their medical priority and waiting time. This prevents lower-priority patients from being repeatedly skipped and ensures fair access to care.

### Design Goals

| Goal | Implementation |
|------|----------------|
| Fairness | Priority-based with aging |
| Responsiveness | Emergency cases jump queue |
| Predictability | Clear scoring formula |
| Transparency | Patients understand their position |

### Algorithm Overview

```
score = priority_weight * base_priority + wait_time_boost

Lower score = Higher priority (called first)
```

---

## Priority Levels

### Priority Definitions

| Level | Name | Base Weight | Description | Examples |
|-------|------|-------------|-------------|----------|
| 1 | Emergency | 100 | Life-threatening | Chest pain, difficulty breathing |
| 2 | Urgent | 200 | Needs attention soon | High fever, severe pain |
| 3 | Normal | 300 | Regular appointments | Checkups, follow-ups |
| 4 | Low | 400 | Non-urgent | Prescription refills |

### Priority Codes

```typescript
// apps/api/src/services/queue.ts:12
export const PRIORITIES = {
  emergency: {
    code: 1,
    name: 'Emergency',
    weight: 100,
    color: '#EF4444', // Red
    label: 'Emergency',
  },
  urgent: {
    code: 2,
    name: 'Urgent',
    weight: 200,
    color: '#F59E0B', // Orange
    label: 'Urgent',
  },
  normal: {
    code: 3,
    name: 'Normal',
    weight: 300,
    color: '#10B981', // Green
    label: 'Normal',
  },
  low: {
    code: 4,
    name: 'Low',
    weight: 400,
    color: '#6B7280', // Gray
    label: 'Low',
  },
} as const;

export type Priority = keyof typeof PRIORITIES;
```

### Priority Assignment

```typescript
// apps/api/src/services/queue.ts:34
function assignPriority(params: {
  patientType: 'emergency' | 'urgent' | 'regular' | 'followup';
  hmsPriority?: number;
  override?: boolean;
}): Priority {
  // HMS priority mapping (1 = highest)
  if (params.hmsPriority !== undefined) {
    const hmsMap = { 1: 'emergency', 2: 'urgent', 3: 'normal', 4: 'low' };
    return hmsMap[params.hmsPriority] as Priority;
  }

  // Standard patient type mapping
  const typeMap = {
    emergency: 'emergency',
    urgent: 'urgent',
    regular: 'normal',
    followup: 'low',
  };

  return typeMap[params.patientType] as Priority;
}
```

---

## Score Calculation

### Formula

```
score = priority_weight + wait_time_boost

where:
- priority_weight = 100 * base_priority (1=Emergency, 2=Urgent, etc.)
- wait_time_boost = floor(waiting_minutes / 10)
```

### Score Examples

| Patient | Priority | Wait Time | Priority Weight | Wait Boost | Final Score |
|---------|----------|-----------|-----------------|------------|-------------|
| A | Emergency | 5 min | 100 | 0 | **100** |
| B | Normal | 0 min | 300 | 0 | **300** |
| C | Normal | 15 min | 300 | 1 | **301** |
| D | Normal | 45 min | 300 | 4 | **304** |
| E | Urgent | 20 min | 200 | 2 | **202** |
| F | Low | 60 min | 400 | 6 | **406** |

### Call Order (by score)

1. **A** (100) - Emergency
2. **E** (202) - Urgent waiting 20 min
3. **B** (300) - Normal waiting 0 min
4. **C** (301) - Normal waiting 15 min
5. **D** (304) - Normal waiting 45 min
6. **F** (406) - Low waiting 60 min

### Implementation

```typescript
// apps/api/src/services/priority.ts:12
export interface QueueEntry {
  ticketId: string;
  priority: Priority;
  waitingMinutes: number;
  score: number;
  enqueuedAt: Date;
}

export function calculateScore(priority: Priority, waitingMinutes: number): number {
  const priorityWeights = {
    emergency: 100,
    urgent: 200,
    normal: 300,
    low: 400,
  };

  const priorityWeight = priorityWeights[priority];
  const waitTimeBoost = Math.floor(waitingMinutes / 10);

  return priorityWeight + waitTimeBoost;
}

export function calculateWaitingMinutes(enqueuedAt: Date): number {
  const now = Date.now();
  const enqueued = enqueuedAt.getTime();
  return Math.floor((now - enqueued) / (1000 * 60));
}

export function recalculateScore(entry: QueueEntry): number {
  const waitingMinutes = calculateWaitingMinutes(entry.enqueuedAt);
  return calculateScore(entry.priority, waitingMinutes);
}
```

---

## Aging Algorithm

### Purpose

The aging algorithm ensures that patients don't wait indefinitely. Over time, lower-priority patients gain priority points until they can be served.

### Aging Schedule

| Wait Time | Boost Added | Normal Score | Position Change |
|-----------|-------------|--------------|-----------------|
| 0 min | +0 | 300 | - |
| 10 min | +1 | 301 | - |
| 20 min | +2 | 302 | - |
| 30 min | +3 | 303 | Overtakes newer normals |
| 40 min | +4 | 304 | Overtakes newer normals |
| 50 min | +5 | 305 | Overtakes newer normals |
| 60 min | +6 | 306 | Overtakes normal waiting 30 min |
| 90 min | +9 | 309 | Overtakes normal waiting 60 min |
| 120 min | +12 | 312 | Very high priority |

### Age-On Algorithm

```typescript
// apps/api/src/services/queue.ts:67
class PriorityQueue {
  private entries: Map<string, QueueEntry> = new Map();
  private heap: string[] = []; // Min-heap of ticket IDs by score

  // Add entry to queue
  enqueue(entry: QueueEntry): void {
    const score = calculateScore(entry.priority, 0);
    const entryWithScore = { ...entry, score, enqueuedAt: new Date() };
    
    this.entries.set(entry.ticketId, entryWithScore);
    this.heapPush(entry.ticketId);
  }

  // Get next patient (lowest score)
  dequeue(): QueueEntry | null {
    if (this.heap.length === 0) return null;
    
    const ticketId = this.heapPop();
    return this.entries.get(ticketId) ?? null;
  }

  // Peek at next patient without removing
  peek(): QueueEntry | null {
    if (this.heap.length === 0) return null;
    const ticketId = this.heap[0];
    return this.entries.get(ticketId) ?? null;
  }

  // Recalculate scores (aging pass)
  recalculateAges(): void {
    const now = Date.now();
    
    for (const [ticketId, entry] of this.entries) {
      const waitingMinutes = Math.floor((now - entry.enqueuedAt.getTime()) / 60000);
      const newScore = calculateScore(entry.priority, waitingMinutes);
      
      if (newScore !== entry.score) {
        entry.score = newScore;
        entry.waitingMinutes = waitingMinutes;
        this.rebalance(ticketId);
      }
    }
  }

  // Reorder heap after score change
  private rebalance(ticketId: string): void {
    // Remove and re-add to correct position
    this.heap = this.heap.filter(id => id !== ticketId);
    this.heapPush(ticketId);
  }
}
```

### Aging Implementation

```typescript
// apps/api/src/services/queue.ts:89
// Scheduled task runs every 30 seconds
async function performAgingUpdate(): Promise<void> {
  const departments = await getActiveDepartments();
  
  for (const dept of departments) {
    const queue = await loadQueue(dept.code);
    queue.recalculateAges();
    await saveQueue(dept.code, queue);
    await broadcastQueueUpdate(dept.code);
  }
}

// Cron: Every 30 seconds
export const agingScheduler = {
  async scheduled(controller: ScheduledController) {
    await performAgingUpdate();
  }
};
```

---

## Queue Implementation

### Min-Heap Structure

```
Priority Queue (Min-Heap by score):

                    [100]
                   /     \
                [202]    [300]
               /    \    /    \
            [301] [304] [303] [400]
             |
            [309]  <- After 90 min wait, 309 < 300, so rebalances
```

### Database Schema

```sql
CREATE TABLE queue_entries (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  department_code TEXT NOT NULL,
  score INTEGER NOT NULL,
  enqueued_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  status TEXT DEFAULT 'waiting',
  FOREIGN KEY (department_code) REFERENCES departments(code)
);

CREATE INDEX idx_queue_department_score ON queue_entries(department_code, score);
CREATE INDEX idx_queue_status ON queue_entries(status);
```

### Query: Get Next in Queue

```sql
SELECT 
  qe.*,
  t.number as ticket_number,
  p.name as patient_name,
  p.phone as patient_phone
FROM queue_entries qe
JOIN tickets t ON qe.ticket_id = t.id
JOIN patients p ON t.patient_id = p.id
WHERE qe.department_code = ?
  AND qe.status = 'waiting'
ORDER BY qe.score ASC, qe.enqueued_at ASC
LIMIT 1;
```

### Implementation

```typescript
// apps/api/src/services/queue.ts:123
export async function getNextInQueue(
  departmentCode: string
): Promise<QueueEntry | null> {
  // First, perform aging update for this department
  await recalculateScores(departmentCode);

  // Query next entry
  const result = await db
    .select({
      entry: queueEntries,
      ticket: tickets,
      patient: patients,
    })
    .from(queueEntries)
    .innerJoin(tickets, eq(queueEntries.ticketId, tickets.id))
    .innerJoin(patients, eq(tickets.patientId, patients.id))
    .where(
      and(
        eq(queueEntries.departmentCode, departmentCode),
        eq(queueEntries.status, 'waiting')
      )
    )
    .orderBy(queueEntries.score, queueEntries.enqueuedAt)
    .limit(1);

  return result[0] ?? null;
}
```

---

## Override Mechanism

### Staff Override

Staff can call any patient regardless of queue order.

```typescript
// apps/api/src/services/queue.ts:156
export async function callPatientManual(
  ticketId: string,
  roomNumber: string,
  calledBy: string
): Promise<CallResult> {
  // Get ticket
  const ticket = await getTicket(ticketId);
  
  // Validate user has permission
  const user = await getUser(calledBy);
  if (!canCallInDepartment(user, ticket.departmentCode)) {
    throw new ForbiddenError('Cannot call in this department');
  }

  // Call patient (bypass priority)
  return await callPatient(ticketId, roomNumber, calledBy, 'manual');
}

export async function callPatient(
  ticketId: string,
  roomNumber: string,
  calledBy: string,
  callType: 'manual' | 'auto' | 'recall'
): Promise<CallResult> {
  // Update ticket status
  await db.transaction(async (tx) => {
    await tx
      .update(tickets)
      .set({ 
        status: 'called', 
        roomNumber,
        calledAt: new Date(),
        calledBy,
      })
      .where(eq(tickets.id, ticketId));

    await tx
      .update(queueEntries)
      .set({ 
        status: 'called',
        roomNumber,
        calledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(queueEntries.ticketId, ticketId));

    await tx.insert(queueEvents).values({
      id: generateUUID(),
      ticketId,
      eventType: 'called',
      callType,
      roomNumber,
      calledBy,
      calledAt: new Date(),
    });
  });

  // Broadcast update
  await broadcastPatientCalled(ticketId);

  // Trigger audio announcement
  await triggerAnnouncement(ticketId);

  return { success: true, ticketId, roomNumber, callType };
}
```

---

## VIP Handling

### VIP Patients

VIP patients can be configured to have modified priority rules.

```typescript
// apps/api/src/services/priority.ts:78
export interface VipConfig {
  enabled: boolean;
  minScore: number;        // Minimum score for VIP (e.g., 250)
  maxWaitingMinutes: number; // Auto-escalate if exceeded
  autoUpgradeMinutes: number; // Minutes before auto-upgrade
}

const VIP_CONFIG: VipConfig = {
  enabled: true,
  minScore: 250,
  maxWaitingMinutes: 60,
  autoUpgradeMinutes: 45,
};

export function calculateVipScore(priority: Priority, waitingMinutes: number): number {
  const baseScore = calculateScore(priority, waitingMinutes);
  
  // VIP patients have bonus (lower score = better)
  // But only if they're not emergency
  if (priority === 'emergency') {
    return baseScore; // No bonus for emergencies
  }
  
  // VIP bonus: -50 points (50 min head start)
  return Math.max(VIP_CONFIG.minScore, baseScore - 50);
}
```

---

## Overflow Management

### Department Capacity

Each department has a maximum queue capacity.

```typescript
// apps/api/src/services/queue.ts:189
export interface DepartmentConfig {
  code: string;
  name: string;
  maxCapacity: number;
  overflowDepartment?: string;
  autoOverflow: boolean;
}

const DEPARTMENT_CONFIGS: Record<string, DepartmentConfig> = {
  MED: { code: 'MED', name: 'Medical', maxCapacity: 50, autoOverflow: false },
  LAB: { code: 'LAB', name: 'Laboratory', maxCapacity: 100, autoOverflow: true, overflowDepartment: 'URG' },
  RAD: { code: 'RAD', name: 'Radiology', maxCapacity: 30, autoOverflow: true, overflowDepartment: 'URG' },
};

export async function handleOverflow(
  ticketId: string,
  departmentCode: string
): Promise<OverflowResult> {
  const config = DEPARTMENT_CONFIGS[departmentCode];
  
  if (!config || !config.autoOverflow || !config.overflowDepartment) {
    return { overflow: false };
  }

  const currentSize = await getQueueSize(departmentCode);
  
  if (currentSize < config.maxCapacity) {
    return { overflow: false };
  }

  // Transfer to overflow department
  await transferTicket(ticketId, departmentCode, config.overflowDepartment, 'OVERFLOW');
  
  return {
    overflow: true,
    fromDepartment: departmentCode,
    toDepartment: config.overflowDepartment,
    reason: 'QUEUE_FULL',
  };
}
```

---

## Wait Time Estimation

### Algorithm

```typescript
// apps/api/src/services/queue.ts:223
export async function estimateWaitTime(
  ticketId: string,
  departmentCode: string
): Promise<WaitTimeEstimate> {
  // Get position
  const position = await getQueuePosition(ticketId, departmentCode);
  
  // Get average service time for this department
  const avgServiceTime = await getAverageServiceTime(departmentCode);
  
  // Get current queue load
  const queueSize = await getQueueSize(departmentCode);
  
  // Get counts by priority
  const priorityCounts = await getPriorityCounts(departmentCode);
  
  // Calculate weighted position
  // Emergency and urgent patients are served first, reducing wait
  const priorityWeight = {
    emergency: 0.2,  // 20% of queue time
    urgent: 0.4,    // 40% of queue time
    normal: 0.8,    // 80% of queue time
    low: 1.0,       // 100% of queue time
  };
  
  const weightedPosition = priorityWeight[priority] * position;
  const estimatedMinutes = Math.ceil(weightedPosition * (avgServiceTime / 10));
  
  return {
    position,
    estimatedMinutes,
    averageServiceMinutes: avgServiceTime,
    queueSize,
    confidence: calculateConfidence(queueSize, avgServiceTime),
  };
}

function calculateConfidence(queueSize: number, avgServiceTime: number): 'high' | 'medium' | 'low' {
  // More data = higher confidence
  if (queueSize > 10 && avgServiceTime > 5) return 'high';
  if (queueSize > 5) return 'medium';
  return 'low';
}
```

---

## Related Documents

| Document | Path |
|----------|------|
| Ticket Generation | [../ticket-system/TICKET-GENERATION.md](../ticket-system/TICKET-GENERATION.md) |
| Call System | [../call-system/CALL-SYSTEM.md](../call-system/CALL-SYSTEM.md) |
| Queue Engine Overview | [../MASTER.md](../MASTER.md) |
| API Reference | [../../04-API/MASTER.md](../../04-API/MASTER.md) |

---

*Last updated: March 20, 2026*
