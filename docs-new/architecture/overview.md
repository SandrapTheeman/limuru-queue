# System Overview

**Hospital:** Limuru Cottage Hospital  
**System:** Queue Management System  
**Version:** 2.0.0  
**Status:** Production Ready

---

## 1. Purpose

The Limuru Cottage Hospital Queue Management System is a comprehensive healthcare application designed to streamline patient flow, improve service delivery, and enhance the overall healthcare experience. The system manages digital queue tickets, patient registration, appointment scheduling, and real-time communication between staff and patients.

### Key Objectives

- **Reduce Wait Times:** Automate queue management to minimize patient waiting
- **Improve Privacy:** Use patient numbers instead of names for privacy protection
- **Enhance Communication:** Real-time updates via multiple channels (web, mobile, TV, WhatsApp)
- **Ensure Compliance:** Meet HIPAA-equivalent data protection standards
- **Support Multiple Roles:** Accommodate 10 distinct user roles with role-specific interfaces

---

## 2. System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────┤
│    Web      │   Mobile    │     TV      │   WhatsApp  │    Kiosk    │
│  (Next.js)  │    (PWA)    │  Display    │   Integration│   (Self-Service)│
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API LAYER (Cloudflare Workers)                │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────┤
│    Auth     │    Queue    │  Patients   │ Appointments│   Messages  │
│   Routes    │   Engine    │   Service   │   Service   │   Service   │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│   Analytics │    Voice    │ Notifications│    HMS     │   Admin     │
│   Service   │   (WebRTC)  │   Service   │  Adapter    │   Service   │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE LAYER                             │
├──────────────────┬──────────────────┬───────────────────────────────┤
│   D1 Database    │   KV Storage     │         R2 Storage             │
│   (SQLite)       │   (Sessions)     │        (File Assets)           │
└──────────────────┴──────────────────┴───────────────────────────────┘
```

---

## 3. Technology Stack

### Frontend Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| Web Application | Next.js 14 | React-based web interface |
| Mobile PWA | React Native + Expo | Cross-platform mobile app |
| TV Display | Static HTML + CSS | Waiting room digital signage |
| State Management | Zustand | Client-side state |
| HTTP Client | Fetch API | API communication |

### Backend Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| API Runtime | Cloudflare Workers | Serverless API execution |
| Framework | Hono.js | REST API framework |
| Database | D1 (SQLite) | Primary data store |
| Sessions | KV Store | User session management |
| Cache | KV Store | Application caching |
| File Storage | R2 | Document and asset storage |

### Communication Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| Voice Calls | WebRTC | Real-time staff communication |
| Messaging | Internal API | Staff-to-staff communication |
| Notifications | Twilio | SMS and WhatsApp alerts |
| Real-time | WebSocket | Live queue updates |

---

## 4. User Roles

The system supports 10 distinct user roles:

| Role | Code | Responsibilities |
|------|------|------------------|
| Super Admin | `super_admin` | System-wide configuration, multi-facility support |
| Admin | `admin` | User management, department configuration, analytics |
| Doctor | `doctor` | Patient consultations, queue management |
| Nurse | `nurse` | Patient triage, vitals recording, initial assessments |
| Receptionist | `receptionist` | Patient registration, ticket issuance |
| Pharmacist | `pharmacist` | Prescription processing, medication dispensing |
| Lab Technician | `lab_tech` | Laboratory order management, result processing |
| Facility Manager | `facility_manager` | Room management, resource allocation |
| IT Support | `it_support` | System maintenance, troubleshooting |
| Patient | `patient` | Self-service portal, queue status |

---

## 5. Core Features

### Queue Management

- **Digital Ticket Generation:** Unique queue numbers with department prefix
- **Priority Queue System:** Emergency, pregnant, elderly, disability prioritization
- **Real-time Status Updates:** Live queue position and estimated wait times
- **Multi-department Support:** Separate queues for each clinical department

### Patient Management

- **Registration:** New patient enrollment with unique patient numbers
- **Self-service Portal:** Queue status, appointment booking, feedback
- **Privacy Protection:** Patient numbers instead of names on displays
- **Medical History:** Visit history and clinical notes tracking

### Staff Dashboard Features

| Dashboard | Key Features |
|-----------|--------------|
| Admin | User management, system settings, analytics |
| Doctor | Queue view, SOAP notes, appointments, voice calls |
| Nurse | Triage, vitals recording, lab results |
| Receptionist | Patient registration, ticket issuance, messaging |

### Communication Features

- **Internal Messaging:** Staff-to-staff secure communication
- **Voice Calls:** WebRTC-based real-time voice communication
- **Notifications:** SMS and WhatsApp via Twilio integration
- **TV Display:** Real-time waiting room status board

---

## 6. Data Flow

```
Patient Check-in Flow:
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Kiosk/  │────▶│   API    │────▶│    D1    │────▶│   TV     │
│ Reception│     │  Server  │     │ Database │     │ Display  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                      │                                  ▲
                      │                                  │
                      ▼                                  │
                 ┌──────────┐                            │
                 │   WhatsApp│                           │
                 │ (Optional)│                          │
                 └──────────┘                            │
                                                          │
