# Call System

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Description:** Complete documentation of the patient calling system

---

## Table of Contents

1. [Overview](#overview)
2. [Call Types](#call-types)
3. [Call Flow](#call-flow)
4. [Timeout Handling](#timeout-handling)
5. [Room Assignment](#room-assignment)
6. [Multi-Call](#multi-call)
7. [Transfer](#transfer)
8. [Notifications](#notifications)

---

## Overview

The Call System handles all patient calling operations, from staff manually calling a patient to automatic system calls and patient transfers between departments.

---

## Call Types

| Type | Code | Description | Trigger |
|------|------|-------------|---------|
| Manual | `manual` | Staff selects specific patient | Staff clicks "Call" |
| Auto | `auto` | System calls highest priority | Auto-call setting |
| Recall | `recall` | Re-call absent patient | Staff clicks "Recall" |
| Transfer | `transfer` | Move patient to another dept | Staff initiates transfer |

---

## Call Flow

```
Staff Action → API → State Update → Broadcast → TV/Audio/Notifications
```

---

## Timeout Handling

- Default: 5 minutes
- Auto-complete or recall after timeout
- Recall re-adds to queue front

---

## Related Documents

| Document | Path |
|----------|------|
| Priority Algorithm | [../priority-queue/PRIORITY-ALGORITHM.md](../priority-queue/PRIORITY-ALGORITHM.md) |
| TV Display | [../tv-display/TV-DISPLAY.md](../tv-display/TV-DISPLAY.md) |
| Audio | [../announcements/AUDIO.md](../announcements/AUDIO.md) |

---

*Last updated: March 20, 2026*
