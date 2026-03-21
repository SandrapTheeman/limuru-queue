# Receptionist User Guide

**Role:** Receptionist  
**Last Updated:** March 2026

---

## 1. Overview

As a Receptionist, you are the first point of contact for patients. You handle patient registration, ticket issuance, and general inquiries.

### Your Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│  RECEPTION - Main Desk                                         │
├────────────────────────────────────────────────────────────────┤
│  Queue Overview                        Quick Actions           │
│  ┌────────────────────────┐          ┌──────────────────────┐ │
│  │ General: 12 waiting    │          │ [+ New Patient]      │ │
│  │ Pediatrics: 4 waiting  │          │ [+ Issue Ticket]     │ │
│  │ Emergency: 2 waiting   │          │ [+ Appointment]      │ │
│  │ Total: 18              │          │ [Search Patient]     │ │
│  └────────────────────────┘          └──────────────────────┘ │
│                                                                │
│  Today's Statistics                                            │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐              │
│  │ 45     │  │ 38     │  │ 7      │  │ 15m    │              │
│  │Total   │  │Tickets │  │Appoint │  │Avg Wait│              │
│  └────────┘  └────────┘  └────────┘  └────────┘              │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Accessing the System

```bash
URL: https://limuruhospital.co.ke/dashboard/receptionist
```

---

## 3. Patient Registration

### 3.1 Register New Patient

1. Click **+ New Patient**
2. Complete registration form:

```markdown
┌─────────────────────────────────────────────────────────────┐
│ NEW PATIENT REGISTRATION                                   │
├─────────────────────────────────────────────────────────────┤
│ Personal Information                                       │
│ Full Name: [Required]                                       │
│ Date of Birth: [Date picker]                               │
│ Gender: [Male / Female / Other]                            │
│ Phone: +254[___][Required]                                  │
│ Email: [Optional]                                           │
│ Address: [Optional]                                         │
│                                                             │
│ Identification                                               │
│ National ID: [Optional]                                     │
│                                                             │
│ Emergency Contact                                           │
│ Name: [Optional]                                            │
│ Phone: [Optional]                                           │
│                                                             │
│ Insurance (Optional)                                        │
│ Provider: [Dropdown or N/A]                                │
│ Policy Number: [If insured]                                 │
│                                                             │
│ Medical Information (Optional)                               │
│ Blood Type: [Select]                                       │
│ Allergies: [Text]                                           │
│ Chronic Conditions: [Text]                                  │
│                                                             │
│ Language Preference: [English ▼ / Swahili]                  │
└─────────────────────────────────────────────────────────────┘
```

3. Click **Register**
4. System generates patient number (e.g., LCH-2026-0142)

### 3.2 Patient Number Format

```
LCH-YYYY-####
│││  │   │
│││  │   └── Sequential number
│││  └────── Year
││└───────── Hospital code
└──────────── Hospital prefix
```

---

## 4. Ticket Issuance

### 4.1 Issue New Ticket

1. Search for patient (or register new)
2. Click **Issue Ticket**
3. Select department:

```markdown
Select Department:
┌─────────────────────────────────────────┐
│ ○ General Medicine (MED)    Wait: 12   │
│ ○ Pediatrics (PED)           Wait: 4    │
│ ○ Gynecology (GYN)          Wait: 3    │
│ ○ Orthopedics (ORTH)        Wait: 2    │
│ ○ Dental (DEN)              Wait: 5    │
│ ○ Emergency (EMER)          Wait: 2    │
└─────────────────────────────────────────┘

Priority Level:
○ Normal (1)
● Priority (2) - With appointment, special needs
○ Urgent (3) - Nurse recommendation
○ Emergency (4) - Immediate attention
```

4. Optional: Add complaint description
5. Click **Issue Ticket**
6. Give ticket number to patient

### 4.2 Ticket Display

```
┌───────────────────────────────────────┐
│          LIMURU COTTAGE HOSPITAL      │
│                                       │
│         YOUR TICKET NUMBER            │
│                                       │
│              MED-015                  │
│                                       │
│   Department: General Medicine        │
│   Priority: Normal                    │
│                                       │
│   Please wait. You will be           │
│   notified when it's your turn.       │
│                                       │
│   Estimated Wait: ~25 minutes        │
└───────────────────────────────────────┘
```

### 4.3 Priority Ticket

For patients with special priority:

1. Select priority level 2, 3, or 4
2. Add reason:
   - Has appointment
   - Elderly (65+)
   - Pregnant
   - Disability
   - Medical referral

