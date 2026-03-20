## Creating File: `.opencode/context/project/06-glossary.md`

```markdown
# Project Glossary
**Document ID:** PROJ-06
**Version:** 1.0
**Last Updated:** 2026-03-03
**Owner:** Product Manager

## Purpose

This document defines the key terms, acronyms, and concepts used throughout the Hospital Queuing System project. A common vocabulary ensures clear communication across all stakeholders.

## 1. Core Domain Terms

### 1.1 Patient-Facing Terms

| Term | Definition | Example | Related Terms |
|------|------------|---------|---------------|
| **Patient** | An individual receiving medical services at the hospital | "John Doe is a patient waiting for cardiology" | Visitor, Client |
| **Ticket** | A physical or digital token with a unique number assigned to a patient upon arrival | "Patient received ticket #MED042" | Queue Number, Token |
| **Queue** | The ordered line of patients waiting to be seen by medical staff | "There are 12 patients in the queue" | Line, Waiting List |
| **Wait Time** | The estimated duration a patient will wait before being called | "Your estimated wait time is 15 minutes" | ETA, Waiting Period |
| **Position** | A patient's current place in the queue | "You are #3 in the queue" | Place, Spot |
| **Called** | Status indicating a patient has been summoned to a consultation room | "Patient MED042 has been called to Room 204" | Summoned, Paged |
| **No-Show** | A patient who does not respond when called | "Patient marked as no-show after 3 attempts" | Missed, Absent |
| **Priority** | Special status given to emergency or urgent cases | "Emergency patients have priority over regular visits" | Urgent, Emergency |

### 1.2 Staff-Facing Terms

| Term | Definition | Example | Related Terms |
|------|------------|---------|---------------|
| **Doctor Station** | The interface used by doctors to manage their queue | "Dr. Smith logged into his station at 8:00 AM" | Doctor Dashboard |
| **Reception Station** | The interface used by receptionists to register patients | "Receptionist added a walk-in patient via the station" | Reception Dashboard |
| **Call Next** | Action to summon the next patient in queue | "Press the 'Call Next' button when ready" | Next Patient |
| **Transfer** | Moving a patient from one department to another | "Patient transferred from triage to cardiology" | Handoff, Redirect |
| **Break Mode** | Status indicating a doctor is temporarily unavailable | "Dr. Kimani set break mode for lunch" | Away, Unavailable |
| **Consultation** | The medical examination and discussion with a patient | "Average consultation time is 15 minutes" | Visit, Appointment |
| **Triage** | Initial assessment to determine patient priority | "Nurse performed triage on new patients" | Assessment, Screening |

### 1.3 Administrative Terms

| Term | Definition | Example | Related Terms |
|------|------------|---------|---------------|
| **Department** | A specialized unit within the hospital | "Cardiology department handles heart-related cases" | Unit, Division |
| **Analytics** | Statistical analysis of hospital operations | "Analytics show peak hours between 9-11 AM" | Metrics, Statistics |
| **Dashboard** | A visual display of key information | "Admin dashboard shows queue status across all departments" | Overview, Panel |
| **IPTV** | Internet Protocol Television for waiting area entertainment | "Admin switched IPTV channel to news" | TV, Display |
| **Playlist** | A list of IPTV channels available for display | "M3U playlist contains 20 channels" | Channel List |
| **Override** | Manual intervention in automated processes | "Admin override to call specific patient" | Manual Call |

## 2. Technical Terms

### 2.1 Architecture Terms

| Term | Definition | Example | Related Terms |
|------|------------|---------|---------------|
| **Cloudflare Workers** | Serverless functions running at Cloudflare's edge network | "Queue API runs on Cloudflare Workers" | Workers, Edge Functions |
| **D1** | Cloudflare's serverless SQL database | "Patient records stored in D1" | Database, SQLite |
| **KV** | Cloudflare's key-value store for caching | "Session data stored in KV" | Key-Value Store, Cache |
| **R2** | Cloudflare's object storage for files | "IPTV playlists stored in R2" | Object Storage |
| **Durable Objects** | Cloudflare's stateful serverless objects | "Real-time queue state managed by Durable Objects" | DO, Stateful Objects |
| **Pages** | Cloudflare's static site hosting | "Frontend deployed on Cloudflare Pages" | Hosting |
| **Edge Network** | Cloudflare's global network of servers | "Content served from edge network for low latency" | CDN |

### 2.2 Frontend Terms

| Term | Definition | Example | Related Terms |
|------|------------|---------|---------------|
| **Next.js** | React framework used for the frontend | "Built with Next.js 14" | Framework |
| **React** | JavaScript library for building user interfaces | "UI components written in React" | Library |
| **TypeScript** | Typed superset of JavaScript | "All code written in TypeScript" | TS, Language |
| **Tailwind CSS** | Utility-first CSS framework | "Styled with Tailwind for consistency" | CSS, Styling |
| **tRPC** | Type-safe RPC framework | "API calls use tRPC for end-to-end types" | RPC, API |
| **Zustand** | State management library | "Queue state managed with Zustand" | State Management |
| **React Query** | Data fetching and caching library | "Server state managed with React Query" | Data Fetching |
| **PWA** | Progressive Web App | "Patient portal available as PWA" | Progressive Web App |

### 2.3 Backend Terms

| Term | Definition | Example | Related Terms |
|------|------------|---------|---------------|
| **API** | Application Programming Interface | "REST API for queue operations" | Interface |
| **WebSocket** | Protocol for real-time bidirectional communication | "Queue updates via WebSocket" | Socket, WS |
| **JWT** | JSON Web Token for authentication | "User authenticated via JWT" | Token |
| **Middleware** | Functions that execute during request processing | "Authentication middleware checks JWT" | Interceptor |
| **Endpoint** | Specific URL where API can be accessed | "GET /api/queue endpoint" | Route |
| **Schema** | Structure definition for data | "Patient schema defined with Zod" | Validation |
| **Migration** | Database schema version control | "Run migrations to update database" | Schema Update |

## 3. Security Terms

| Term | Definition | Example | Related Terms |
|------|------------|---------|---------------|
| **Authentication** | Verifying user identity | "Patient authenticates with ID and password" | Auth, Login |
| **Authorization** | Determining user permissions | "Doctor authorized to call patients" | Access Control |
| **RBAC** | Role-Based Access Control | "RBAC ensures patients can't access doctor functions" | Role-Based |
| **MFA** | Multi-Factor Authentication | "Staff required to use MFA" | 2FA, Two-Factor |
| **Encryption** | Converting data to secure format | "Patient data encrypted at rest" | Crypto |
| **Hashing** | One-way encryption for passwords | "Passwords hashed with bcrypt" | Hash |
| **Salt** | Random data added to hashing | "Unique salt per password" | |
| **CORS** | Cross-Origin Resource Sharing | "CORS configured for hospital domain" | Cross-Origin |
| **Rate Limiting** | Controlling request frequency | "Rate limiting prevents brute force attacks" | Throttling |
| **Audit Log** | Record of system events | "All patient data access logged in audit trail" | Log, Trail |

## 4. Testing Terms

| Term | Definition | Example | Related Terms |
|------|------------|---------|---------------|
| **Unit Test** | Testing individual functions in isolation | "Unit test for queue position calculation" | Test |
| **Integration Test** | Testing multiple components together | "Integration test for queue API with database" | Integration |
| **E2E Test** | End-to-end testing of user flows | "E2E test for complete patient journey" | End-to-End |
| **Mock** | Simulated object for testing | "Mock database for unit tests" | Stub, Fake |
| **Fixture** | Predefined test data | "Patient fixtures loaded before tests" | Test Data |
| **Coverage** | Measure of code tested | "90% test coverage achieved" | Coverage |
| **Snapshot** | Record of expected output | "UI snapshot test for dashboard" | Snapshot |
| **Load Test** | Testing under heavy load | "Load test simulates 1000 concurrent users" | Performance Test |

## 5. Deployment Terms

| Term | Definition | Example | Related Terms |
|------|------------|---------|---------------|
| **CI/CD** | Continuous Integration/Continuous Deployment | "CI/CD pipeline runs on GitHub Actions" | Pipeline |
| **Environment** | Deployment context (dev/staging/prod) | "Deployed to staging for testing" | Env |
| **Build** | Compiled/transformed code ready for deployment | "Build generates optimized assets" | Compile |
| **Release** | Specific version deployed to production | "Release v1.2.0 deployed" | Version |
| **Rollback** | Reverting to previous version | "Emergency rollback due to critical bug" | Revert |
| **Canary** | Gradual rollout to subset of users | "Canary deployment to 10% of traffic" | Gradual Rollout |
| **Blue-Green** | Deployment strategy with zero downtime | "Blue-green deployment switches traffic" | Zero Downtime |
| **Hotfix** | Urgent fix deployed outside normal cycle | "Hotfix for security vulnerability" | Emergency Fix |

## 6. Business Terms

| Term | Definition | Example | Related Terms |
|------|------------|---------|---------------|
| **KPI** | Key Performance Indicator | "Wait time is a key KPI" | Metric |
| **SLA** | Service Level Agreement | "API response time under SLA of 500ms" | Agreement |
| **ROI** | Return on Investment | "ROI calculated at 800% over 3 years" | Return |
| **UAT** | User Acceptance Testing | "UAT completed with positive feedback" | Acceptance |
| **MVP** | Minimum Viable Product | "Phase 1 delivers MVP with core features" | Minimum Product |
| **SOP** | Standard Operating Procedure | "SOP for patient registration documented" | Procedure |
| **PHI** | Protected Health Information | "System does not store PHI" | Health Information |

## 7. Acronyms

| Acronym | Full Form | Context |
|---------|-----------|---------|
| **API** | Application Programming Interface | Technical |
| **CDN** | Content Delivery Network | Technical |
| **CI/CD** | Continuous Integration/Continuous Deployment | DevOps |
| **CORS** | Cross-Origin Resource Sharing | Security |
| **CSS** | Cascading Style Sheets | Frontend |
| **DB** | Database | Technical |
| **DO** | Durable Objects | Cloudflare |
| **DTO** | Data Transfer Object | Architecture |
| **E2E** | End-to-End | Testing |
| **ETA** | Estimated Time of Arrival | Patient-Facing |
| **FCP** | First Contentful Paint | Performance |
| **GDPR** | General Data Protection Regulation | Compliance |
| **HMS** | Hospital Management System | External |
| **HTML** | HyperText Markup Language | Frontend |
| **HTTP** | HyperText Transfer Protocol | Technical |
| **IPTV** | Internet Protocol Television | Feature |
| **JSON** | JavaScript Object Notation | Data Format |
| **JWT** | JSON Web Token | Security |
| **KPI** | Key Performance Indicator | Business |
| **KV** | Key-Value Store | Cloudflare |
| **LCP** | Largest Contentful Paint | Performance |
| **MFA** | Multi-Factor Authentication | Security |
| **MVP** | Minimum Viable Product | Product |
| **ORM** | Object-Relational Mapping | Database |
| **P95** | 95th Percentile | Performance |
| **PHI** | Protected Health Information | Compliance |
| **PR** | Pull Request | Development |
| **PWA** | Progressive Web App | Frontend |
| **R2** | Cloudflare R2 Storage | Cloudflare |
| **RBAC** | Role-Based Access Control | Security |
| **REST** | Representational State Transfer | API |
| **ROI** | Return on Investment | Business |
| **RPO** | Recovery Point Objective | Disaster Recovery |
| **RTO** | Recovery Time Objective | Disaster Recovery |
| **SLA** | Service Level Agreement | Business |
| **SMS** | Short Message Service | Notification |
| **SOP** | Standard Operating Procedure | Operations |
| **SQL** | Structured Query Language | Database |
| **SSR** | Server-Side Rendering | Frontend |
| **TLS** | Transport Layer Security | Security |
| **tRPC** | TypeScript Remote Procedure Call | API |
| **TTFB** | Time to First Byte | Performance |
| **TTI** | Time to Interactive | Performance |
| **UAT** | User Acceptance Testing | Testing |
| **UI** | User Interface | Frontend |
| **URL** | Uniform Resource Locator | Technical |
| **UX** | User Experience | Design |
| **VLC** | VideoLAN Client | IPTV |
| **WAF** | Web Application Firewall | Security |
| **WCAG** | Web Content Accessibility Guidelines | Accessibility |
| **WebSocket** | Web Socket Protocol | Real-time |
| **XML** | eXtensible Markup Language | Data Format |

## 8. Feature-Specific Terms

### 8.1 Queue Management

| Term | Definition |
|------|------------|
| **FIFO** | First-In-First-Out queue ordering principle |
| **Ticket Number** | Unique identifier for a queue entry (e.g., MED042) |
| **Department Prefix** | Letter code indicating department (MED, PED, CARD) |
| **Wait Time Calculation** | Algorithm to estimate patient wait time |
| **Queue Position** | Patient's current place in line |
| **Emergency Override** | Moving priority patients to front of queue |

### 8.2 Patient Portal

| Term | Definition |
|------|------------|
| **Patient ID** | Unique identifier for registered patients |
| **Default Password** | `#Limuru_Cottage_Hospital@2026` - initial login credential |
| **Password Reset** | Process to reset forgotten password to default |
| **Visit History** | Record of past medical visits |
| **Profile Management** | Patient ability to update personal information |
| **Queue Status** | Real-time view of patient's position |

