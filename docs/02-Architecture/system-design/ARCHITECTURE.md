# Architecture - System Design

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Category:** Architecture  
**Description:** Complete system architecture documentation for the Limuru Queue Management System

---

## Table of Contents

1. [Overview](#overview)
2. [Executive Summary](#executive-summary)
3. [Business Context](#business-context)
4. [Non-Functional Requirements](#non-functional-requirements)
5. [Technology Stack](#technology-stack)
6. [Component Architecture](#component-architecture)
7. [Data Flow](#data-flow)
8. [Security Architecture](#security-architecture)
9. [Scalability Design](#scalability-design)
10. [Disaster Recovery](#disaster-recovery)

---

## Overview

This document provides comprehensive architecture documentation for the Limuru Cottage Hospital Queue Management System. It covers system design, component interactions, data flows, security considerations, and scalability strategies.

### Audience

- Software architects
- Senior developers
- DevOps engineers
- Technical stakeholders

---

## Executive Summary

The Limuru Cottage Hospital Queue Management System is a cloud-native, real-time queue management solution built on Cloudflare's edge computing platform. The system replaces manual paper-based queuing with a digital system that provides real-time updates to patients via TV displays, mobile notifications, and audio announcements.

### Key Architectural Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Cloudflare Workers | Edge computing, global distribution | Low latency, high availability |
| D1 (SQLite) | Edge database, zero cold starts | Fast reads, simple schema |
| Durable Objects | Real-time WebSocket, stateful edge | Real-time updates without polling |
| Next.js App Router | Server components, streaming | Fast initial load |
| React Native Expo | Cross-platform mobile | Single codebase, iOS + Android |

---

## Business Context

### Hospital Profile

- **Name:** Limuru Cottage Hospital
- **Location:** Limuru, Kiambu County, Kenya
- **Type:** Primary care facility
- **Beds:** 50
- **Staff:** ~100 employees
- **Daily Patients:** 200-400 outpatients

### Operational Challenges

1. **Manual Queue Management**
   - Paper-based ticket system
   - No real-time visibility
   - Inefficient patient flow

2. **Communication Gaps**
   - Patients don't know wait times
   - No proactive notifications
   - Language barriers (English/Swahili)

3. **Limited Infrastructure**
   - Unreliable internet connectivity
   - Limited IT staff
   - Budget constraints

### Solution Objectives

| Objective | Success Metric |
|-----------|---------------|
| Reduce patient wait time | 30% reduction |
| Improve queue visibility | 100% digital displays |
| Enable self-service | 50% ticket self-generation |
| Ensure offline operation | Full functionality without internet |

---

## Non-Functional Requirements

### Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time (p95) | < 100ms | Cloudflare Analytics |
| TV Display Update Latency | < 500ms | WebSocket timestamp |
| Page Load Time (LCP) | < 1.5s | Lighthouse |
| Concurrent Users | 500 | Load testing |

### Availability

| Metric | Target |
|--------|--------|
| Uptime SLA | 99.9% |
| Planned maintenance | < 4 hours/month |
| Unplanned downtime | < 30 minutes |
| Recovery Time Objective (RTO) | 15 minutes |
| Recovery Point Objective (RPO) | 5 minutes |

### Scalability

| Dimension | Capacity |
|-----------|----------|
| Concurrent queues | 50 |
| Tickets per day | 10,000 |
| Registered patients | 100,000 |
| WebSocket connections | 1,000 |

### Security

| Requirement | Implementation |
|-------------|----------------|
| Data encryption | TLS 1.3, field-level PHI |
| Authentication | JWT + KV sessions |
| Authorization | RBAC with 10 roles |
| Audit logging | All actions logged |
| HIPAA compliance | PHI protection |

---

## Technology Stack

### Infrastructure Layer

```
+------------------+------------------+------------------+
|    Cloudflare    |    Cloudflare    |    Cloudflare    |
|     Workers      |        D1        |        KV        |
|   (Compute)      |   (Database)     |    (Cache)       |
+------------------+------------------+------------------+
```

| Service | Technology | Purpose |
|---------|------------|---------|
| Compute | Cloudflare Workers | Serverless API |
| Database | Cloudflare D1 | SQLite at edge |
| Cache | Cloudflare KV | Session, cache |
| Storage | Cloudflare R2 | File storage |
| Real-time | Durable Objects | WebSocket hub |

### Application Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| API | Hono.js | REST API framework |
| Web Frontend | Next.js 14 | Web dashboards |
| Mobile | React Native Expo | Mobile apps |
| Real-time | Durable Objects | WebSocket |

### External Services

| Service | Provider | Purpose |
|---------|----------|---------|
| SMS | Africa's Talking | SMS notifications |
| Messaging | WhatsApp Cloud API | WhatsApp chatbot |
| HMS | Hospital System | Patient data sync |
| TTS | Web Speech API | Audio announcements |
| IPTV | Hardware/Software | TV display integration |

### Development Tools

| Tool | Purpose |
|------|---------|
| pnpm | Package manager |
| Turborepo | Build orchestration |
| TypeScript | Type safety |
| Vitest | Testing |
| Wrangler | Cloudflare CLI |
| Docker | Local development |

---

## Component Architecture

### High-Level Architecture Diagram

```
+------------------------------------------------------------------+
|                         PATIENT VIEW                              |
+------------------------------------------------------------------+
|                                                                   |
|   +------------------+      +------------------+                  |
|   |   Mobile App    |      |    TV Display    |                  |
|   |   (Expo/RN)     |      |   (Next.js)      |                  |
|   +--------+-------+      +--------+---------+                  |
|            |                         |                           |
|            |   +----------------+     |                           |
|            +--->   WebSocket    <-----+                           |
|                |   Connection   |                                  |
|                +--------+-------+                                   |
|                         |                                           |
+------------------------------------------------------------------+
                          |
+------------------------------------------------------------------+
|                        EDGE LAYER                                 |
+------------------------------------------------------------------+
|                                                                   |
|   +------------------+      +------------------+                  |
|   |  Cloudflare      |      |  Durable Objects |                  |
|   |  Workers (API)   |<---->|  (WebSocket Hub) |                  |
|   |                  |      |                  |                  |
|   +--------+---------+      +--------+---------+                  |
|            |                         |                             |
|            |                         v                             |
|            |                +------------------+                   |
|            |                |  Queue Manager   |                   |
|            |                |  (State Machine) |                   |
|            |                +--------+---------+                   |
|            |                         |                             |
|            +-------------+-----------+                             |
|                          |                                         |
+------------------------------------------------------------------+
                          |
+------------------------------------------------------------------+
|                      DATA LAYER                                   |
+------------------------------------------------------------------+
|                                                                   |
|   +------------------+      +------------------+                  |
|   |      D1          |      |       KV         |                  |
|   |   (SQLite)       |      |   (Sessions)     |                  |
|   |                  |      |                  |                  |
|   |  - Patients      |      |  - JWT sessions  |                  |
|   |  - Queue         |      |  - Rate limits   |                  |
|   |  - Tickets       |      |  - Cache         |                  |
|   |  - Audit Log     |      |                  |                  |
|   +------------------+      +------------------+                  |
|                                                                   |
|   +------------------+      +------------------+                  |
|   |       R2         |      |    External      |                  |
|   |   (Storage)      |      |    Services      |                  |
|   |                  |      |                  |                  |
|   |  - Exports       |      |  - WhatsApp      |                  |
|   |  - Reports       |      |  - SMS Gateway   |                  |
|   |  - Media         |      |  - HMS API        |                  |
|   +------------------+      +------------------+                  |
|                                                                   |
+------------------------------------------------------------------+

```

### Component Descriptions

#### 1. API Service (Cloudflare Workers)

**Location:** `apps/api/src/index.ts`

**Responsibilities:**
- RESTful API endpoints
- Authentication & authorization
- Business logic execution
- Database queries
- External service integration

**Key Endpoints:**
| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/auth/login` | User authentication |
| `POST /api/v1/tickets` | Create new ticket |
| `GET /api/v1/queue/:dept` | Get department queue |
| `POST /api/v1/call` | Call next patient |
| `POST /api/v1/complete` | Complete service |

#### 2. Queue Engine

**Location:** `apps/api/src/services/queue.ts`

**Responsibilities:**
- Ticket generation
- Priority calculation
- Queue state management
- Call scheduling

**State Machine:**
```
  [GENERATED] --> [WAITING] --> [CALLED] --> [SERVING] --> [COMPLETED]
       |            |             |            |               |
       v            v             v            v               v
   [EXPIRED]    [TRANSFER]   [RECALLED]   [TRANSFERRED]   [CANCELLED]
```

#### 3. WebSocket Hub (Durable Objects)

**Location:** `apps/api/src/workers/websocket.ts`

**Responsibilities:**
- Real-time connections
- Broadcast updates
- Room-based subscriptions
- Connection management

**Architecture:**
```
                    +------------------+
                    | WebSocket Hub    |
                    | (Durable Object) |
                    +--------+---------+
                             |
         +-------------------+-------------------+
         |                   |                   |
         v                   v                   v
   +-----------+       +-----------+       +-----------+
   | TV Display|       | Mobile App|       | Dashboard |
   |  Client  |       |   Client  |       |   Client  |
   +-----------+       +-----------+       +-----------+
```

#### 4. TV Display Service

**Location:** `apps/web/components/display/`

**Responsibilities:**
- Queue visualization
- Patient call display
- Audio announcement trigger
- IPTV overlay

#### 5. Notification Service

**Location:** `apps/api/src/services/notification.ts`

**Responsibilities:**
- SMS via Africa's Talking
- WhatsApp messages
- Push notifications
- Email alerts

---

## Data Flow

### Patient Registration Flow

```
+-------------+     +-------------+     +-------------+     +-------------+
|  Reception  |     |    API      |     |    D1       |     |  Patient    |
|   Client    | --> |   Server    | --> |  Database   | --> |   Gets      |
|             |     |             |     |             |     |   Ticket    |
+-------------+     +-------------+     +-------------+     +-------------+
      |                   |                   |                    |
      | 1. Submit form    | 2. Create ticket  | 3. Save record    | 4. Print/SMS
      |------------------>|------------------>|                   |
      |                   |                   |                    |
      |                   |<------------------|                    |
      | 5. Return ticket  | 6. Generate ID    |                    |
      |<------------------|                                       |
```

### Patient Calling Flow

```
+-------------+     +-------------+     +-------------+     +-------------+
|   Doctor    |     |    API      |     | Durable Obj |     |  WebSocket  |
|   Client    | --> |   Server    | --> |    Hub      | --> |  Broadcast  |
+-------------+     +-------------+     +-------------+     +-------------+
      |                   |                   |                    |
      | 1. Call patient  | 2. Update queue   | 3. Emit event     | 4. Real-time
      |------------------>|------------------>|------------------>|   update
      |                   |                   |                    |
      |                   +-------------+      |                    |
      |                   |  Audio Svc  |      |                    |
      |                   +------+------+      |                    |
      |                          |             |                    |
      |                          v             |                    |
      |                   +-------------+      |                    |
      |                   | TTS Engine  |      |                    |
      |                   | (Web Speech)|      |                    |
      |                   +-------------+      |                    |
```

### HMS Integration Flow

```
+-------------+     +-------------+     +-------------+     +-------------+
|     HMS     |     |    API      |     |    D1       |     |  Queue      |
|   System    | --> |   Webhook   | --> |  Database   | --> |   Engine    |
+-------------+     +-------------+     +-------------+     +-------------+
      |                   |                   |                    |
      | 1. Patient visit | 2. Validate &     | 3. Sync patient   | 4. Auto-queue
      |------------------>|   authenticate   |------------------>|   if enabled
      |                   |------------------>|                   |
      | 2. Return status  | 3. Process data   |                   |
      |<------------------|                                       |
```

---

## Security Architecture

### Authentication Flow

```
+----------------+      +----------------+      +----------------+
|    Client      |      |   API Server   |      |      KV       |
|                | -->  |                | -->  |   (Sessions)   |
+----------------+      +----------------+      +----------------+
       |                       |                       |
       | 1. POST /auth/login   |                       |
       |---------------------->|                       |
       |                       | 2. Validate creds    |
       |                       |--------------------->|
       |                       |                       |
       |                       |<----------------------|
       |                       | 3. Create session     |
       |                       |                       |
       | 4. JWT + session ID   |                       |
       |<----------------------|                       |
       |                       |                       |
       | 5. Subsequent requests (JWT in header)        |
       |---------------------->|                       |
       |                       |                       |
```

### Authorization Matrix

| Role | Create Ticket | Call Patient | View All | Admin Settings |
|------|---------------|--------------|----------|----------------|
| super_admin | Yes | Yes | Yes | Yes |
| admin | Yes | Yes | Yes | Yes |
| doctor | Yes | Yes | Dept only | No |
| nurse | Yes | Yes | Dept only | No |
| receptionist | Yes | Dept only | Dept only | No |
| patient | Own only | No | Own only | No |
| pharmacist | Yes | Yes | Dept only | No |
| lab_tech | Yes | Yes | Dept only | No |
| facility_manager | View | No | Yes | Limited |
| it_support | No | No | Yes | Limited |

### Data Protection

| Data Type | Protection | Method |
|-----------|------------|--------|
| Passwords | Hashed | bcrypt (cost 10) |
| JWT Secret | Encrypted | Cloudflare Secrets |
| PHI Fields | Field-level | AES-256-GCM |
| API Keys | Encrypted | Cloudflare Secrets |
| Session Tokens | KV with TTL | Automatic expiry |
| Audit Logs | Immutable | Append-only table |

---

## Scalability Design

### Edge Computing Model

```
                    +-----------------+
                    |  Cloudflare     |
                    |  Global Network |
                    +--------+--------+
                             |
     +-----------------------+-----------------------+
     |                       |                       |
+----v----+           +------v------+          +-----v-----+
| Africa  |           |   Europe    |          |   Asia    |
| PoP     |           |   PoP       |          |   PoP      |
+----+----+           +-----+-------+          +-----+-----+
     |                      |                       |
     |  +----------------+  |  +----------------+  |
     +->|   API Workers  |  +->|  API Workers   |  +->|
        |   (Stateless)  |     |   (Stateless)  |     |
        +--------+-------+     +--------+-------+     |
                 |                      |             |
                 +----------+-----------+             |
                            |                         |
                    +-------v-------+         +-------v-------+
                    |      D1        |         |      D1       |
                    | (Read Replica) |         |(Read Replica) |
                    +----------------+         +---------------+
```

### Database Sharding Strategy

**Sharding Key:** `department_id`

| Shard | Departments | D1 Instance |
|-------|-------------|-------------|
| Shard 0 | MED, PED, EMR | D1-A |
| Shard 1 | GYN, ORT, SUR | D1-B |
| Shard 2 | LAB, RAD, PHM | D1-C |
| Global | Users, Audit | D1-Global |

### Caching Strategy

| Data | Cache Location | TTL | Invalidation |
|------|----------------|-----|--------------|
| User sessions | KV | 24h | On logout |
| Department list | KV | 1h | On update |
| Queue state | Memory | Real-time | WebSocket |
| Patient lookup | KV | 5min | On update |
| Rate limits | KV | 1min | Automatic |

---

## Disaster Recovery

### Backup Strategy

| Data Type | Frequency | Retention | Storage |
|-----------|-----------|-----------|---------|
| D1 Database | Daily | 30 days | R2 + Cloudflare |
| R2 Files | Weekly | 90 days | Cross-region R2 |
| Audit Logs | Real-time | 7 years | D1 + R2 |
| Config | On change | Indefinite | Git |

### Recovery Procedures

#### RTO < 15 minutes
1. Deploy from latest successful build
2. Restore D1 from latest backup
3. Update DNS if needed
4. Verify all services

#### RPO < 5 minutes
1. D1 point-in-time recovery
2. WAL replay to specific timestamp
3. Validate data integrity
4. Resume operations

### Failover Architecture

```
+-------------+                    +-------------+
|  Primary    |     Failover      |  Secondary  |
|  Region     | -----------------> |  Region     |
|  (Africa)   |     Automatic      |  (Europe)   |
+-------------+                    +-------------+
```

---

## Related Documents

| Document | Path |
|----------|------|
| Data Flow | [../data-flow/REQUEST-LIFECYCLE.md](../data-flow/REQUEST-LIFECYCLE.md) |
| Components | [../component-models/COMPONENTS.md](../component-models/COMPONENTS.md) |
| Security | [../security-architecture/SECURITY.md](../security-architecture/SECURITY.md) |
| Capacity | [../scalability/CAPACITY.md](../scalability/CAPACITY.md) |
| Queue Engine | [../../03-Queue-Engine/MASTER.md](../../03-Queue-Engine/MASTER.md) |

---

*Last updated: March 20, 2026*
