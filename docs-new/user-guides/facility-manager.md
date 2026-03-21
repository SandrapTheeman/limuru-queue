# Facility Manager User Guide

**Role:** Facility Manager  
**Last Updated:** March 2026

---

## 1. Overview

As a Facility Manager, you oversee hospital resources including rooms, equipment, and facility operations.

### Your Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│  FACILITY MANAGEMENT                                           │
├────────────────────────────────────────────────────────────────┤
│  Room Occupancy: 15/20    Equipment Status: 98% Operational   │
│                                                                │
│  ┌──────────────────────┐  ┌──────────────────────┐          │
│  │  ROOM STATUS        │  │  ALERTS (3)          │          │
│  │  ▓▓▓▓▓▓▓░░░ 75%    │  │  ⚠ Room 205 - AC    │          │
│  │                     │  │  ⚠ Supply low        │          │
│  │  [+Manage Rooms]    │  │  ⚠ Maintenance due   │          │
│  └──────────────────────┘  └──────────────────────┘          │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  QUICK ACTIONS                                        │     │
│  │  [Rooms]  [Equipment]  [Supplies]  [Reports]         │     │
│  └──────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Accessing the System

```bash
URL: https://limuruhospital.co.ke/dashboard/facility
```

---

## 3. Room Management

### 3.1 View All Rooms

Navigate to: **Resources → Rooms**

```markdown
┌─────────────────────────────────────────────────────────────┐
│ ROOM STATUS                                                 │
├─────────────────────────────────────────────────────────────┤
│ Room   │ Type       │ Dept       │ Status │ Current       │
│ ───────────────────────────────────────────────────────────│
│ 201    │ Consult    │ Medicine   │ ● Free │ -            │
│ 202    │ Consult    │ Medicine   │ ● Busy │ Dr. Smith    │
│ 203    │ Exam       │ Medicine   │ ● Free │ -            │
│ 204    │ Treatment  │ Medicine   │ ● Busy │ Nurse Jane   │
│ 205    │ Consult    │ Pedia      │ ● Maint│ -            │
└─────────────────────────────────────────────────────────────┘

Status: ● Free  ● Occupied  ● Maintenance  ● Reserved
```

### 3.2 Room Details

Click on room to see:
- Current status
- Scheduled appointments
- Equipment list
- Maintenance history

### 3.3 Update Room Status

1. Select room
2. Click **Update Status**
3. Select new status:
   - Available
   - Occupied
   - Under Maintenance
   - Reserved
4. Add notes (optional)
5. Confirm

---

## 4. Room Scheduling

### 4.1 Schedule Room Use

1. Navigate to **Resources → Room Schedule**
2. Select room
3. Select date/time
4. Assign to:
   - Department
   - Staff member
   - Purpose

```markdown
Room 201 Schedule - March 21, 2026
┌─────────────────────────────────────────┐
│ 08:00 │ Dr. Smith - Consultations       │
│ 10:00 │ Blocked - Maintenance            │
│ 11:00 │ Dr. Smith - Consultations        │
│ 14:00 │ Dr. Doe - Consultations          │
└─────────────────────────────────────────┘
```

### 4.2 Conflict Detection

System alerts if:
- Double booking attempted
- Maintenance conflicts with schedule
- Insufficient time between bookings

---

## 5. Equipment Management

### 5.1 Equipment Inventory

Navigate to: **Equipment → Inventory**

