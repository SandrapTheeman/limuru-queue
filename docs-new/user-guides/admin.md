# Admin User Guide

**Role:** Admin  
**System Access Level:** Hospital facility administration  
**Last Updated:** March 2026

---

## 1. Overview

As an Admin, you manage the day-to-day operations of the hospital queue system, including user management, department configuration, and system monitoring.

### Your Capabilities

| Feature | Access Level |
|---------|--------------|
| User Management | Create, update, deactivate users |
| Department Management | Full configuration |
| System Settings | Facility-level settings |
| Analytics | Facility-wide reports |
| Queue Monitoring | Real-time oversight |
| Audit Logs | Facility-level |

---

## 2. Accessing the System

```bash
URL: https://limuruhospital.co.ke/login
Email: admin@limuruhospital.co.ke
Password: [Your secure password]
```

---

## 3. Admin Dashboard

### Main Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│  ADMIN DASHBOARD - Limuru Cottage Hospital                     │
├────────────────────────────────────────────────────────────────┤
│  Today's Overview (March 21, 2026)                              │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                │
│  │ 142    │  │   23   │  │   89   │  │  18m   │                │
│  │Patients│  │Waiting │  │Complete│  │Avg Wait│                │
│  └────────┘  └────────┘  └────────┘  └────────┘                │
│                                                                │
│  ┌─────────────────────┐  ┌─────────────────────┐            │
│  │ QUEUE BY DEPARTMENT │  │ RECENT ACTIVITY      │            │
│  │ ▓▓▓▓▓░ General: 12  │  │ • John called MED-5 │            │
│  │ ▓▓░░░░ Peds: 4      │  │ • Mary registered    │            │
│  │ ▓▓░░░░ Gyn: 3       │  │ • App't confirmed    │            │
│  └─────────────────────┘  └─────────────────────┘            │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. User Management

### 4.1 View Users

Navigate to: **Management → Users**

```markdown
Columns: Name | Email | Role | Department | Status | Actions
```

### 4.2 Create New Staff User

1. Click **+ Add User**
2. Complete the form:

```markdown
Personal Details:
- Full Name: John Smith
- Email: jsmith@limuruhospital.co.ke
- Phone: +254712345678

Role Assignment:
- Role: [Nurse ▼]
- Department: General Medicine
- Room: Room 201

Access Settings:
☐ Send welcome email
☐ Require password change on first login
```

3. Click **Create**
4. User receives login credentials

### 4.3 User Roles Reference

| Role | Can Do |
|------|--------|
| Doctor | Queue management, clinical notes, appointments |
| Nurse | Triage, vitals, queue assistance |
| Receptionist | Patient registration, ticket issuance |
| Pharmacist | Prescription viewing, medication dispensing |
| Lab Tech | Lab orders, results |
| Facility Manager | Room management, resources |
| IT Support | System troubleshooting, maintenance |

### 4.4 Deactivate User

1. Find user in list
2. Click **Actions → Deactivate**
3. Confirm deactivation
4. User loses access immediately

---

## 5. Department Management

### 5.1 View Departments

Navigate to: **Management → Departments**

| Department | Code | Waiting | Called | Status |
|------------|------|---------|--------|--------|
| General Medicine | MED | 12 | 3 | Active |
| Pediatrics | PED | 4 | 1 | Active |
| Gynecology | GYN | 3 | 2 | Active |
| Emergency | EMER | 2 | 1 | Active |

### 5.2 Create Department

1. Click **+ Add Department**
2. Enter details:

```markdown
Department Name: [e.g., Orthopedics]
Department Code: [3-5 letters, e.g., ORTH]
Description: [Brief description]
Color: [#FF5733] (for visual identification)
Icon: [Select icon]

Settings:
- Average consultation time: [15] minutes
- Default priority: [Normal ▼]
- Auto-assign doctor: [Yes/No]
```

3. Click **Create Department**

### 5.3 Configure Department

1. Select department
2. Click **Settings**
3. Configure:

```markdown
Queue Settings:
- Max queue size: [50] patients
- Priority handling: [Enabled]
- Estimated wait multiplier: [1.2]

Staff Assignment:
- Assigned doctors: [Select multiple]
- Assigned nurses: [Select multiple]
- Department receptionist: [Select]

Notifications:
- Enable SMS alerts: [Yes/No]
- WhatsApp notifications: [Yes/No]
```

