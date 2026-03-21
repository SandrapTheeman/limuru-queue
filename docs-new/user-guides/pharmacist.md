# Pharmacist User Guide

**Role:** Pharmacist  
**Last Updated:** March 2026

---

## 1. Overview

As a Pharmacist, you manage medication dispensing, review prescriptions, and coordinate with physicians for medication-related matters.

### Your Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│  PHARMACY - Pharmacist Station                                 │
├────────────────────────────────────────────────────────────────┤
│  Pending Prescriptions: 8    Ready for Pickup: 5               │
│                                                                │
│  ┌─────────────────────┐  ┌─────────────────────┐            │
│  │  PENDING (8)        │  │  READY (5)           │            │
│  │  ────────────────  │  │  ────────────────   │            │
│  │  MED-015           │  │  MED-012            │            │
│  │  MED-008           │  │  GYN-003            │            │
│  │  MED-004           │  │  MED-007            │            │
│  │  [+View All]       │  │  [+View All]        │            │
│  └─────────────────────┘  └─────────────────────┘            │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Accessing the System

```bash
URL: https://limuruhospital.co.ke/dashboard/pharmacist
```

---

## 3. Prescription Workflow

### 3.1 View Pending Prescriptions

Navigate to: **Prescriptions → Pending**

```markdown
┌─────────────────────────────────────────────────────────────┐
│ PENDING PRESCRIPTIONS                                      │
├─────────────────────────────────────────────────────────────┤
│ MED-015 | John D. | Dr. Smith | 3 items | 10:30 AM          │
│ MED-008 | Jane K. | Dr. Doe   | 2 items | 10:45 AM         │
│ MED-004 | Peter M. | Dr. Smith | 5 items | 11:00 AM         │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Process Prescription

1. Click on prescription
2. Review medication details:

```markdown
┌─────────────────────────────────────────────────────────────┐
│ PRESCRIPTION DETAILS                                        │
├─────────────────────────────────────────────────────────────┤
│ Patient: LCH-2026-0142 (John Doe)                           │
│ Prescriber: Dr. John Smith                                  │
│ Date: March 21, 2026 10:30 AM                              │
│ Diagnosis: Upper respiratory infection                        │
├─────────────────────────────────────────────────────────────┤
│ MEDICATIONS:                                                │
│                                                             │
│ 1. Amoxicillin 500mg                                        │
│    Dose: 1 capsule 3x daily                                │
│    Duration: 7 days                                         │
│    Qty: 21 capsules                                        │
│    Instructions: Take with food                              │
│                                                             │
│ 2. Ibuprofen 400mg                                         │
│    Dose: 1 tablet 3x daily PRN                              │
│    Duration: 5 days                                         │
│    Qty: 15 tablets                                         │
│    Instructions: Take with food for pain/fever              │
│                                                             │
│ 3. Cough Syrup 100ml                                        │
│    Dose: 5ml 3x daily                                       │
│    Duration: 5 days                                         │
│    Instructions: Shake well before use                        │
├─────────────────────────────────────────────────────────────┤
│ Notes: Patient allergic to penicillin                        │
└─────────────────────────────────────────────────────────────┘
```

3. Verify medication:
   - Check for allergies
   - Verify dosage
   - Check drug interactions

4. Dispense medications:
   - Select each item
   - Mark as dispensed
   - Add lot numbers

5. Click **Mark as Ready**
6. Patient notified for pickup

---

## 4. Drug Interaction Check

### 4.1 Automatic Alerts

System automatically checks for:
- Allergies
- Drug-drug interactions
- Duplicate therapy
- Contraindications

### 4.2 Alert Handling

```markdown
⚠️ ALERT: Drug Interaction Detected

Warfarin + Aspirin
Severity: Moderate
Recommendation: Monitor INR closely

