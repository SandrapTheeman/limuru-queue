# Lab Technician User Guide

**Role:** Lab Technician  
**Last Updated:** March 2026

---

## 1. Overview

As a Lab Technician, you process laboratory orders, perform tests, and report results to physicians.

### Your Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│  LABORATORY - Lab Station 1                                    │
├────────────────────────────────────────────────────────────────┤
│  Pending Tests: 12    In Progress: 3    Completed Today: 25   │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  PENDING ORDERS                                        │   │
│  │  ──────────────────────────────────────────────────── │   │
│  │  MED-015    CBC, Lipid Panel    Priority    10:30 AM   │   │
│  │  MED-008    Blood Glucose       Routine     10:45 AM   │   │
│  │  GYN-003    Urinalysis         Routine     11:00 AM   │   │
│  │  [+View All 12]                                        │   │
│  └────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Accessing the System

```bash
URL: https://limuruhospital.co.ke/dashboard/lab
```

---

## 3. Laboratory Orders

### 3.1 View Pending Orders

Navigate to: **Orders → Pending**

```markdown
┌─────────────────────────────────────────────────────────────┐
│ PENDING ORDERS                    Filter: [All ▼]          │
├─────────────────────────────────────────────────────────────┤
│ Ticket  │ Patient  │ Tests              │ Priority │ Time  │
│ ──────────────────────────────────────────────────────────│
│ MED-015 │ LCH-0142 │ CBC, Lipid Panel   │ Priority │ 10:30 │
│ MED-008 │ LCH-0089 │ Blood Glucose      │ Routine  │ 10:45 │
│ GYN-003 │ LCH-0156 │ Urinalysis         │ Routine  │ 11:00 │
│ MED-004 │ LCH-0112 │ LFT, KFT           │ Routine  │ 11:15 │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Accept Order

1. Click on pending order
2. Review test details
3. Click **Accept** to start processing

### 3.3 Test Categories

| Category | Tests |
|----------|-------|
| Hematology | CBC, Blood Groups, Coagulation |
| Biochemistry | Glucose, Lipids, LFT, KFT |
| Urinalysis | Routine, Microscopy |
| Serology | HIV, Hep B, Syphilis |
| Microbiology | Culture, Sensitivity |

---

## 4. Recording Results

### 4.1 Enter Test Results

1. Open accepted order
2. Select test to process
3. Enter results:

```markdown
┌─────────────────────────────────────────────────────────────┐
│ TEST: Complete Blood Count (CBC)                           │
│ Patient: John Doe (LCH-2026-0142)                          │
│ Order #: LAB-2026-0042                                     │
├─────────────────────────────────────────────────────────────┤
│ PARAMETER         │ RESULT    │ UNIT   │ REFERENCE          │
│ ──────────────────────────────────────────────────────────│
│ WBC               │ [6.5    ] │ 10^3/µL│ 4.5-11.0         │
│ RBC               │ [4.8    ] │ 10^6/µL│ 4.5-5.5          │
│ Hemoglobin        │ [14.2   ] │ g/dL   │ 12.0-16.0        │
│ Hematocrit        │ [42.0   ] │ %      │ 36-46            │
│ Platelets         │ [250    ] │ 10^3/µL│ 150-400          │
│ MCV               │ [87.5   ] │ fL     │ 80-100           │
│ MCH               │ [29.5   ] │ pg     │ 27-33           │
│ MCHC              │ [33.7   ] │ g/dL   │ 32-36           │
└─────────────────────────────────────────────────────────────┘

Notes: [Optional]
Device: [Select analyzer]
```

4. Mark as completed
5. Click **Submit Results**

### 4.2 Critical Values

```markdown
⚠️ CRITICAL VALUE DETECTED

Potassium: 6.5 mEq/L (High)
Reference: 3.5-5.0 mEq/L

Actions Required:
□ Repeat test to confirm
□ Notify ordering physician immediately
□ Document notification in system
```

---

## 5. Quality Control

### 5.1 QC Records

Navigate to: **Quality → QC Records**

```markdown
Daily QC Checks:
Date: March 21, 2026
Status: ✓ Complete

