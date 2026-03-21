# Data Flow Documentation

## 1. Overview

This document describes the data flow architecture for the Limuru Cottage Hospital Queue Management System, covering all major operations from patient check-in to consultation completion.

---

## 2. Authentication Flow

### 2.1 Staff Login

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│  Client  │                    │   API    │                    │    KV    │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                                  │                               │
     │  POST /api/auth/staff/login     │                               │
     │  {email, password}               │                               │
     │─────────────────────────────────▶│                               │
     │                                  │                               │
     │                                  │  Query users table            │
     │                                  │  Validate password (bcrypt)   │
     │                                  │───────────────────────────────▶│
     │                                  │                               │
     │                                  │◀──────────────────────────────│
     │                                  │                               │
     │                                  │  Generate JWT token           │
     │                                  │  Create session in KV         │
     │                                  │───────────────────────────────▶│
     │                                  │                               │
     │                                  │◀──────────────────────────────│
     │                                  │                               │
     │  {token, user, expiresIn}        │                               │
     │◀─────────────────────────────────│                               │
     │                                  │                               │
```

### 2.2 Patient Login

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│  Client  │                    │   API    │                    │    KV    │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                                  │                               │
     │  POST /api/auth/patient/login   │                               │
     │  {identifier, password}         │                               │
     │─────────────────────────────────▶│                               │
     │                                  │                               │
     │                                  │  Query patients table         │
     │                                  │  (by email, phone, or id)      │
     │                                  │                               │
     │                                  │  Validate password            │
     │                                  │                               │
     │                                  │  Generate JWT                 │
     │                                  │  Store session                │
     │                                  │───────────────────────────────▶│
     │                                  │                               │
     │  {token, user, requiresPasswordChange}                          │
     │◀─────────────────────────────────│                               │
     │                                  │                               │
```

### 2.3 Session Validation

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│  Client  │                    │   API    │                    │    KV    │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                                  │                               │
     │  GET /api/patients               │                               │
     │  Authorization: Bearer <token>   │                               │
     │─────────────────────────────────▶│                               │
     │                                  │                               │
     │                                  │  Extract token                │
     │                                  │  Check SESSION_KV             │
     │                                  │───────────────────────────────▶│
     │                                  │                               │
     │                                  │◀──────────────────────────────│
     │                                  │  Valid session?                │
     │                                  │                               │
     │  {data} or 401 Unauthorized      │                               │
     │◀─────────────────────────────────│                               │
     │                                  │                               │
```

---

## 3. Patient Registration Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Reception│     │   API    │     │    D1    │     │    HMS    │
│  Client  │     │  Server  │     │ Database │     │ Adapter  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                  │                  │                  │
     │  POST /patients │                  │                  │
     │  {name, dob,    │                  │                  │
     │   phone, ...}   │                  │                  │
     │────────────────▶│                  │                  │
     │                  │                  │                  │
     │                  │  Validate input  │                  │
     │                  │  (Zod schema)    │                  │
     │                  │                  │                  │
     │                  │  Generate patient_number             │
     │                  │  (e.g., LCH-2024-0001)                │
     │                  │                  │                  │
     │                  │  INSERT patient   │                  │
     │                  │──────────────────▶│                  │
     │                  │                  │                  │
     │                  │◀──────────────────│                  │
     │                  │  patient_id       │                  │
     │                  │                  │                  │
     │                  │  Sync to HMS (if configured)         │
     │                  │─────────────────────────────────────▶│
     │                  │                  │                  │
     │                  │◀─────────────────────────────────────│
     │                  │  HMS patient_id  │                  │
     │                  │                  │                  │
     │  {patient_id,    │                  │                  │
     │   patient_number}│                  │                  │
     │◀────────────────│                  │                  │
     │                  │                  │                  │
```

---

## 4. Queue Management Flow