### 8.3 IPTV Integration

| Term | Definition |
|------|------------|
| **M3U** | Playlist file format for IPTV streams |
| **Channel** | Specific TV station or stream |
| **Split Screen** | Display showing both queue info and TV |
| **Mute** | Automatic audio muting during announcements |
| **VLC** | Open-source media player used for streaming |

## 9. Role-Specific Terms

| Role | Description | Responsibilities |
|------|-------------|------------------|
| **Patient** | Person receiving medical care | Check in, wait, attend consultation |
| **Doctor** | Medical professional providing care | Call patients, record notes, diagnose |
| **Nurse** | Medical support staff | Triage, assist doctors, update records |
| **Receptionist** | Front desk staff | Register patients, manage queue |
| **Admin** | System administrator | Configure system, manage users, view analytics |
| **IT Support** | Technical support staff | Maintain system, troubleshoot issues |

## 10. Status Values

### 10.1 Patient Status

| Status | Definition | Next Possible Status |
|--------|------------|---------------------|
| `waiting` | Patient in queue awaiting call | called, no-show |
| `called` | Patient summoned to room | in-progress, no-show |
| `in-progress` | Patient currently with doctor | completed |
| `completed` | Visit finished | - |
| `no-show` | Patient didn't respond to call | - |

### 10.2 Doctor Status

