# Quick Reference Cards

## API Endpoints

### Authentication

```bash
# Staff Login
POST /api/auth/staff/login
Body: {"email": "...", "password": "..."}
Response: {"token": "...", "user": {...}}

# Patient Login  
POST /api/auth/patient/login
Body: {"identifier": "email/phone/number", "password": "..."}

# Logout
POST /api/auth/logout
Headers: Authorization: Bearer <token>
```

### Queue Operations

```bash
# Get Queue
GET /api/queue
GET /api/queue?departmentId=<uuid>
GET /api/queue?includeCompleted=true

# Create Ticket
POST /api/queue
Body: {"patientId": "...", "departmentId": "...", "priority": 1}
Priority: 1=Normal, 2=Priority, 3=Urgent, 4=Emergency

# Call Patient
POST /api/queue/call
Body: {"ticketId": "...", "roomAssigned": "201"}

# Complete Consultation
POST /api/queue/{ticketId}/complete

# Transfer Patient
POST /api/queue/{ticketId}/transfer
Body: {"newDepartmentId": "..."}
```

### Patients

```bash
# List Patients
GET /api/patients?page=1&pageSize=20
GET /api/patients?search=John

# Get Patient
GET /api/patients/{patientId}

# Register Patient
POST /api/patients
Body: {"name": "...", "phone": "...", "dateOfBirth": "..."}

# Update Patient
PUT /api/patients/{patientId}
Body: {...fields to update...}

# Patient History
GET /api/patients/{patientId}/history
```

### Appointments

```bash
# List Appointments
GET /api/appointments?date=2026-03-21
GET /api/appointments?doctorId=...
GET /api/appointments?status=scheduled

# Create Appointment
POST /api/appointments
Body: {"patientId": "...", "doctorId": "...", "appointmentDate": "...", "appointmentTime": "10:00"}

# Check In
POST /api/appointments/{appointmentId}/checkin
```

### Clinical Notes

```bash
# Get Notes
GET /api/notes/{queueId}

# Create Note (SOAP Format)
POST /api/notes/{queueId}
Body: {"subjective": "...", "objective": "...", "assessment": "...", "plan": "..."}
```

### Vitals

```bash
# Record Vitals
POST /api/vitals/{patientId}
Body: {"queueId": "...", "bloodPressureSystolic": 120, "bloodPressureDiastolic": 80, 
       "heartRate": 72, "temperature": 36.5, "oxygenSaturation": 98}
```

### Messages

```bash
# List Messages
GET /api/messages
GET /api/messages?unreadOnly=true

# Send Message
POST /api/messages
Body: {"recipientId": "...", "subject": "...", "content": "...", "priority": "normal"}

# Unread Count
GET /api/messages/unread/count
```

### Voice Calls (WebRTC)

```bash
# Initiate Call
POST /api/voice/call
Body: {"calleeId": "...", "priority": "normal"}

# Accept/Reject/End
POST /api/voice/call/{callId}/accept
POST /api/voice/call/{callId}/reject
POST /api/voice/call/{callId}/end

# Hold/Resume
POST /api/voice/call/{callId}/hold
POST /api/voice/call/{callId}/resume

# Call History
GET /api/voice/calls
GET /api/voice/calls/active
```

### Analytics

```bash
# Overview
GET /api/analytics/overview
GET /api/analytics/overview?date=2026-03-21

# Wait Times
GET /api/analytics/wait-times
GET /api/analytics/wait-times?departmentId=...

# Doctor Metrics
GET /api/analytics/doctors
```

### TV Display

```bash
# Get Display Data
GET /api/display/queue
GET /api/display/queue?departmentId=...
```

### Health Check

```bash
GET /api/health
Response: {"success": true, "data": {"status": "healthy", "version": "2.0.0"}}
```

---

## CLI Commands

### Wrangler (Cloudflare)

```bash
# Install
npm install -g wrangler

# Login
wrangler login

# Development
wrangler dev --persist              # Start with local DB
wrangler dev --env staging          # Specific environment

# Deploy
wrangler deploy                      # Deploy to production
wrangler deploy --env staging       # Deploy to staging

# Secrets
wrangler secret put <NAME>          # Set secret
wrangler secret list                # List secrets

# Database (D1)
wrangler d1 create <name>           # Create database
wrangler d1 migrations apply <name> # Run migrations
wrangler d1 migrations list <name>  # List migrations
wrangler d1 execute <name> --command "SQL"

# KV
wrangler kv:namespace create <name>
wrangler kv:key put <key> <value> --namespace-id=<id>

# R2
wrangler r2 bucket create <name>

# Logs
wrangler tail                        # Tail logs
wrangler tail --status error        # Error logs only

# Deployment
wrangler deployments list           # List deployments
wrangler deployments rollback <id>  # Rollback

# Verify
wrangler whoami                      # Check auth
```

### pnpm

```bash
# Install
npm install -g pnpm

# Commands
pnpm install                         # Install deps
pnpm dev                            # Start dev
pnpm build                          # Build all
pnpm test                           # Run tests
pnpm lint                           # Lint code
pnpm typecheck                      # Type check
pnpm format                         # Format code

# Filter by package
pnpm --filter @hospital-queue/api dev
pnpm --filter @hospital-queue/web build
```

### Docker

```bash
# Start services
docker-compose up -d
docker-compose up -d database

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Database access
docker-compose exec database psql -U postgres
```

---

## Environment Variables

### Required Variables