```markdown
┌─────────────────────────────────────────────────────────────┐
│ EQUIPMENT INVENTORY                                        │
├─────────────────────────────────────────────────────────────┤
│ Equipment           │ Qty │ Status  │ Location │ Maint.   │
│ ───────────────────────────────────────────────────────────│
│ Vital Signs Monitor │ 10  │ ● Good  │ Rooms    │ Due Apr  │
│ ECG Machine         │ 2   │ ● Good  │ ER, 201  │ Due May  │
│ Pulse Oximeter      │ 15  │ ● Good  │ Various  │ Due Jun  │
│ Nebulizer           │ 5   │ ⚠ Repair│ Storage  │ -        │
│ Defibrillator       │ 3   │ ● Good  │ ER, 202  │ Due Apr  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Equipment Status Update

1. Select equipment
2. Click **Update Status**
3. Update:
   - Condition (Good/Needs Repair/Out of Service)
   - Location
   - Notes

### 5.3 Maintenance Scheduling

```markdown
Schedule Maintenance:
Equipment: Vital Signs Monitor #3
Type: [Preventive / Repair]
Date: [Select date]
Technician: [Select]
Description: [Details]
```

---

## 6. Supply Management

### 6.1 Track Supplies

Navigate to: **Supplies → Inventory**

```markdown
┌─────────────────────────────────────────────────────────────┐
│ SUPPLY INVENTORY                                            │
├─────────────────────────────────────────────────────────────┤
│ Item                │ Stock │ Min │ Location │ Reorder   │
│ ───────────────────────────────────────────────────────────│
│ Exam Gloves (Box)   │ 45    │ 20  │ Storage  │ ✓ OK     │
│ Syringes 5ml         │ 200   │ 50  │ Storage  │ ✓ OK     │
│ Bandages (Roll)      │ 30    │ 25  │ Storage  │ ⚠ Low    │
│ Thermometer Covers   │ 100   │ 30  │ Rooms    │ ✓ OK     │
│ Face Masks (Box)     │ 15    │ 10  │ Storage  │ ✓ OK     │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Request Supplies

1. Click **Request Supplies**
2. Select items
3. Enter quantities
4. Submit to procurement

---

## 7. Facility Alerts

### 7.1 Active Alerts

Navigate to: **Alerts → Active**

```markdown
┌─────────────────────────────────────────────────────────────┐
│ ACTIVE ALERTS (3)                                          │
├─────────────────────────────────────────────────────────────┤
│ ⚠ HIGH PRIORITY                                            │
│ Room 205 - Air conditioning not working                    │
│ Reported: 9:30 AM by Reception                             │
│ Assigned to: Maintenance Team                               │
│ Status: In Progress                                        │
├─────────────────────────────────────────────────────────────┤
│ ⚠ MEDIUM PRIORITY                                           │
│ Supply low: Bandages                                        │
│ Location: Main Storage                                      │
│ Status: Reorder Placed                                     │
├─────────────────────────────────────────────────────────────┤
│ ℹ LOW PRIORITY                                              │
│ Maintenance due: Vital Signs Monitor #5                     │
│ Due: March 25, 2026                                         │
│ Status: Scheduled                                          │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Create Alert

1. Click **+ New Alert**
2. Fill details:
   - Location
   - Category
   - Priority
   - Description
   - Assigned to

---

## 8. Staff Scheduling Support

### 8.1 Room Allocation View

Shows room assignments per staff member.

### 8.2 Resource Conflicts

Identifies scheduling conflicts and suggests alternatives.

---

## 9. Reports

### 9.1 Facility Utilization

Navigate to: **Reports → Utilization**

```markdown
Room Utilization Report - March 2026

Room Usage:
- Room 201: 85% occupied
- Room 202: 78% occupied
- Room 203: 92% occupied
- Room 204: 65% occupied

Average: 80% utilization

Peak Hours:
- 9-11 AM: High demand
- 2-4 PM: Moderate demand
```

### 9.2 Maintenance Report

```markdown
Maintenance Summary - Q1 2026

Preventive Maintenance: 15 completed
Corrective Maintenance: 8 completed
Equipment Downtime: 12 hours total

Upcoming:
- April: 5 scheduled
- May: 8 scheduled
```

### 9.3 Supply Report

```markdown
Supply Usage Report - March 2026

Top Consumables:
1. Exam Gloves: 25 boxes
2. Syringes: 150 units
3. Bandages: 20 rolls

Reorder Alerts: 3
```

---

## 10. Energy Management

### 10.1 Consumption Monitoring

Track utility usage:
- Electricity
- Water
- Gas

### 10.2 Alerts

Receive alerts for unusual consumption patterns.

---

## 11. Quick Reference

| Task | Steps |
|------|-------|
| Update room status | Rooms → Select → Update → Confirm |
| Schedule maintenance | Equipment → Select → Schedule → Details |
| Create supply request | Supplies → Request → Items → Submit |
| Handle alert | Alerts → Select → Action → Update |
| View utilization | Reports → Utilization → Select period |

---

## 12. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `R` | View rooms |
| `E` | View equipment |
| `S` | View supplies |
| `A` | View alerts |
| `M` | Create maintenance |

---

## 13. Support

- IT Support: it-support@limuruhospital.co.ke
- Maintenance: maintenance@limuruhospital.co.ke