---

## 6. System Settings

### 6.1 General Settings

Navigate to: **Settings → General**

```markdown
Clinic Information:
- Clinic Name: Limuru Cottage Hospital
- Address: P.O. Box XXX, Limuru
- Phone: +254-XX-XXXXXXX
- Email: info@limuruhospital.co.ke

Operating Hours:
- Monday-Friday: 08:00 - 17:00
- Saturday: 08:00 - 13:00
- Sunday: Closed

Queue Settings:
- Average time per patient: 15 minutes
- Priority queue enabled: Yes
- Number prefix: [DEPT CODE]
```

### 6.2 Notification Settings

Navigate to: **Settings → Notifications**

```markdown
SMS Settings (Twilio):
- Provider: Twilio
- Account SID: [Configured]
- Status: Connected ✓

WhatsApp Settings:
- Business Account: [Configured]
- Template Messages: Enabled

Notification Triggers:
☐ Patient called (SMS)
☐ Patient called (WhatsApp)
☐ Appointment reminder (1 hour before)
☐ Queue status updates
☐ Emergency alerts
```

### 6.3 Display Settings

Navigate to: **Settings → TV Display**

```markdown
TV Display Configuration:
- Hospital name: Limuru Cottage Hospital
- Logo URL: [Upload]
- Accent color: [#2196F3]

Content Settings:
☐ Show patient numbers
☐ Show wait times
☐ Show department names
☐ Enable announcements

Layout:
○ Modern (cards)
○ Classic (list)
○ Compact (minimal)
```

---

## 7. Analytics & Reports

### 7.1 Dashboard Analytics

Navigate to: **Analytics → Dashboard**

| Metric | Today | Yesterday | Change |
|--------|-------|-----------|--------|
| Total Patients | 142 | 138 | +2.9% |
| Avg Wait Time | 18m | 22m | -18% |
| Completion Rate | 89% | 85% | +4.7% |
| No-show Rate | 5% | 7% | -28% |

### 7.2 Generate Reports

1. Go to **Analytics → Reports**
2. Select report type:
   - Daily Summary
   - Wait Time Analysis
   - Staff Performance
   - Patient Volume
3. Set date range
4. Click **Generate**

### 7.3 Scheduled Reports

1. Go to **Analytics → Schedules**
2. Click **+ New Schedule**
3. Configure delivery:
   ```markdown
   Report: Daily Summary
   Frequency: Daily at 18:00
   Format: PDF
   Recipients: admin@limuruhospital.co.ke
   ```

---

## 8. Monitoring & Logs

### 8.1 Real-time Queue Monitor

Navigate to: **Monitor → Queue**

Shows live queue status across all departments with:
- Current wait times
- Active patients
- Staff activity
- System alerts

### 8.2 Audit Logs

Navigate to: **Logs → Audit Trail**

```markdown
Filter Options:
- Date: [Range selector]
- User: [Dropdown]
- Action: [Create/Update/Delete/View]
- Entity: [Patient/User/Queue/Settings]

Log Entry Example:
[Mar 21, 2026 14:32:15] 
User: reception@limuruhospital.co.ke
Action: PATIENT_CREATE
Entity: Patient #LCH-2026-0142
IP: 192.168.1.45
```

---

## 9. Maintenance Tasks

### 9.1 Data Export

1. Go to **Tools → Export Data**
2. Select data type:
   - Patients
   - Queue History
   - Appointments
   - Clinical Notes
3. Set date range
4. Choose format (CSV/Excel)
5. Click **Export**

### 9.2 System Health Check

Navigate to: **Settings → System → Health**

```markdown
Components:
✓ API Server: Healthy
✓ Database: Connected
✓ Cache: Active
✓ Notifications: Configured
✓ Backup: Last 2 hours ago

Actions:
[View Full Logs]  [Clear Cache]  [Test Notifications]
```

---

## 10. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| User can't login | Check status, reset password |
| Department not showing | Verify active status |
| SMS not sending | Check Twilio configuration |
| Slow dashboard | Clear browser cache |

### Support Contact

```bash
IT Support: it-support@limuruhospital.co.ke
Emergency: +254-XXX-XXXX
```

---

## 11. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + U` | Open users |
| `Ctrl + D` | Open departments |
| `Ctrl + A` | Open analytics |
| `Ctrl + R` | Generate report |
| `Ctrl + S` | Open settings |