```bash
# Application
NODE_ENV=production
API_URL=https://api.limuruhospital.co.ke
WEB_URL=https://limuruhospital.co.ke

# Authentication (CRITICAL)
JWT_SECRET=<32+ char random string>
DEFAULT_PASSWORD=<initial password>
```

### Optional Variables

```bash
# Cloudflare
CLOUDFLARE_ACCOUNT_ID=<account-id>
CLOUDFLARE_API_TOKEN=<api-token>

# Twilio (SMS/WhatsApp)
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# WhatsApp
WHATSAPP_API_TOKEN=<token>
WHATSAPP_PHONE_NUMBER=+1XXXXXXXXXX

# HMS Integration
HMS_ADAPTER_TYPE=mock|openmrs|bahmni
OPENMRS_BASE_URL=<url>
OPENMRS_USERNAME=<user>
OPENMRS_PASSWORD=<pass>
```

### Wrangler Variables (wrangler.toml)

```toml
[vars]
ENVIRONMENT = "production"
API_VERSION = "v2"
JWT_SECRET = "CHANGE_IN_PRODUCTION"
DEFAULT_PASSWORD = "ChangeMe123!"
AI_PROVIDER = "ollama"
HMS_ADAPTER_TYPE = "mock"
```

---

## Common Errors

### Authentication Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Missing/invalid token | Include `Authorization: Bearer <token>` |
| 401 Invalid credentials | Wrong password | Reset password |
| 403 Forbidden | Insufficient role | Check user permissions |
| 429 Too Many Requests | Rate limit exceeded | Wait and retry |

### Database Errors

| Error | Cause | Solution |
|-------|-------|----------|
| D1_ERROR: no such table | Migration not run | `wrangler d1 migrations apply` |
| D1_ERROR: UNIQUE constraint | Duplicate entry | Check unique fields |
| D1_ERROR: FOREIGN KEY constraint | Invalid reference | Verify linked records |

### Queue Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Patient already in queue | Duplicate ticket | Check existing tickets |
| Department not found | Invalid departmentId | Verify department ID |
| No available position | Queue full | Wait for position or escalate |

### Deployment Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Missing binding | wrangler.toml incomplete | Add missing bindings |
| Secret not found | Secret not set | `wrangler secret put <name>` |
| Migrations failed | Schema conflict | Check migration order |

---

## Database Tables

### Core Tables

```sql
users            -- Staff accounts
patients         -- Patient records
departments      -- Hospital departments
queue            -- Queue tickets
appointments     -- Scheduled appointments
clinical_notes   -- Doctor's notes
vitals           -- Patient vitals
rooms            -- Hospital rooms
messages         -- Internal messages
audit_logs       -- Security audit trail
```

### Key Queries

```sql
-- Get queue with patient info
SELECT q.*, p.name, p.patient_number 
FROM queue q 
JOIN patients p ON q.patient_id = p.id 
WHERE q.status = 'waiting';

-- Active users count
SELECT COUNT(*) FROM users WHERE is_active = 1;

-- Department statistics
SELECT d.name, COUNT(q.id) as waiting 
FROM departments d 
LEFT JOIN queue q ON d.id = q.department_id AND q.status = 'waiting' 
GROUP BY d.id;

-- Today's appointments
SELECT * FROM appointments 
WHERE appointment_date = date('now');
```

---

## User Roles & Permissions

| Role | Code | Key Permissions |
|------|------|-----------------|
| Super Admin | `super_admin` | All system access |
| Admin | `admin` | User/dept management |
| Doctor | `doctor` | Queue, notes, appointments |
| Nurse | `nurse` | Triage, vitals |
| Receptionist | `receptionist` | Registration, tickets |
| Pharmacist | `pharmacist` | Prescription management |
| Lab Tech | `lab_tech` | Lab orders/results |
| Facility Manager | `facility_manager` | Rooms, equipment |
| IT Support | `it_support` | System administration |
| Patient | `patient` | Self-service portal |

---

## Localization Strings

### UI Strings (EN/SW)

```javascript
const translations = {
  en: {
    queue: {
      waiting: "Waiting",
      called: "Called",
      in_progress: "In Progress",
      completed: "Completed"
    },
    priority: {
      normal: "Normal",
      priority: "Priority",
      urgent: "Urgent",
      emergency: "Emergency"
    },
    common: {
      save: "Save",
      cancel: "Cancel",
      submit: "Submit",
      search: "Search",
      loading: "Loading..."
    }
  },
  sw: {
    queue: {
      waiting: "Inasubiri",
      called: "Imeitwa",
      in_progress: "Inaendelea",
      completed: "Imemalizika"
    },
    priority: {
      normal: "Kawaida",
      priority: "Kipaumbele",
      urgent: "Haraka",
      emergency: "Dharura"
    },
    common: {
      save: "Hifadhi",
      cancel: "Ghairi",
      submit: "Wasilisha",
      search: "Tafuta",
      loading: "Inapakia..."
    }
  }
};
```

---

## Department Codes

| Department | Code | Color |
|------------|------|-------|
| General Medicine | MED | #4CAF50 |
| Pediatrics | PED | #2196F3 |
| Gynecology | GYN | #E91E63 |
| Orthopedics | ORTHO | #FF9800 |
| Dental | DEN | #9C27B0 |
| Ophthalmology | OPH | #00BCD4 |
| Cardiology | CARD | #F44336 |
| Emergency | EMER | #F44336 |
