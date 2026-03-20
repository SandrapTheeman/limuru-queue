# TV Display System

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Description:** Complete documentation of the TV display system for queue visualization

---

## Table of Contents

1. [Overview](#overview)
2. [Display Modes](#display-modes)
3. [Layout Structure](#layout-structure)
4. [Design Specifications](#design-specifications)
5. [Real-time Updates](#real-time-updates)
6. [Offline Mode](#offline-mode)
7. [IPTV Integration](#iptv-integration)
8. [Component Reference](#component-reference)

---

## Overview

The TV Display System provides large-format visual displays for showing queue status, called patients, and announcements throughout the hospital.

---

## Display Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| Single | One department full screen | Department waiting area |
| Multi | 2-4 departments split | Main lobby |
| Auto-Switch | Rotate departments | Large displays |
| IPTV PiP | Queue overlay on TV | Waiting rooms with TV |
| Kiosk | Touch-enabled display | Self-service |

---

## Layout Structure

```
+------------------------------------------------------------------+
|  [Logo]         DEPARTMENT NAME         [Date] [Time] [Audio]    |
+------------------------------------------------------------------+
|                                                                   |
|                    +------------------------+                     |
|                    |     NOW CALLING        |                     |
|                    |     MED/R201/001       |                     |
|                    |      John K.          |                     |
|                    |     [ROOM 201]        |                     |
|                    +------------------------+                     |
|                                                                   |
|  UP NEXT: 1. MED/R---/002 - Mary W.    | Wait: 15 min          |
|  ---------------------------------------------------------------- |
|  WAITING: 3 patients | Avg Wait: 12 min | Called Today: 45      |
+------------------------------------------------------------------+
```

---

## Design Specifications

| Element | Specification |
|---------|--------------|
| Background | Dark blue (#1E3A5F) |
| Text | White (#FFFFFF) |
| Called patient text | 120px+ |
| Queue names | 60px |
| Contrast | WCAG AAA |

---

## Related Documents

| Document | Path |
|----------|------|
| IPTV | [./IPTV.md](./IPTV.md) |
| Audio | [../announcements/AUDIO.md](../announcements/AUDIO.md) |
| Frontend | [../../06-Frontend/MASTER.md](../../06-Frontend/MASTER.md) |

---

*Last updated: March 20, 2026*
