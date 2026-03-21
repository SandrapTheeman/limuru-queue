# Doctor User Guide

**Role:** Doctor  
**Last Updated:** March 2026

---

## 1. Overview

As a Doctor, you manage your patient consultations through the queue system, access patient records, and collaborate with other healthcare staff.

### Your Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│  DR. JOHN SMITH - General Medicine                             │
├────────────────────────────────────────────────────────────────┤
│  Your Queue (3 waiting)           Room: 201    Status: ● Avail │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ MED-015     │ │ MED-012     │ │ MED-008     │              │
│  │ Wait: 25m   │ │ Wait: 45m   │ │ Wait: 62m   │              │
│  │ [Call Next] │ │ [Call]      │ │ [Call]      │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
│                                                                │
│  Today's Summary          Upcoming Appointments                │
│  ┌──────────────┐        ┌──────────────────────┐             │
│  │ Seen: 12     │        │ 10:00 - Jane Doe     │             │
│  │ Avg: 18min   │        │ 11:30 - John Kiprono │             │
│  │ Wait: 3      │        │ 14:00 - Mary Wanjiku │             │
│  └──────────────┘        └──────────────────────┘             │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Accessing Your Dashboard

```bash
URL: https://limuruhospital.co.ke/dashboard/doctor
```

### Status Options

| Status | Meaning | Availability |
|--------|---------|---------------|
| Available | Ready for patients | Yes |
| In Consultation | With current patient | No |
| On Break | Temporary break | No |
| Off Duty | End of shift | No |

---

## 3. Managing Your Queue

### 3.1 View Your Queue

The queue shows patients assigned to you or waiting for General Medicine.

```markdown
Queue Columns:
- Ticket Number (e.g., MED-015)
- Patient Number (privacy - not name)
- Wait Time (minutes)
- Priority Level
- Status (waiting/called/in_progress)
```

### 3.2 Call a Patient

1. Find patient in queue
2. Click **Call** button
3. System will:
   - Update status to "Called"
   - Show room assignment
   - Notify patient (if SMS enabled)

```markdown
Quick Call Flow:
1. Click [Call] on patient card
2. Confirm room number
3. Patient receives notification
4. Queue updates on all screens
```

### 3.3 Start Consultation

1. When patient arrives
2. Click **Start** on their ticket
3. Timer begins automatically
4. Queue status changes to "In Progress"

### 3.4 Complete Consultation

1. Click **Complete** when done
2. Fill in clinical notes (SOAP format)
3. Optionally:
   - Add diagnosis
   - Write prescription
   - Schedule follow-up
   - Transfer to another department
4. Patient removed from active queue

---

## 4. Clinical Documentation

### 4.1 SOAP Notes

Navigate to: **Consultation → Clinical Notes**