| Status | Definition |
|--------|------------|
| `available` | Doctor ready to see patients |
| `busy` | Doctor currently in consultation |
| `break` | Doctor temporarily unavailable |
| `offline` | Doctor not logged in |

### 10.3 Queue Entry Status

| Status | Definition |
|--------|------------|
| `active` | Entry currently in queue |
| `called` | Patient called but not yet seen |
| `completed` | Visit finished |
| `transferred` | Moved to another department |
| `cancelled` | Patient left or cancelled |

## 11. Error Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `ERR_QUEUE_EMPTY` | Queue Empty | No patients in queue to call |
| `ERR_PATIENT_NOT_FOUND` | Patient Not Found | Patient ID doesn't exist |
| `ERR_DUPLICATE_ENTRY` | Duplicate Entry | Patient already in queue |
| `ERR_INVALID_STATUS` | Invalid Status | Status transition not allowed |
| `ERR_UNAUTHORIZED` | Unauthorized | User lacks required permission |
| `ERR_RATE_LIMIT` | Rate Limited | Too many requests |
| `ERR_VALIDATION` | Validation Error | Input data invalid |
| `ERR_DATABASE` | Database Error | Database operation failed |
| `ERR_IPTV_STREAM` | IPTV Stream Error | Failed to load IPTV stream |