### 4.1 Ticket Generation

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Reception│     │   API    │     │    D1    │     │    KV    │
│  Client  │     │  Server  │     │ Database │     │   Cache  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                  │                  │                  │
     │  POST /queue     │                  │                  │
     │  {patientId,    │                  │                  │
     │   departmentId,  │                  │                  │
     │   priority}      │                  │                  │
     │────────────────▶│                  │                  │
     │                  │                  │                  │
     │                  │  Check patient exists              │
     │                  │──────────────────▶│                  │
     │                  │◀──────────────────│                  │
     │                  │                  │                  │
     │                  │  Get next ticket_number             │
     │                  │  (atomic increment)  │                  │
     │                  │                  │                  │
     │                  │  Calculate position                  │
     │                  │  (based on priority)                 │
     │                  │                  │                  │
     │                  │  INSERT queue entry│                 │
     │                  │──────────────────▶│                  │
     │                  │                  │                  │
     │                  │  Update queue cache│                 │
     │                  │─────────────────────────────────────▶│
     │                  │                  │                  │
     │  {ticket,        │                  │                  │
     │   position,      │                  │                  │
     │   estimatedWait} │                  │                  │
     │◀────────────────│                  │                  │
     │                  │                  │                  │
```

### 4.2 Patient Call

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Doctor  │     │   API    │     │    D1    │     │  Twilio  │
│ Dashboard│     │  Server  │     │ Database │     │ (WhatsApp)│
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                  │                  │                  │
     │  POST /queue/call│                  │                  │
     │  {ticketId,     │                  │                  │
     │   roomAssigned}  │                  │                  │
     │────────────────▶│                  │                  │
     │                  │                  │                  │
     │                  │  UPDATE queue status               │
     │                  │  SET status='called'                │
     │                  │  SET room_assigned=<room>           │
     │                  │  SET called_at=NOW()               │
     │                  │──────────────────▶│                  │
     │                  │◀──────────────────│                  │
     │                  │                  │                  │
     │                  │  Get patient phone│                 │
     │                  │──────────────────▶│                  │
     │                  │◀──────────────────│                  │
     │                  │                  │                  │
     │                  │  Send notification│                │
     │                  │  (if enabled)     │                  │
     │                  │─────────────────────────────────────▶│
     │                  │                  │                  │
     │  {success,       │                  │                  │
     │   ticket}        │                  │                  │
     │◀────────────────│                  │                  │
     │                  │                  │                  │
```

### 4.3 Queue Status Updates

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│    TV    │     │   API    │     │    D1    │     │  WebSocket│
│ Display  │     │  Server  │     │ Database │     │ (SSE)    │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                  │                  │                  │
     │  GET /queue      │                  │                  │
     │  (polling/SSE)   │                  │                  │
     │────────────────▶│                  │                  │
     │                  │                  │                  │
     │                  │  Query queue entries              │
     │                  │  (status IN ('waiting','called')) │
     │                  │──────────────────▶│                  │
     │                  │◀──────────────────│                  │
     │                  │                  │                  │
     │  {tickets,       │                  │                  │
     │   stats}         │                  │                  │
     │◀────────────────│                  │                  │
     │                  │                  │                  │
     │◀────────────────│                  │                  │
     │  (SSE updates)   │                  │                  │
     │                  │                  │                  │
```

---

## 5. Appointment Scheduling Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Patient │     │   API    │     │    D1    │     │   HMS    │
│  Portal  │     │  Server  │     │ Database │     │ Adapter  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                  │                  │                  │
     │  POST /appointments                │                  │
     │  {patientId,    │                  │                  │
     │   doctorId,     │                  │                  │
     │   date, time}   │                  │                  │
     │────────────────▶│                  │                  │
     │                  │                  │                  │
     │                  │  Validate availability            │
     │                  │  (check doctor schedule)           │
     │                  │──────────────────▶│                  │
     │                  │◀──────────────────│                  │
     │                  │                  │                  │
     │                  │  Check conflicts  │                 │
     │                  │──────────────────▶│                  │
     │                  │◀──────────────────│                  │
     │                  │                  │                  │
     │                  │  INSERT appointment│                │
     │                  │──────────────────▶│                  │
     │                  │                  │                  │
     │                  │  Sync to HMS      │                 │
     │                  │  (if configured)  │                 │
     │                  │─────────────────────────────────────▶│
     │                  │                  │                  │
     │  {appointment,   │                  │                  │
     │   confirmation}  │                  │                  │
     │◀────────────────│                  │                  │
     │                  │                  │                  │
```