Controls Run:
- Level 1: ✓ Passed
- Level 2: ✓ Passed
- Level 3: N/A

Next QC Due: March 22, 2026
```

### 5.2 QC Entry

```markdown
QC Entry Form:
Test: [Select test]
Level: [1 / 2 / 3]
Control Lot: [Enter lot #]
Expected Value: [Range]
Observed Value: [Enter result]
Acceptable: [Yes/No]
```

---

## 6. Equipment Management

### 6.1 Equipment Status

Navigate to: **Equipment → Status**

```markdown
┌─────────────────────────────────────────────────────────────┐
│ EQUIPMENT STATUS                                           │
├─────────────────────────────────────────────────────────────┤
│ Analyzer    │ Status    │ Last QC  │ Next Maintenance       │
│ ───────────────────────────────────────────────────────────│
│ Hematology  │ ● Online  │ 8:00 AM  │ March 25              │
│ Chemistry   │ ● Online  │ 8:15 AM  │ March 28              │
│ Urine       │ ● Online  │ 8:30 AM  │ April 1              │
│ centrifuge  │ ● Online  │ Daily    │ April 15             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Maintenance Log

Record equipment issues:
1. Select equipment
2. Click **Log Issue**
3. Describe problem
4. Submit for review

---

## 7. Inventory Management

### 7.1 Reagent Stock

Navigate to: **Inventory → Reagents**

```markdown
┌─────────────────────────────────────────────────────────────┐
│ REAGENT INVENTORY                                           │
├─────────────────────────────────────────────────────────────┤
│ Reagent            │ Stock │ Min │ Expiry │ Status        │
│ ───────────────────────────────────────────────────────────│
│ CBC Reagent        │ 150   │ 30  │ Apr 27 │ ✓ OK          │
│ Glucose Reagent    │ 80    │ 20  │ May 15 │ ✓ OK          │
│ Lipid Reagent      │ 25    │ 15  │ Mar 30 │ ⚠ Low         │
│ Urine Strips       │ 200   │ 50  │ Dec 26 │ ✓ OK          │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Record Usage

After completing tests:
1. Update reagent usage
2. Record lot numbers
3. System adjusts stock

---

## 8. Communication

### 8.1 Results Notification

When results are ready:
- System notifies ordering physician
- Results available in patient record
- Critical values flagged for immediate action

### 8.2 Send Message

Navigate to: **Messages**

```markdown
Compose Message:
To: Dr. John Smith
Re: Lab Results - LCH-2026-0142
Priority: [Normal / Urgent]

Message:
Dr. Smith,
Results for CBC and Lipid Panel for John Doe
are now ready. No critical values noted.
```

---

## 9. Reports

### 9.1 Daily Summary

Navigate to: **Reports → Daily Summary**

```markdown
Lab Report - March 21, 2026

Tests Completed:
- Hematology: 15
- Biochemistry: 12
- Urinalysis: 8
- Serology: 3
- Total: 38

Turnaround Time:
- Average: 45 minutes
- Priority average: 25 minutes
- Routine average: 55 minutes

Critical Values Reported: 2
```

### 9.2 Workload Report

Shows individual and team statistics.

---

## 10. Safety Procedures

### 10.1 Biohazard Handling

```markdown
Always:
□ Wear appropriate PPE
□ Dispose of waste properly
□ Follow biohazard protocols
□ Report exposures immediately
□ Clean work areas regularly
```

### 10.2 Sample Handling

```markdown
Sample Requirements:
□ Proper labeling
□ Correct tube type
□ Adequate volume
□ Appropriate storage
□ Timely processing
□ Document any issues
```

---

## 11. Quick Reference

| Task | Steps |
|------|-------|
| Accept order | Orders → Pending → Select → Accept |
| Enter results | In Progress → Select test → Enter values → Submit |
| Report critical | Results → Critical → Notify doctor → Document |
| Update inventory | Inventory → Use reagent → Enter qty → Save |

---

## 12. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `P` | View pending orders |
| `I` | View in progress |
| `R` | New result entry |
| `Q` | Quality control |
| `M` | Messages |

---

## 13. Support

- IT Support: it-support@limuruhospital.co.ke
- Lab Supervisor: [Contact]