## 12. Metric Names

| Metric | Definition | Target |
|--------|------------|--------|
| `queue.wait_time.avg` | Average patient wait time | < 15 minutes |
| `queue.length` | Current queue size | - |
| `queue.calls_per_hour` | Patients called per hour | > 10 |
| `queue.no_show_rate` | Percentage of no-shows | < 5% |
| `api.response_time` | API response time | < 200ms |
| `api.error_rate` | API error rate | < 1% |
| `patient.satisfaction` | Patient satisfaction score | > 4.5/5 |
| `doctor.utilization` | Doctor busy time percentage | > 70% |

## 13. External System References

| System | Description | Integration Point |
|--------|-------------|-------------------|
| **Resend** | Email service provider | Password reset emails |
| **Africa's Talking** | SMS service provider | Queue notifications |
| **VLC** | Media player | IPTV display |
| **GitHub Actions** | CI/CD platform | Automated deployments |
| **Cloudflare** | Edge platform | Hosting, Workers, D1 |

## 14. Version Naming

| Term | Format | Example |
|------|--------|---------|
| **Major Release** | vX.0.0 | v2.0.0 |
| **Minor Release** | vX.Y.0 | v1.5.0 |
| **Patch Release** | vX.Y.Z | v1.2.3 |
| **Release Candidate** | vX.Y.Z-rc.N | v1.2.0-rc.1 |
| **Beta** | vX.Y.Z-beta.N | v1.2.0-beta.1 |
| **Alpha** | vX.Y.Z-alpha.N | v1.2.0-alpha.1 |

## 15. Glossary Maintenance

### 15.1 Adding New Terms

When adding new terms to the glossary:
1. Ensure term is not already defined
2. Provide clear, concise definition
3. Include example usage
4. List related terms if applicable
5. Categorize appropriately
6. Update version history

### 15.2 Review Process

- Glossary reviewed quarterly
- New terms added as features evolve
- Obsolete terms archived
- Consistency checked across documentation

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-03 | System | Initial version |

**Review Date:** 2026-06-03
```

**File created successfully: `.opencode/context/project/06-glossary.md`**

Please confirm if I should proceed with the next file: `.opencode/context/project/07-roadmap.md`
