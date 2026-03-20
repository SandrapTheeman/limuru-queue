# Audio Announcements

**Last Updated:** March 20, 2026  
**Version:** 1.0.0  
**Description:** Text-to-Speech audio announcement system

---

## Table of Contents

1. [Overview](#overview)
2. [Announcement Format](#announcement-format)
3. [Languages](#languages)
4. [Audio Queue](#audio-queue)
5. [Emergency Override](#emergency-override)

---

## Overview

The Audio Announcement System uses Web Speech API for TTS announcements in English and Swahili.

---

## Announcement Format

```
Patient {firstName} {lastInitial}, please proceed to room {roomNumber}
```

**Example:** "Patient John M, please proceed to room 201"  
**Swahili:** "Mgonjwa John M, tafadhali nenda chumba 201"

---

## Languages

| Language | Code | Voice |
|----------|------|-------|
| English | en | Default |
| Swahili | sw | Default |

---

## Related Documents

| Document | Path |
|----------|------|
| TV Display | [../tv-display/TV-DISPLAY.md](../tv-display/TV-DISPLAY.md) |

---

*Last updated: March 20, 2026*