```markdown
SOAP Format:
┌─────────────────────────────────────────────────────────┐
│ SUBJECTIVE (Patient's symptoms)                        │
│ What the patient tells you about their condition       │
│ [Type or dictate notes here...]                        │
├─────────────────────────────────────────────────────────┤
│ OBJECTIVE (Clinical findings)                          │
│ Your observations, vitals, exam findings                │
│ [Vitals: BP, HR, Temp, etc.]                           │
├─────────────────────────────────────────────────────────┤
│ ASSESSMENT (Diagnosis)                                 │
│ Your clinical assessment                               │
│ [Diagnosis/differential diagnosis]                    │
├─────────────────────────────────────────────────────────┤
│ PLAN (Treatment plan)                                  │
│ Next steps, prescriptions, follow-up                    │
│ [Medications, procedures, referrals]                    │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Quick Notes Entry

For quick entries, use the simplified form:

```markdown
Diagnosis: [Type diagnosis]
Symptoms: [Brief description]
Prescription: [Medications prescribed]
Follow-up: [ ] Required - Date: [Date picker]
Notes: [Additional comments]
```

### 4.3 Vitals Recording

1. Click **Record Vitals** on patient card
2. Enter measurements:

| Field | Range | Unit |
|-------|-------|------|
| Blood Pressure (Systolic) | 60-250 | mmHg |
| Blood Pressure (Diastolic) | 40-150 | mmHg |
| Heart Rate | 30-220 | BPM |
| Temperature | 35-42 | °C |
| Respiratory Rate | 8-40 | /min |
| Oxygen Saturation | 70-100 | % |
| Weight | 0.5-500 | kg |
| Height | 20-250 | cm |

3. Click **Save Vitals**

---

## 5. Appointments

### 5.1 View Appointments

Navigate to: **Appointments → My Schedule**

```markdown
Today's Schedule:
┌─────────────────────────────────────────────┐
│ 10:00  Jane Doe         [Confirmed] ▶ View  │
│ 11:30  John Kiprono     [Scheduled] ▶ View  │
│ 14:00  Mary Wanjiku     [Scheduled] ▶ View  │
│ 15:30  Peter Kamau      [Scheduled] ▶ View  │
└─────────────────────────────────────────────┘
```

### 5.2 Manage Appointment

1. Click on appointment
2. Options:
   - **View Details** - See patient info
   - **Reschedule** - Change date/time
   - **Cancel** - Cancel appointment
   - **Check In** - Mark patient arrived

### 5.3 Create Appointment

1. Click **+ New Appointment**
2. Fill details:

```markdown
Patient: [Search by name/number]
Date: [Date picker]
Time: [Time picker]
Duration: [15/30/45/60 minutes]
Notes: [Reason for visit]
```

---

## 6. Patient Search

### 6.1 Search Patient

Navigate to: **Patients → Search**

```markdown
Search by:
- Patient Number (e.g., LCH-2024-0001)
- Name
- Phone Number
- National ID
```

### 6.2 View Patient History

1. Search and select patient
2. Click **View History**
3. See:
   - Past visits
   - Diagnoses
   - Prescriptions
   - Lab results

---

## 7. Communication

### 7.1 Send Message to Staff

1. Click **Messages** in sidebar
2. Click **+ New Message**
3. Select recipient:
   - Individual staff
   - Department
   - All staff
4. Compose message
5. Set priority (normal/urgent)
6. Click **Send**

### 7.2 Voice Calls

To call another staff member:

1. Click **Calls** in sidebar
2. Click **+ New Call**
3. Select colleague
4. Set priority (if urgent)
5. Click **Call**

---

## 8. Transfer Patient

To transfer to another department:

1. Open patient ticket
2. Click **Transfer**
3. Select new department
4. Add reason (optional)
5. Confirm transfer

Patient will appear in the new department's queue.

---

## 9. Your Statistics

Navigate to: **My Stats**

```markdown
Today's Performance:
- Patients Seen: 12
- Average Consultation: 18 minutes
- Average Wait Time: 25 minutes
- Completion Rate: 100%

This Week:
- Total Patients: 67
- Avg Daily: 13.4
- Follow-ups: 8
```

---

## 10. Settings

### 10.1 Availability

Set your availability status:

```markdown
Status Options:
● Available - Ready for patients
○ In Consultation - With patient
○ On Break - Temporary (set duration)
○ Off Duty - End of day
```

### 10.2 Notifications

Configure your alerts:

```markdown
☐ Play sound for new patients
☐ Show desktop notifications
☐ Receive urgent messages only
☐ SMS alerts for appointments
```

---

## 11. Quick Reference

| Action | How |
|--------|-----|
| Call patient | Click **Call** on queue card |
| Start consultation | Click **Start** |
| Complete consultation | Click **Complete** + notes |
| Record vitals | Click **Record Vitals** |
| Add clinical note | Click **Clinical Notes** |
| Search patient | Use search bar |
| Transfer patient | Click **Transfer** |
| Message colleague | Click **Messages** |

---

## 12. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `C` | Call next patient |
| `S` | Start consultation |
| `X` | Complete and close |
| `N` | New clinical note |
| `V` | Record vitals |
| `A` | Open appointments |
| `M` | Open messages |
| `Esc` | Cancel current action |

---

## 13. Support

For technical issues:
- IT Support: it-support@limuruhospital.co.ke
- Emergency: +254-XXX-XXXX
