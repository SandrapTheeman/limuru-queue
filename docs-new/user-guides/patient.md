# Patient User Guide

**Role:** Patient  
**Last Updated:** March 2026

---

## 1. Overview

Welcome to the Limuru Cottage Hospital Patient Portal. This guide helps you navigate the system to check your queue status, book appointments, and access your health information.

### Patient Portal Features

| Feature | Description |
|---------|-------------|
| Queue Status | View your current position in queue |
| Appointments | Book and manage appointments |
| Visit History | View past visits and records |
| Notifications | Receive updates via SMS/WhatsApp |

---

## 2. Accessing the Portal

### 2.1 Login Options

**Option 1: Email/Password**
```bash
URL: https://limuruhospital.co.ke/login/patient
Email: your.email@example.com
Password: [Your password]
```

**Option 2: Patient Number + PIN**
```bash
Patient Number: LCH-2026-0142
PIN: [4-digit PIN]
```

### 2.2 First-time Login

1. You received a patient number during registration
2. Initial password/PIN was provided
3. You will be prompted to change your password
4. Set a secure password (minimum 8 characters)

---

## 3. Dashboard Overview

```
┌────────────────────────────────────────────────────────────────┐
│  PATIENT PORTAL                                               │
│  Welcome, John Doe                                             │
│  Patient #: LCH-2026-0142                                     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │   QUEUE STATUS       │  │  APPOINTMENTS        │         │
│  │                      │  │                      │         │
│  │  Current: MED-015    │  │  Upcoming: 1         │         │
│  │  Position: #3        │  │  Next: Mar 25, 10 AM │         │
│  │  Wait: ~25 min       │  │  Dr. Smith           │         │
│  │                      │  │                      │         │
│  │  [Refresh]          │  │  [View All]          │         │
│  └──────────────────────┘  └──────────────────────┘         │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  QUICK ACTIONS                                        │     │
│  │  [Book Appointment]  [View History]  [Give Feedback] │     │
│  └──────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. Queue Status

### 4.1 View Your Queue Status

Navigate to: **Queue → My Status**

```markdown
┌─────────────────────────────────────────────────────────────┐
│  YOUR QUEUE STATUS                                          │
├─────────────────────────────────────────────────────────────┤
│  Ticket Number: MED-015                                     │
│  Department: General Medicine                               │
│  Status: WAITING                                           │
│                                                             │
│  Your Position: #3                                          │
│  Patients Ahead: 2                                          │
│  Estimated Wait: ~25 minutes                                │
│                                                             │
│  Room Assigned: (Not yet)                                   │
│  Called At: (Not yet)                                       │
│                                                             │
│  Last Updated: 10:45 AM                                     │
│  [Refresh Status]                                          │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Queue Status Types

| Status | Meaning |
|--------|---------|
| Waiting | You are in the queue |
| Called | Your number has been called |
| In Progress | You are with the doctor |
| Completed | Consultation finished |
| No Show | You missed your turn |

### 4.3 Notifications

Receive updates when:
- Your position changes
- Your number is called
- Estimated wait time updates

---

## 5. Appointments

### 5.1 Book New Appointment

1. Click **Book Appointment**
2. Select department:

```markdown
Select Department:
┌─────────────────────────────────────────┐
│ ○ General Medicine                       │
│ ○ Pediatrics                            │
│ ○ Gynecology                            │
│ ○ Dental                                │
│ ○ Orthopedics                           │
│ ○ Eye Care                              │
└─────────────────────────────────────────┘
```

3. Select doctor (optional):

```markdown
Preferred Doctor:
┌─────────────────────────────────────────┐
│ ○ Any available doctor                 │
│ ○ Dr. John Smith (Available)            │
│ ○ Dr. Jane Doe (Available)              │
│ ○ Dr. Peter Kimani (Available)          │
└─────────────────────────────────────────┘
```

4. Select date and time:

```markdown
Select Date: [March 25, 2026]
Available Slots:
┌─────────────────────────────────────────┐
│ ○ 09:00 AM                              │
│ ○ 10:00 AM                              │
│ ○ 11:30 AM                              │
│ ○ 02:00 PM                              │
│ ○ 03:30 PM                              │
└─────────────────────────────────────────┘
```

5. Add reason for visit
6. Click **Confirm Booking**
7. Confirmation shown

### 5.2 View Appointments

Navigate to: **Appointments → My Appointments**