---

## 5. Patient Lookup

### 5.1 Search Patient

Use any of these:

```markdown
Search by:
- Patient Number: LCH-2026-0142
- Name: John Doe
- Phone: +254712345678
- National ID: 12345678
```

### 5.2 View Patient Details

Click on patient to see:

- Contact information
- Visit history
- Current queue status
- Upcoming appointments

---

## 6. Appointments

### 6.1 Book Appointment

1. Search for patient
2. Click **Book Appointment**
3. Fill details:

```markdown
Appointment Details:
Patient: John Doe (LCH-2026-0142)
Department: [Select ▼]
Doctor: [Select ▼] (optional)
Date: [Date picker]
Time: [Time picker]
Duration: [15/30/45/60] minutes
Reason: [Text field]
```

4. Click **Book Appointment**
5. Confirmation shown

### 6.2 Check In Appointment

1. Search for patient
2. Find their appointment
3. Click **Check In**
4. Optionally issue queue ticket

### 6.3 View Today's Appointments

Shows all appointments for today with:
- Time
- Patient name
- Department
- Status (Scheduled/Checked-in/Completed/Cancelled)

---

## 7. Queue Information

### 7.1 View Queue Status

Navigate to: **Queue → Overview**

```markdown
Department        Waiting    Called    Avg Wait
────────────────────────────────────────────────
General           12         3         25 min
Pediatrics        4          1         15 min
Gynecology         3         2         30 min
Emergency          2         1         5 min
────────────────────────────────────────────────
Total             21         7         20 min
```

### 7.2 Call Patient (if authorized)

1. Find patient in queue
2. Click **Call**
3. Confirm room number
4. Patient notified

---

## 8. Messages

### 8.1 Receive Messages

View messages from doctors or other staff:

```markdown
From: Dr. Smith
Time: 10:30 AM
Patient: LCH-2026-0142 (in lobby)
Topic: Appointment confirmation
───────────────────────────────────
Please confirm appointment for 2 PM today.
```

### 8.2 Send Message

1. Click **Messages**
2. Click **+ New**
3. Select recipient (staff member or department)
4. Compose and send

---

## 9. Common Tasks

### 9.1 Reprint Ticket

If patient loses ticket:
1. Search patient
2. Click **Reprint Ticket**
3. New ticket issued with same number

### 9.2 Cancel Ticket

If patient leaves:
1. Find ticket in queue
2. Click **Cancel**
3. Select reason
4. Confirm

### 9.3 Update Patient Info

1. Search patient
2. Click **Edit**
3. Update fields
4. Click **Save**

---

## 10. Patient Communication

### 10.1 Inform Patient

When talking to patients:

```markdown
Common Responses:

"Your number is MED-015. The estimated wait is 
about 25 minutes. Please have a seat."

"Your appointment with Dr. Smith is at 2 PM. 
Please come back at 1:45 PM to check in."

"Your lab results are ready. The doctor will 
review them with you today."
```

### 10.2 Handle Complaints

```markdown
If patient complains about wait time:
1. Acknowledge their concern
2. Check current queue status
3. Explain any delays
4. Offer estimate update
5. Escalate to supervisor if needed
```

---

## 11. Shift Handover

### 11.1 End of Shift Checklist

```markdown
□ Hand over current queue status
□ Note any pending tasks
□ Transfer messages
□ Update notes for next shift
□ Log out of system
```

### 11.2 Handover Report

```markdown
Shift Summary:
Start: 08:00 AM
End: 04:00 PM
Patients Registered: 25
Tickets Issued: 45
Appointments Booked: 12

Pending Items:
- Follow up with patient LCH-2026-0155
- Dr. Smith requested callback

Notes:
- Heavy volume 10-12 AM
- Staff meeting at 2 PM
```

---

## 12. Quick Reference

| Task | Steps |
|------|-------|
| New patient | + New Patient → Fill form → Register |
| Issue ticket | Search patient → Issue Ticket → Select dept → Confirm |
| Book appointment | Search patient → Book Appointment → Fill details |
| Search patient | Use search bar with number/name/phone |
| Reprint ticket | Search patient → Reprint Ticket |
| Cancel ticket | Find ticket → Cancel → Reason → Confirm |

---

## 13. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `N` | New patient registration |
| `T` | Issue ticket |
| `A` | Book appointment |
| `S` | Search patient |
| `M` | View messages |
| `Q` | View queue |

---

## 14. Support

- IT Support: it-support@limuruhospital.co.ke
- Supervisor: [Your supervisor contact]