Doctor Call Patient Flow:                                 │
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────┴──────┐
│  Doctor  │────▶│   API    │────▶│    D1    │────▶│   Patient  │
│ Dashboard│     │  Server  │     │ Database │     │  (WhatsApp)│
└──────────┘     └──────────┘     └──────────┘     └─────────────┘
```

---

## 7. Security Architecture

### Authentication

- **JWT Tokens:** Secure session management
- **Role-based Access Control (RBAC):** Permission-based authorization
- **Session Management:** KV-based session storage with expiration

### Data Protection

- **Encryption:** HTTPS/TLS for data in transit
- **Privacy:** Patient identifiers (numbers) instead of names on public displays
- **Audit Logging:** Complete audit trail for HIPAA compliance
- **Rate Limiting:** Protection against abuse

---

## 8. Integration Points

### Hospital Management System (HMS) Adapters

The system supports integration with external HMS platforms:

| HMS | Status | Features |
|-----|--------|----------|
| OpenMRS | Configurable | Patient sync, appointments |
| Bahmni | Configurable | Patient records, billing |
| OpenELIS | Configurable | Lab results |

### Third-party Services

| Service | Purpose |
|---------|---------|
| Twilio | SMS and WhatsApp notifications |
| Cloudflare | CDN, DDoS protection, edge computing |

---

## 9. Deployment Architecture

### Cloudflare Workers Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Global Network                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Workers   │  │     D1      │  │     KV      │         │
│  │  (API)      │  │  Database   │  │   Storage   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐                          │
│  │     R2      │  │   Durable   │                          │
│  │   Storage   │  │   Objects   │                          │
│  └─────────────┘  └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare CDN                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Web App   │  │  Mobile PWA │  │    API      │          │
│  │ (Static)   │  │  (Static)   │  │  (Workers)  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. System Requirements

### For Users

- **Web:** Modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Mobile:** iOS 13+ or Android 8+ with browser support
- **Internet:** Minimum 1 Mbps connection

### For Deployment

- **Cloudflare Account:** Free or Pro tier
- **Wrangler CLI:** Version 4.x
- **Node.js:** Version 18+

---

## 11. Support and Maintenance

| Support Level | Contact | Response Time |
|--------------|---------|---------------|
| IT Support | it-support@limuruhospital.co.ke | 4 hours |
| System Admin | admin@limuruhospital.co.ke | 8 hours |
| Emergency | +254-XXX-XXXX | Immediate |

---

## 12. Localization

The system supports:

| Language | Code | Status |
|----------|------|--------|
| English | `en` | Primary |
| Swahili | `sw` | Supported |

UI strings include both EN and SW translations for patient-facing interfaces.