---

## 6. Clinical Documentation Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Doctor  │     │   API    │     │    D1    │     │    HMS   │
│  Client  │     │  Server  │     │ Database │     │ Adapter  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                  │                  │                  │
     │  POST /notes     │                  │                  │
     │  {queueId,      │                  │                  │
     │   diagnosis,    │                  │                  │
     │   prescription} │                  │                  │
     │────────────────▶│                  │                  │
     │                  │                  │                  │
     │                  │  Validate input  │                  │
     │                  │  Create SOAP note│                 │
     │                  │                  │                  │
     │                  │  INSERT clinical_note             │
     │                  │──────────────────▶│                  │
     │                  │                  │                  │
     │                  │  UPDATE queue status              │
     │                  │  SET status='completed'           │
     │                  │──────────────────▶│                  │
     │                  │                  │                  │
     │                  │  Sync to HMS      │                 │
     │                  │  (diagnosis,      │                 │
     │                  │   prescription)   │                 │
     │                  │─────────────────────────────────────▶│
     │                  │                  │                  │
     │  {success, note} │                  │                  │
     │◀────────────────│                  │                  │
     │                  │                  │                  │
```

---

## 7. Messaging Flow

### 7.1 Staff-to-Staff Message

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Sender  │     │   API    │     │    D1    │     │ Receiver │
│  Client  │     │  Server  │     │ Database │     │  Client  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                  │                  │                  │
     │  POST /messages  │                  │                  │
     │  {recipientId,  │                  │                  │
     │   subject,      │                  │                  │
     │   content}      │                  │                  │
     │────────────────▶│                  │                  │
     │                  │                  │                  │
     │                  │  INSERT message  │                  │
     │                  │──────────────────▶│                  │
     │                  │                  │                  │
     │                  │  Get push token  │                 │
     │                  │  (if configured)  │                 │
     │                  │◀──────────────────│                  │
     │                  │                  │                  │
     │                  │  Send push notification (optional) │
     │                  │─────────────────────────────────────▶│
     │                  │                  │                  │
     │  {messageId, success}│              │                  │
     │◀────────────────│                  │                  │
     │                  │                  │                  │
```

### 7.2 Broadcast Message

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Admin   │     │   API    │     │    D1    │
│  Client  │     │  Server  │     │ Database │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                  │                  │
     │  POST /messages  │                  │
     │  {recipientType:│                  │
     │   'all',         │                  │
     │   content}       │                  │
     │────────────────▶│                  │
     │                  │                  │
     │                  │  Query all active users           │
     │                  │──────────────────▶│
     │                  │◀──────────────────│
     │                  │                  │
     │                  │  INSERT message for each user     │
     │                  │  (batched)       │                │
     │                  │──────────────────▶│
     │                  │                  │
     │  {sent: N,      │                  │
     │   failed: M}    │                  │
     │◀────────────────│                  │
     │                  │                  │
```

---

## 8. Voice Call Flow (WebRTC)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Caller   │     │   API    │     │ Durable  │     │ Callee   │
│ (Browser)│     │  Server  │     │ Objects  │     │ (Browser)│
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                  │                  │                  │
     │  1. Initiate call│                 │                  │
     │  POST /voice/call│                 │                  │
     │─────────────────▶│                  │                  │
     │                  │                  │                  │
     │                  │  2. Create call record           │
     │                  │  INSERT INTO voice_calls          │
     │                  │──────────────────▶│
     │                  │◀──────────────────│
     │                  │                  │
     │  {callId, sdpOffer}│              │                  │
     │◀─────────────────│                  │                  │
     │                  │                  │                  │
     │  3. Send WebRTC offer via signaling│                  │
     │────────────────────────────────────▶│
     │                  │                  │                  │
     │                  │  4. Route to callee│                │
     │                  │◀────────────────────────────────────│
     │                  │                  │                  │
     │  5. ICE candidates exchange          │                  │
     │◀────────────────────────────────────▶│
     │                  │                  │                  │
     │  6. Call answered│                  │                  │
     │  POST /voice/call/:id/accept        │                  │
     │─────────────────────────────────────▶│                  │
     │                  │                  │                  │
     │  7. P2P media established            │                  │
     │◀────────────────────────────────────▶│
     │                  │                  │                  │
```