Actions:
○ Proceed with caution (add note)
○ Consult prescriber
○ Modify prescription
```

---

## 5. Inventory Management

### 5.1 View Stock Levels

Navigate to: **Inventory → Stock Levels**

```markdown
┌─────────────────────────────────────────────────────────────┐
│ MEDICATION INVENTORY                                        │
├─────────────────────────────────────────────────────────────┤
│ Item              │ Stock │ Min │ Status │ Expiry          │
│ ────────────────────────────────────────────────────────── │
│ Amoxicillin 500mg │ 150   │ 50  │ ✓ OK   │ Dec 2026        │
│ Ibuprofen 400mg  │ 45    │ 30  │ ⚠ Low  │ Nov 2027        │
│ Paracetamol 500mg│ 200   │ 50  │ ✓ OK   │ Jan 2028        │
│ Omeprazole 20mg   │ 80    │ 40  │ ✓ OK   │ Aug 2027        │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Low Stock Alerts

When stock falls below minimum:
- Alert generated
- Admin notified
- Reorder recommended

### 5.3 Record Dispensing

```markdown
After dispensing:
1. Update stock count
2. Record lot number
3. Record expiry date
4. Confirm with patient
```

---

## 6. Patient Counseling

### 6.1 Counseling Points

```markdown
Always counsel patients on:
□ Medication name and purpose
□ How to take medication
□ When to take medication
□ How long to continue
□ Side effects to watch for
□ What to avoid
□ Storage instructions
□ When to seek help
```

### 6.2 Label Information

Each dispensed medication includes:
- Patient name
- Medication name
- Dosage instructions
- Date dispensed
- Prescriber name
- Pharmacy contact

---

## 7. Communication with Prescribers

### 7.1 Send Message to Doctor

1. Click **Messages**
2. Click **+ New**
3. Select doctor
4. Compose message:

```markdown
Re: Prescription Clarification
Patient: MED-015 (John Doe)

Message:
Dr. Smith, I noticed the prescribed dose of
Ibuprofen 600mg exceeds the recommended maximum.
Should I adjust to 400mg or proceed as written?

Thank you,
Pharmacy
```

### 7.2 Request Prescription Modification

```markdown
Request Types:
- Dosage clarification
- Alternative medication (if out of stock)
- Additional information needed
- Drug interaction concerns
```

---

## 8. Reports

### 8.1 Daily Summary

Navigate to: **Reports → Daily Summary**

```markdown
Pharmacy Daily Report - March 21, 2026

Dispensed:
- Total prescriptions: 42
- Total items: 156
- Average items per prescription: 3.7

Inventory:
- Items dispensed: 156
- Low stock alerts: 3
- Expiring soon (30 days): 5

Patient Consultations:
- Counseled: 38 patients
- Drug information provided: 12
```

### 8.2 Inventory Report

```markdown
Monthly Usage Report:
- Most dispensed: Paracetamol 500mg (85)
- Least dispensed: [Specialty items]
- Wastage: < 1%
```

---

## 9. Quality Assurance

### 9.1 Prescription Verification

```markdown
Verification Checklist:
□ Right patient
□ Right medication
□ Right dose
□ Right route
□ Right time
□ Right documentation
□ No allergies
□ No interactions
□ Legible prescription
□ Valid prescriber
```

### 9.2 Error Reporting

Report any dispensing errors:
1. Click **Report Error**
2. Describe incident
3. Submit for review

---

## 10. Quick Reference

| Task | Steps |
|------|-------|
| Process prescription | Pending → Select → Verify → Dispense → Mark Ready |
| Check stock | Inventory → Stock Levels |
| Message doctor | Messages → New → Select → Compose → Send |
| Record dispensing | Open prescription → Enter lot # → Confirm |

---

## 11. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `P` | View pending |
| `R` | View ready |
| `I` | Open inventory |
| `M` | New message |
| `S` | Search patient |

---

## 12. Support

- IT Support: it-support@limuruhospital.co.ke
- Pharmacy Supervisor: [Contact]
