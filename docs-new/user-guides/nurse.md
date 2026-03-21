# Nurse User Guide

**Role:** Nurse  
**Last Updated:** March 2026

---

## 1. Overview

As a Nurse, you play a critical role in patient care, performing triage, recording vitals, and assisting with queue management.

### Your Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│  NURSE SARAH KIMANI - Triage Station                           │
├────────────────────────────────────────────────────────────────┤
│  Current Patient: [None]    Status: ● Ready                   │
│                                                                │
│  Triage Queue (5 waiting)                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ MED-010  │ │ MED-008  │ │ EMER-02  │ │ MED-005  │         │
│  │ Routine  │ │ Priority │ │ Urgent   │ │ Routine  │         │
│  │ [Triage] │ │ [Triage] │ │ [Triage] │ │ [Triage] │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│                                                                │
│  Recent Vitals Recorded          Messages (2 unread)          │
│  ┌────────────────────┐          ┌────────────────────┐       │
│  │ MED-012: BP 120/80 │          │ Dr. Smith: Lab req │       │
│  │ MED-008: BP 140/90 │          │ Reception: Patient │       │
│  └────────────────────┘          └────────────────────┘       │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Accessing the System

```bash
URL: https://limuruhospital.co.ke/dashboard/nurse
```

---

## 3. Patient Triage

### 3.1 Start Triage

1. Select patient from queue
2. Click **Start Triage**
3. Record patient information:
   - Chief complaint
   - Pain level (1-10)
   - Visible symptoms
   - Medical history

### 3.2 Triage Priority Levels

| Level | Color | Description | Response Time |
|-------|-------|-------------|---------------|
| Emergency | Red | Life-threatening | Immediate |
| Urgent | Orange | Serious condition | Within 30 min |
| Priority | Yellow | Moderate condition | Within 1 hour |
| Routine | Green | Minor condition | Standard wait |

### 3.3 Triage Form

```markdown
Chief Complaint: [Text field - required]
Pain Level: [0-10 scale slider]

Symptoms:
☐ Fever
☐ Cough
☐ Headache
☐ Nausea
☐ Dizziness
☐ Chest pain
☐ Difficulty breathing
Other: [Text]

Medical History:
☐ Hypertension
☐ Diabetes
☐ Heart disease
☐ Asthma
☐ Allergies
Other notes: [Text]
```

---

## 4. Recording Vitals

### 4.1 Vitals Entry Form

Navigate to: **Vitals → Record** (or from patient card)

```markdown
┌─────────────────────────────────────────────────────────────┐
│ PATIENT: MED-015 (John D.)                Queue: MED-015   │
├─────────────────────────────────────────────────────────────┤
│ Blood Pressure:                                              │
│   Systolic: [___] mmHg  (Normal: <120)                    │
│   Diastolic: [___] mmHg  (Normal: <80)                     │
│                                                             │
│ Heart Rate: [___] BPM  (Normal: 60-100)                    │
│                                                             │
│ Temperature: [___] °C  (Normal: 36.5-37.2)                 │
│                                                             │
│ Respiratory Rate: [___] /min  (Normal: 12-20)               │
│                                                             │
│ Oxygen Saturation: [___] %  (Normal: 95-100)               │
│                                                             │
│ Weight: [___] kg                                             │
│ Height: [___] cm  →  BMI: [Calculated]                     │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Vital Signs Reference

| Parameter | Normal Range | Warning | Critical |
|-----------|--------------|---------|----------|
| BP Systolic | 90-120 | 120-140 | >140 or <90 |
| BP Diastolic | 60-80 | 80-90 | >90 or <60 |
| Heart Rate | 60-100 | 50-60 or 100-110 | <50 or >110 |
| Temperature | 36.5-37.2 | 37.3-38.0 | >38.0 or <35.0 |
| SpO2 | 95-100% | 90-95% | <90% |
| Respiratory Rate | 12-20 | 20-24 | >24 or <8 |

### 4.3 Save Vitals

1. Complete all fields
2. Click **Save Vitals**
3. Vitals attached to patient record
4. Notified to doctor in queue

---

## 5. Patient Queue Management

### 5.1 Call Patient for Triage

1. Find patient in queue
2. Click **Call** button
3. Patient notification sent

### 5.2 Update Queue Priority

After triage, update patient priority:

1. Select patient
2. Click **Update Priority**
3. Select appropriate level
4. Add triage notes
5. Confirm update

### 5.3 Transfer After Triage

If patient needs different department:

1. Click **Transfer**
2. Select destination department
3. Add notes for receiving staff
4. Confirm transfer

---

## 6. Lab Requests

### 6.1 Create Lab Request

1. Open patient record
2. Click **Lab Request**
3. Select tests:

```markdown
Common Tests:
☐ Complete Blood Count (CBC)
☐ Blood Glucose
☐ Urinalysis
☐ Lipid Panel
☐ Liver Function Tests
☐ Kidney Function Tests
☐ Thyroid Function Tests

Custom Test: [Text field]
Urgency: [Routine/Urgent/STAT]
Notes: [Additional instructions]
```

4. Click **Submit Request**

### 6.2 View Lab Results

Navigate to: **Lab Results**

Shows pending and completed lab results for your patients.

---

## 7. Communication

### 7.1 Send Update to Doctor

1. Click **Messages**
2. Click **+ New**
3. Select doctor
4. Compose message:

```markdown
Patient: MED-015
Topic: Triage Update
Priority: [Normal/Urgent]

Message:
BP elevated (140/90), recommended immediate
consultation. Patient has history of hypertension.
```

5. Click **Send**

### 7.2 Receive Instructions

View messages from doctors:

```markdown
┌─────────────────────────────────────────┐
│ From: Dr. Smith          Time: 10:30 AM │
│ Subject: Patient MED-012                │
│ ─────────────────────────────────────── │
│ Please record fasting glucose for this  │
│ patient. Lab request submitted.         │
└─────────────────────────────────────────┘
```

---

## 8. Patient Education

After triage, provide patient information:

```markdown
Patient Education Topics:
- What to expect during consultation
- Preparation for tests
- Medication instructions
- Follow-up care
- When to seek immediate help
```

---

## 9. Reports

### 9.1 Daily Summary

Navigate to: **Reports → Daily Summary**

```markdown
Today's Triage Summary:
- Patients Triaged: 15
- Emergency Cases: 2
- Urgent Cases: 5
- Routine Cases: 8
- Average Wait Time: 18 minutes
```

### 9.2 Vitals Summary

View all vitals recorded for the day.

---

## 10. Quick Actions

| Task | Steps |
|------|-------|
| Record vitals | Select patient → Click Vitals → Enter data → Save |
| Update priority | Select patient → Update Priority → Select level → Confirm |
| Create lab request | Patient record → Lab Request → Select tests → Submit |
| Message doctor | Messages → New → Select recipient → Compose → Send |
| Transfer patient | Select patient → Transfer → Select dept → Confirm |

---

## 11. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `V` | Record vitals |
| `T` | Start triage |
| `P` | Update priority |
| `M` | New message |
| `L` | Lab request |
| `A` | View appointments |

---

## 12. Support

- IT Support: it-support@limuruhospital.co.ke
- Supervisor: [Your supervisor contact]