---

## 9. Notification Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   API    │     │    D1    │     │  Twilio  │     │  Patient │
│  Server  │     │ Database │     │   API    │     │  Phone   │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                  │                  │                  │
     │  Trigger event  │                  │                  │
     │  (call, remind) │                  │                  │
     │                  │                  │                  │
     │  Get patient    │                  │                  │
     │  notification prefs│              │                  │
     │──────────────────▶│                  │                  │
     │◀──────────────────│                  │                  │
     │                  │                  │                  │
     │  Select channel  │                  │                  │
     │  (SMS/WhatsApp)  │                  │                  │
     │                  │                  │                  │
     │  POST to Twilio │                  │                  │
     │────────────────────────────────────▶│
     │                  │                  │
     │◀────────────────────────────────────│
     │                  │                  │     SMS/WhatsApp │
     │                  │                  │◀─────────────────│
     │                  │                  │                  │
     │  INSERT notification│               │                  │
     │──────────────────▶│                  │                  │
     │                  │                  │                  │
```

---

## 10. HMS Integration Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   API    │     │    D1    │     │    HMS   │     │   HMS    │
│  Server  │     │ Database │     │ Adapter  │     │ Instance │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                  │                  │                  │
     │  Event triggered│                  │                  │
     │  (patient reg,  │                  │                  │
     │   diagnosis)   │                  │                  │
     │                  │                  │                  │
     │  Call HMS adapter│                 │                  │
     │────────────────────────────────────▶│
     │                  │                  │                  │
     │                  │  Transform data to HMS format     │
     │                  │────────────────────────────────────▶│
     │                  │                  │                  │
     │                  │◀────────────────────────────────────│
     │                  │  HMS response   │                  │
     │                  │                  │                  │
     │  Store HMS reference ID│            │                  │
     │──────────────────▶│                  │                  │
     │                  │                  │                  │
```

---

## 11. Audit Logging Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│   API    │     │    D1    │     │   Audit  │
│  Server  │     │ Database │     │   Log    │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                  │                  │
     │  PHI operation  │                  │
     │  (access, modify)│                 │
     │                  │                  │
     │  Create audit entry│              │
     │  {userId, action,│                │
     │   entityType,    │                │
     │   entityId,      │                │
     │   ip_address}    │                │
     │                  │                  │
     │  INSERT INTO audit_logs            │
     │──────────────────▶│                  │
     │                  │                  │
     │  Trigger for backup│               │
     │──────────────────▶│                  │
     │                  │                  │
```

---

## 12. Data Synchronization

### 12.1 Real-time Sync (Durable Objects)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │ Durable  │     │    D1    │     │  Other   │
│  (Web)   │     │ Objects  │     │ Database │     │ Clients  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                  │                  │                  │
     │  Connect to room│                  │                  │
     │  WebSocket      │                  │                  │
     │────────────────▶│                  │                  │
     │                  │                  │                  │
     │                  │  Fetch current state              │
     │                  │──────────────────▶│                  │
     │                  │◀──────────────────│                  │
     │                  │                  │                  │
     │  State update   │                  │                  │
     │  (queue change) │                  │                  │
     │────────────────▶│                  │                  │
     │                  │                  │                  │
     │                  │  Broadcast to all connected      │
     │◀────────────────────────────────────▶│                  │
     │                  │                  │                  │
```

---

## 13. Error Handling Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │   API    │     │  Sentry  │
│          │     │  Server  │     │  (Error  │
│          │     │          │     │ Tracking)│
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                  │                  │
     │  API request     │                  │
     │────────────────────────────────────▶│
     │                  │                  │
     │                  │  Error occurred  │
     │                  │                  │
     │                  │  Log to Sentry   │
     │                  │────────────────────────────────────▶│
     │                  │                  │
     │                  │  Return error   │
     │  {success:false,│
     │   error: "..."} │
     │◀────────────────│
     │                  │
```
