# Queue Engine - Master Index

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Category:** Queue Engine  
**Description:** Complete queue engine documentation - the heart of the Limuru Queue System

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Ticket System](#ticket-system)
4. [Priority Queue Algorithm](#priority-queue-algorithm)
5. [Call System](#call-system)
6. [TV Display](#tv-display)
7. [Audio Announcements](#audio-announcements)
8. [Real-time Updates](#real-time-updates)
9. [Statistics & Analytics](#statistics--analytics)

---

## Overview

The Queue Engine is the core component of the Limuru Cottage Hospital Queue Management System. It handles all queue-related operations including ticket generation, priority-based ordering, patient calling, and real-time updates.

### Key Responsibilities

| Responsibility | Description |
|---------------|-------------|
| Ticket Generation | Create unique ticket numbers |
| Queue Management | Maintain priority queue |
| Call Management | Patient calling and recall |
| Position Calculation | Real-time queue position |
| Wait Time Estimation | Accurate wait time calculation |

---

## Architecture

### Queue Engine Architecture

```
+------------------------------------------------------------------+
|                       QUEUE ENGINE                                |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+      +------------------+                   |
|  |  Ticket Service  |      | Priority Service |                   |
|  +--------+---------+      +--------+---------+                   |
|           |                         |                             |
|           v                         v                             |
|  +------------------+      +------------------+                   |
|  |   Queue Store     |      |   Queue State    |                   |
|  |   (Min-Heap)      |      |   (State Machine)|                   |
|  +--------+---------+      +--------+---------+                   |
|           |                         |                             |
|           +-------------+-----------+                             |
|                         |                                         |
|                         v                                         |
|  +------------------+ +------+ +------------------+                |
|  |  Call Service    | | WebSocket Hub |                    |
|  +------------------+ +------+ +------------------+                |
|                                                                   |
+------------------------------------------------------------------+
```

### Components

| Component | File | Responsibility |
|-----------|------|----------------|
| Ticket Service | `ticket-system/TICKET-GENERATION.md` | Ticket creation, formatting |
| Priority Service | `priority-queue/PRIORITY-ALGORITHM.md` | Score calculation, aging |
| Queue Store | `services/queue.ts` | Min-heap implementation |
| Call Service | `call-system/CALL-SYSTEM.md` | Patient calling logic |
| TV Display | `tv-display/TV-DISPLAY.md` | Display management |
| Audio Service | `announcements/AUDIO.md` | TTS announcements |

---

## Ticket System

### Ticket Generation

**File:** [ticket-system/TICKET-GENERATION.md](./ticket-system/TICKET-GENERATION.md)

#### Ticket Format

```
{DEPT}/{ROOM}/{SEQ}
```

| Component | Description | Example |
|-----------|-------------|---------|
| DEPT | 3-letter department code | MED, PED, EMR |
| ROOM | Room number (assigned on call) | R201, R--- (pending) |
| SEQ | Daily sequence number | 001, 002, ... |

**Example:** `MED/R201/001`
- Department: Medical (MED)
- Room: Room 201 (R201)
- Sequence: 001 (first ticket of day)

#### Department Codes

| Code | Department |
|------|------------|
| MED | Medical |
| PED | Pediatric |
| EMR | Emergency |
| GYN | Gynecology |
| ORT | Orthopedic |
| DEN | Dental |
| CAR | Cardiology |
| PHY | Physiotherapy |
| SUR | Surgical |
| URG | Urgent Care |
| LAB | Laboratory |
| RAD | Radiology |
| PHM | Pharmacy |

#### Ticket Lifecycle

```
[GENERATED] --> [WAITING] --> [CALLED] --> [SERVING] --> [COMPLETED]
     |             |             |            |              |
     v             v             v            v              v
[EXPIRED]    [TRANSFER]    [RECALLED]   [TRANSFERRED]   [CANCELLED]
```

---

## Priority Queue Algorithm

### Priority-Based Queue Management

**File:** [priority-queue/PRIORITY-ALGORITHM.md](./priority-queue/PRIORITY-ALGORITHM.md)

#### Priority Levels

| Level | Name | Weight | Use Case |
|-------|------|--------|----------|
| 1 | Emergency | 100 | Life-threatening conditions |
| 2 | Urgent | 200 | Needs attention soon |
| 3 | Normal | 300 | Regular appointments |
| 4 | Low | 400 | Non-urgent follow-ups |

#### Score Calculation

```
score = priority_weight + wait_time_boost

where:
- priority_weight = 100 * base_priority (1=Emergency, 2=Urgent, etc.)
- wait_time_boost = floor(waiting_minutes / 10)
```

**Examples:**
- Emergency waiting 5 min: `100 + 0 = 100`
- Normal waiting 45 min: `300 + 4 = 304`
- (Normal patient overtakes newer patients after 30 min)

#### Aging Algorithm

Priority score increases over time, ensuring patients don't wait indefinitely.

| Wait Time | Boost Added | Emergency Score | Normal Score |
|-----------|-------------|-----------------|--------------|
| 0 min | +0 | 100 | 300 |
| 10 min | +1 | 101 | 301 |
| 20 min | +2 | 102 | 302 |
| 30 min | +3 | 103 | 303 |
| 60 min | +6 | 106 | 306 |
| 90 min | +9 | 109 | 309 |

---

## Call System

### Patient Calling Mechanism

**File:** [call-system/CALL-SYSTEM.md](./call-system/CALL-SYSTEM.md)

#### Call Types

| Type | Description | Use Case |
|------|-------------|----------|
| Manual | Staff selects specific patient | Skip patient, VIP |
| Auto | System calls highest priority | Default workflow |
| Recall | Re-call patient who didn't respond | Patient was absent |
| Transfer | Move patient to another dept | Wrong department |

#### Call Flow

```
Staff Action --> API Validation --> Update State --> Broadcast --> TV/Audio
     |              |                  |              |            |
     v              v                  v              v            v
  Select      Check permissions    Save to D1    WebSocket    Play TTS
  patient     Validate state       Queue event   Event        announcement
```

#### Timeout Handling

- Default timeout: 5 minutes
- After timeout: Auto-complete or recall
- Recall: Re-add to queue front

---

## TV Display

### Display System

**File:** [tv-display/TV-DISPLAY.md](./tv-display/TV-DISPLAY.md)

#### Display Modes

| Mode | Description | Best For |
|------|-------------|----------|
| Single | One department full screen | Waiting areas |
| Multi | 2-4 departments split | Main lobby |
| Auto-Switch | Rotate departments | Large displays |
| IPTV PiP | Queue overlay on TV | Waiting rooms with TV |
| Kiosk | Touch-enabled display | Self-service |

#### Layout Structure

```
+------------------------------------------------------------------+
|  [Logo]         DEPARTMENT NAME         [Date] [Time] [Audio]    |
+------------------------------------------------------------------+
|                                                                   |
|                    +------------------------+                     |
|                    |                        |                     |
|                    |     NOW CALLING        |                     |
|                    |                        |                     |
|                    |     MED/R201/001       |                     |
|                    |                        |                     |
|                    |      John K.          |                     |
|                    |                        |                     |
|                    |     [ROOM 201]        |                     |
|                    |                        |                     |
|                    +------------------------+                     |
|                                                                   |
+------------------------------------------------------------------+
|  UP NEXT: 1. MED/R---/002 - Mary W.    | Wait: 15 min          |
|  ---------------------------------------------------------------- |
|  WAITING: 3 patients | Avg Wait: 12 min | Called Today: 45      |
+------------------------------------------------------------------+
```

---

## Audio Announcements

### Text-to-Speech Announcements

**File:** [announcements/AUDIO.md](./announcements/AUDIO.md)

#### Announcement Text Format

```
Patient {firstName} {lastInitial}, please proceed to room {roomNumber}
```

**Example:** "Patient John M, please proceed to room 201"

#### Languages

| Language | Code | Example |
|----------|------|---------|
| English | en | "Patient John M, please proceed to room 201" |
| Swahili | sw | "Mgonjwa John M, tafadhali nenda chumba 201" |

#### Audio Controls

- Volume: 0-100%
- Mute toggle
- Announcement queue (prevent overlap)
- Emergency override

---

## Real-time Updates

### WebSocket Architecture

```
+------------------------------------------------------------------+
|                     WebSocket Flow                                 |
+------------------------------------------------------------------+
|                                                                   |
|  +-----------+         +-----------+         +-----------+       |
|  | TV Display| <------ |  Durable  | ------->|  Mobile   |       |
|  |  Client   |         |  Object   |         |   App     |       |
|  +-----------+         +-----------+         +-----------+       |
|       ^                      |                      ^             |
|       |                      v                      |             |
|       |              +----------------+             |             |
|       +------------> |   Broadcast   | <----------+             |
|                        +----------------+                         |
|                                                                   |
+------------------------------------------------------------------+
```

### Events

| Event | Payload | Subscribers |
|-------|---------|-------------|
| PATIENT_CALLED | ticket, room, patient | Department TVs, staff |
| QUEUE_UPDATED | queue list, positions | All subscribers |
| EMERGENCY | message, priority | All displays |
| ANNOUNCEMENT | text, duration | All displays |

---

## Statistics & Analytics

### Queue Metrics

| Metric | Description | Calculation |
|--------|-------------|-------------|
| Current Wait | Average time waiting | avg(now - created_at) for waiting |
| Avg Service | Average service time | avg(completed_at - called_at) |
| Throughput | Patients served/hour | count(completed) / hours |
| Abandon Rate | Patients who left | count(cancelled) / count(total) |

### Dashboard Metrics

- Patients in queue
- Average wait time
- Patients served today
- Current position
- Estimated wait time

---

## Related Documents

| Document | Path | Description |
|----------|------|-------------|
| Ticket Generation | [ticket-system/TICKET-GENERATION.md](./ticket-system/TICKET-GENERATION.md) | Complete ticket documentation |
| Priority Algorithm | [priority-queue/PRIORITY-ALGORITHM.md](./priority-queue/PRIORITY-ALGORITHM.md) | Queue prioritization |
| Call System | [call-system/CALL-SYSTEM.md](./call-system/CALL-SYSTEM.md) | Patient calling |
| TV Display | [tv-display/TV-DISPLAY.md](./tv-display/TV-DISPLAY.md) | Display system |
| IPTV | [tv-display/IPTV.md](./tv-display/IPTV.md) | Television integration |
| Audio | [announcements/AUDIO.md](./announcements/AUDIO.md) | TTS announcements |
| API Reference | [../../04-API/MASTER.md](../../04-API/MASTER.md) | API endpoints |
| Database | [../../05-Database/MASTER.md](../../05-Database/MASTER.md) | Data storage |

---

*Last updated: March 20, 2026*