```markdown
Upcoming Appointments:
┌───────────────────────────────────────────────────────┐
│ Mar 25, 2026  10:00 AM  General Medicine  Dr. Smith │
│ [View] [Reschedule] [Cancel]                         │
├───────────────────────────────────────────────────────┤
│ Mar 28, 2026  02:00 PM  Dental  Dr. Kamau           │
│ [View] [Reschedule] [Cancel]                         │
└───────────────────────────────────────────────────────┘

Past Appointments:
┌───────────────────────────────────────────────────────┐
│ Mar 15, 2026  11:00 AM  General Medicine  Dr. Smith │
│ Status: Completed                                    │
└───────────────────────────────────────────────────────┘
```

### 5.3 Reschedule Appointment

1. Click **Reschedule** on appointment
2. Select new date
3. Select new time
4. Click **Confirm Reschedule**

### 5.4 Cancel Appointment

1. Click **Cancel** on appointment
2. Select reason:
   - Feeling better
   - Schedule conflict
   - Other
3. Confirm cancellation

---

## 6. Visit History

### 6.1 View Past Visits

Navigate to: **Records → Visit History**

```markdown
Visit History:

Mar 15, 2026
Department: General Medicine
Doctor: Dr. John Smith
Diagnosis: Upper respiratory infection
Status: Completed

Mar 1, 2026
Department: Dental
Doctor: Dr. Jane Doe
Diagnosis: Routine checkup
Status: Completed

[Download Records]
```

### 6.2 View Prescription History

Navigate to: **Records → Prescriptions**

Shows all past prescriptions and medications.

### 6.3 Download Records

1. Go to **Records**
2. Select date range
3. Click **Download PDF**
4. Save to device

---

## 7. Profile Management

### 7.1 Update Personal Information

Navigate to: **Profile → Edit**

```markdown
Update Information:
- Phone Number: +254712345678
- Email: your.email@example.com
- Address: [Your address]
- Emergency Contact: [Name, Phone]

[Save Changes]
```

### 7.2 Change Password

1. Go to **Profile → Security**
2. Click **Change Password**
3. Enter current password
4. Enter new password
5. Confirm new password
6. Click **Update Password**

### 7.3 Notification Preferences

Navigate to: **Profile → Notifications**

```markdown
Notification Preferences:
☐ SMS for queue updates
☐ SMS for appointment reminders
☐ WhatsApp notifications
☐ Email for important updates

Reminder Timing:
○ 30 minutes before appointment
○ 1 hour before appointment
● 2 hours before appointment
```

---

## 8. Feedback

### 8.1 Give Feedback

1. Click **Give Feedback**
2. Select visit
3. Rate experience:
   - Overall: ★★★★☆ (4/5)
   - Wait Time: ★★★☆☆ (3/5)
   - Staff: ★★★★★ (5/5)
   - Facility: ★★★★☆ (4/5)
4. Add comments
5. Click **Submit Feedback**

### 8.2 Feedback Topics

```markdown
We value your feedback on:
- Wait time experience
- Staff interaction
- Facility cleanliness
- Overall satisfaction
- Suggestions for improvement
```

---

## 9. Kiosk Mode

### 9.1 Self-Service Kiosk

If you're at the hospital:

1. Go to the kiosk terminal
2. Select language (English/Swahili)
3. Enter your patient number or scan ID
4. Enter your PIN
5. View your queue status
6. Update contact information
7. Check in for appointment

### 9.2 Queue Display

Hospital TV displays show:
- Current called numbers
- Waiting list
- Department information

Look for your number to be called!

---

## 10. Help & Support

### 10.1 Common Questions

**Q: How do I find my patient number?**
A: Check your registration receipt or SMS welcome message.

**Q: What if I forget my PIN?**
A: Visit reception or call +254-XXX-XXXX.

**Q: Can I change my appointment?**
A: Yes, up to 2 hours before scheduled time.

**Q: How will I know when it's my turn?**
A: You'll receive an SMS/WhatsApp notification, and your number will show on the TV display.

### 10.2 Contact Information

```markdown
Patient Support:
Phone: +254-XXX-XXXX
Email: patients@limuruhospital.co.ke
WhatsApp: +254-XXX-XXXX
Hours: Mon-Fri 8AM-5PM, Sat 8AM-1PM
```

---

## 11. Quick Reference

| Task | How |
|------|-----|
| Check queue status | Dashboard or Queue menu |
| Book appointment | Appointments → Book New |
| Reschedule | Appointments → Reschedule |
| View history | Records → Visit History |
| Update profile | Profile → Edit |
| Change password | Profile → Security |

---

## 12. Swahili Translations

| English | Swahili |
|---------|---------|
| Queue Status | Hali ya foleni |
| Waiting | Inasubiri |
| Called | Imeitwa |
| Appointment | Termini |
| Doctor | Daktari |
| Patient | Mgonjwa |
| Queue Number | Nambari ya foleni |
| Book | Panga |
| Cancel | Ghairi |
| Complete | Kamili |
