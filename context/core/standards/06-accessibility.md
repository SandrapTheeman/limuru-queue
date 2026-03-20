## Creating File: `.opencode/context/core/standards/06-accessibility.md`

```markdown
# Accessibility Standards (a11y)
**Document ID:** CORE-STD-06
**Version:** 1.0
**Last Updated:** 2026-03-03
**Owner:** UX Lead

## Purpose

This document defines the accessibility standards for the Hospital Queuing System. Ensuring accessibility means that all users, including those with disabilities, can effectively use the system. Given the healthcare context, accessibility is not just a legal requirement but a moral imperative.

## 1. Accessibility Principles

### 1.1 Core Tenets (POUR)
- **Perceivable**: Information must be presentable to users in ways they can perceive
- **Operable**: User interface components must be operable by all users
- **Understandable**: Information and operation must be understandable
- **Robust**: Content must be robust enough to work with assistive technologies

### 1.2 Compliance Standards

| Standard | Level | Application | Deadline |
|----------|-------|-------------|----------|
| **WCAG 2.1** | AA | All public interfaces | Current |
| **WCAG 2.1** | AAA | Critical functions | Q3 2026 |
| **Section 508** | - | US users | Current |
| **EN 301 549** | - | EU users | Current |
| **ADA Title III** | - | Public accommodations | Current |

### 1.3 Target Audiences

| User Group | Assistive Technology | Key Considerations |
|------------|---------------------|-------------------|
| **Visually Impaired** | Screen readers (NVDA, JAWS, VoiceOver) | Semantic HTML, ARIA labels, alt text |
| **Low Vision** | Screen magnifiers, high contrast | Scalable text, contrast ratios |
| **Color Blind** | - | Color not sole indicator |
| **Deaf/Hard of Hearing** | Captions, transcripts | Video captions, visual alerts |
| **Motor Impairments** | Keyboard only, switch devices | Keyboard navigation, focus indicators |
| **Cognitive Disabilities** | - | Clear language, consistent layout |

## 2. HTML Semantics

### 2.1 Document Structure

```html
<!-- ✓ GOOD: Semantic HTML5 structure -->
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Patient Dashboard - Limuru Cottage Hospital</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <header>
    <h1>Patient Dashboard</h1>
    <nav aria-label="Main navigation">
      <!-- Navigation -->
    </nav>
  </header>
  
  <main id="main-content">
    <section aria-labelledby="queue-status-heading">
      <h2 id="queue-status-heading">Current Queue Status</h2>
      <!-- Queue content -->
    </section>
    
    <article aria-labelledby="visit-history-heading">
      <h2 id="visit-history-heading">Visit History</h2>
      <!-- History content -->
    </article>
  </main>
  
  <footer>
    <p>© 2026 Limuru Cottage Hospital</p>
  </footer>
</body>
</html>

<!-- ✗ BAD: Div soup with no semantics -->
<div class="header">
  <div class="title">Patient Dashboard</div>
</div>
<div class="main">
  <div class="section">
    <div class="section-title">Current Queue Status</div>
  </div>
</div>
```

### 2.2 Landmark Roles

```html
<!-- Use native HTML elements which have implicit roles -->
<header> → role="banner"
<nav> → role="navigation"
<main> → role="main"
<article> → role="article"
<section> → role="region" (if it has an accessible name)
<aside> → role="complementary"
<footer> → role="contentinfo"
<form> → role="form"
<button> → role="button"

<!-- Add explicit roles only when necessary -->
<div role="search" aria-label="Site search">
  <!-- Search form -->
</div>

<div role="alert" aria-live="assertive">
  <!-- Critical notifications -->
</div>

<div role="status" aria-live="polite">
  <!-- Non-critical status updates -->
</div>
```

### 2.3 Headings Hierarchy

```html
<!-- ✓ GOOD: Proper heading hierarchy -->
<h1>Hospital Queuing System</h1>
  <h2>Patient Dashboard</h2>
    <h3>Queue Status</h3>
    <h3>Visit History</h3>
  <h2>Doctor Dashboard</h2>
    <h3>Current Patient</h3>
    <h3>Waiting Queue</h3>

<!-- ✗ BAD: Skipping levels -->
<h1>Hospital Queuing System</h1>
  <h3>Patient Dashboard</h3> <!-- Should be h2 -->
  <h4>Queue Status</h4>      <!-- Should be h3 -->
```

## 3. Keyboard Accessibility

### 3.1 Focus Management

```typescript
// components/FocusTrap.tsx
import { useEffect, useRef } from 'react';

interface FocusTrapProps {
  active: boolean;
  children: React.ReactNode;
  onEscape?: () => void;
}

export function FocusTrap({ active, children, onEscape }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!active) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Find all focusable elements
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    // Focus first element
    firstFocusable?.focus();
    
    // Trap focus
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
      
      if (e.key === 'Escape' && onEscape) {
        onEscape();
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, onEscape]);
  
  return <div ref={containerRef}>{children}</div>;
}
```

### 3.2 Focus Indicators

```css
/* styles/focus.css */

/* Custom focus indicator (WCAG requires visible focus) */
:focus {
  outline: 3px solid #2E7D32;
  outline-offset: 2px;
}

/* High contrast focus for specific elements */
.button:focus {
  outline: 3px solid #FFFFFF;
  outline-offset: 2px;
  box-shadow: 0 0 0 3px #000000;
}

/* Skip to main content link */
.skip-to-content {
  position: absolute;
  top: -40px;
  left: 0;
  background: #2E7D32;
  color: white;
  padding: 8px;
  z-index: 100;
}

.skip-to-content:focus {
  top: 0;
}

/* Remove focus outline for mouse users only */
.js-focus-visible :focus:not(.focus-visible) {
  outline: none;
}

.js-focus-visible .focus-visible {
  outline: 3px solid #2E7D32;
}
```

### 3.3 Keyboard Shortcuts

```typescript
// hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(
  shortcuts: Shortcut[],
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      
      for (const shortcut of shortcuts) {
        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          !!e.ctrlKey === !!shortcut.ctrlKey &&
          !!e.altKey === !!shortcut.altKey &&
          !!e.shiftKey === !!shortcut.shiftKey
        ) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, enabled]);
}

// Usage in component
function PatientDashboard() {
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrlKey: true,
      action: () => callNextPatient(),
      description: 'Call next patient (Ctrl+N)'
    },
    {
      key: 'h',
      action: () => navigateToHistory(),
      description: 'View history (H)'
    },
    {
      key: 'Escape',
      action: () => closeModal(),
      description: 'Close modal (Esc)'
    }
  ]);
  
  // Show shortcuts menu
  return (
    <div>
      <button aria-label="Keyboard shortcuts" onClick={showShortcuts}>
        <kbd>⌨️</kbd>
      </button>
    </div>
  );
}
```

## 4. ARIA (Accessible Rich Internet Applications)

### 4.1 ARIA Labels and Descriptions

```typescript
// components/QueueStatus.tsx
export function QueueStatus({ position, total }: QueueStatusProps) {
  return (
    <div 
      role="region" 
      aria-labelledby="queue-heading"
      aria-describedby="queue-description"
    >
      <h2 id="queue-heading">Queue Status</h2>
      <p id="queue-description" className="sr-only">
        Your current position in the queue
      </p>
      
      <div 
        role="status" 
        aria-live="polite"
        aria-atomic="true"
      >
        <span aria-hidden="true">{position} of {total}</span>
        <span className="sr-only">
          You are number {position} in the queue, with {total - position} patients ahead of you.
        </span>
      </div>
    </div>
  );
}

// components/DoctorStation.tsx
export function CallPatientButton({ onClick, disabled }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      aria-label="Call next patient"
      aria-describedby="call-button-hint"
    >
      Next Patient
      <span id="call-button-hint" className="sr-only">
        Press this button to call the next waiting patient to your room
      </span>
    </button>
  );
}
```

### 4.2 Dynamic Content Updates

```typescript
// components/LiveQueue.tsx
export function LiveQueue({ patients }: { patients: Patient[] }) {
  // Announce queue changes to screen readers
  const [announcement, setAnnouncement] = useState('');
  
  useEffect(() => {
    if (patients.length > 0) {
      setAnnouncement(
        `Queue updated. ${patients.length} patients waiting. ` +
        `Next patient: ${patients[0].name}.`
      );
    }
  }, [patients]);
  
  return (
    <div>
      {/* Visually hidden live region for screen readers */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      
      {/* Visible queue display */}
      <ul aria-label="Waiting patients">
        {patients.map((patient, index) => (
          <li 
            key={patient.id}
            aria-label={`${patient.name}, position ${index + 1}`}
          >
            {patient.name}
            <span className="sr-only">Ticket {patient.ticketNumber}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 4.3 Modal Dialogs

```typescript
// components/Modal.tsx
import { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    if (isOpen) {
      // Store current focus
      previousFocus.current = document.activeElement as HTMLElement;
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Focus modal
      modalRef.current?.focus();
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      
      // Restore focus
      previousFocus.current?.focus();
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div 
        ref={modalRef}
        className="modal-content"
        tabIndex={-1}
      >
        <h2 id="modal-title">{title}</h2>
        <div id="modal-description">
          {children}
        </div>
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="close-button"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
```

## 5. Forms and Inputs

### 5.1 Accessible Form Structure

```typescript
// components/PatientForm.tsx
export function PatientForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  return (
    <form 
      onSubmit={handleSubmit}
      noValidate // We'll handle validation ourselves
      aria-label="Patient registration form"
    >
      <fieldset>
        <legend>Personal Information</legend>
        
        <div className="form-group">
          <label htmlFor="patient-name">
            Full Name
            <span aria-hidden="true">*</span>
            <span className="sr-only">required</span>
          </label>
          <input
            type="text"
            id="patient-name"
            name="name"
            required
            aria-required="true"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : 'name-hint'}
          />
          <div id="name-hint" className="hint-text">
            Enter your full name as shown on ID
          </div>
          {errors.name && (
            <div 
              id="name-error" 
              className="error-text"
              role="alert"
            >
              {errors.name}
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="patient-email">Email Address</label>
          <input
            type="email"
            id="patient-email"
            name="email"
            aria-describedby="email-hint"
          />
          <div id="email-hint" className="hint-text">
            We'll send your queue updates here
          </div>
        </div>
      </fieldset>
      
      <fieldset>
        <legend>Medical Information</legend>
        
        <div className="form-group">
          <label htmlFor="department">Department</label>
          <select
            id="department"
            name="department"
            required
            aria-required="true"
          >
            <option value="">Select a department</option>
            <option value="MED">General Medicine</option>
            <option value="PED">Pediatrics</option>
            <option value="CARD">Cardiology</option>
          </select>
        </div>
        
        <div className="form-group">
          <fieldset>
            <legend>Emergency Priority</legend>
            <div className="radio-group">
              <input
                type="radio"
                id="priority-normal"
                name="priority"
                value="normal"
                defaultChecked
              />
              <label htmlFor="priority-normal">Normal</label>
            </div>
            <div className="radio-group">
              <input
                type="radio"
                id="priority-emergency"
                name="priority"
                value="emergency"
              />
              <label htmlFor="priority-emergency">Emergency</label>
            </div>
          </fieldset>
        </div>
      </fieldset>
      
      <div className="form-actions">
        <button type="submit" aria-label="Submit registration">
          Register Patient
        </button>
        <button type="reset" aria-label="Clear form">
          Clear
        </button>
      </div>
    </form>
  );
}
```

### 5.2 Error Validation and Announcements

```typescript
// components/FormErrorSummary.tsx
interface ErrorSummaryProps {
  errors: Record<string, string>;
}

export function FormErrorSummary({ errors }: ErrorSummaryProps) {
  const errorCount = Object.keys(errors).length;
  
  if (errorCount === 0) return null;
  
  return (
    <div 
      className="error-summary"
      role="alert"
      aria-labelledby="error-summary-title"
      tabIndex={-1}
    >
      <h2 id="error-summary-title">
        {errorCount === 1 
          ? 'There is 1 error in the form' 
          : `There are ${errorCount} errors in the form`}
      </h2>
      <p>Please fix the following issues:</p>
      <ul>
        {Object.entries(errors).map(([field, message]) => (
          <li key={field}>
            <a href={`#${field}`} onClick={(e) => {
              e.preventDefault();
              document.getElementById(field)?.focus();
            }}>
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## 6. Color and Contrast

### 6.1 Contrast Ratios

```css
/* styles/contrast.css */

/* WCAG AA requirements:
   - Normal text: 4.5:1
   - Large text (18pt+): 3:1
   - UI components: 3:1
*/

:root {
  /* Primary palette with contrast checking */
  --primary-green: #2E7D32;      /* Contrast with white: 4.8:1 ✓ */
  --primary-green-light: #4CAF50; /* Contrast with white: 3.2:1 ✗ (large text only) */
  --primary-green-dark: #1B5E20;  /* Contrast with white: 7.1:1 ✓ */
  
  /* Text colors */
  --text-primary: #212121;        /* Contrast with white: 15:1 ✓ */
  --text-secondary: #757575;      /* Contrast with white: 4.6:1 ✓ */
  --text-disabled: #9E9E9E;       /* Contrast with white: 2.8:1 ✗ (not for critical text) */
  
  /* Background colors */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F5F5F5;
  --bg-error: #FFEBEE;
  
  /* Status colors */
  --success: #2E7D32;             /* Contrast with white: 4.8:1 ✓ */
  --warning: #ED6C02;             /* Contrast with white: 4.5:1 ✓ */
  --error: #D32F2F;               /* Contrast with white: 5.2:1 ✓ */
  --info: #0288D1;                /* Contrast with white: 4.7:1 ✓ */
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --primary-green: #006400;
    --text-primary: #000000;
    --text-secondary: #000000;
    --bg-primary: #FFFFFF;
    --border-color: #000000;
  }
  
  button, [role="button"] {
    border: 2px solid currentColor;
  }
}
```

### 6.2 Color Not Used Alone

```typescript
// components/StatusIndicator.tsx
interface StatusIndicatorProps {
  status: 'waiting' | 'called' | 'completed' | 'no-show';
}

export function StatusIndicator({ status }: StatusIndicatorProps) {
  const config = {
    waiting: {
      icon: '⏳',
      label: 'Waiting',
      color: 'var(--warning)',
      description: 'Patient is waiting to be called'
    },
    called: {
      icon: '🔔',
      label: 'Called',
      color: 'var(--info)',
      description: 'Patient has been called'
    },
    completed: {
      icon: '✓',
      label: 'Completed',
      color: 'var(--success)',
      description: 'Visit completed'
    },
    'no-show': {
      icon: '✗',
      label: 'No Show',
      color: 'var(--error)',
      description: 'Patient did not respond to call'
    }
  };
  
  const { icon, label, color, description } = config[status];
  
  return (
    <span 
      className="status-indicator"
      style={{ '--status-color': color } as React.CSSProperties}
      role="status"
      aria-label={description}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </span>
  );
}
```

## 7. Images and Media

### 7.1 Alt Text Guidelines

```typescript
// components/AccessibleImage.tsx
interface AccessibleImageProps {
  src: string;
  alt: string; // Required - no decorative images in healthcare context
  caption?: string;
  longDescription?: string;
}

export function AccessibleImage({ 
  src, 
  alt, 
  caption,
  longDescription 
}: AccessibleImageProps) {
  return (
    <figure>
      <img 
        src={src} 
        alt={alt}
        aria-describedby={longDescription ? 'img-desc' : undefined}
      />
      {caption && (
        <figcaption>{caption}</figcaption>
      )}
      {longDescription && (
        <div id="img-desc" className="sr-only">
          {longDescription}
        </div>
      )}
    </figure>
  );
}

// Alt text examples by context
const altTextExamples = {
  decorative: '', // Empty alt for decorative images
  informational: 'Hospital floor plan showing emergency exits',
  functional: 'QR code for patient check-in - scan with your phone camera',
  complex: 'Line graph showing average wait times from 9am to 5pm',
  logo: 'Limuru Cottage Hospital logo'
};
```

### 7.2 Video and Audio Accessibility

```typescript
// components/AccessibleVideo.tsx
interface VideoProps {
  src: string;
  captions: string;
  transcript: string;
  audioDescription?: string;
}

export function AccessibleVideo({ 
  src, 
  captions, 
  transcript,
  audioDescription 
}: VideoProps) {
  return (
    <div className="video-container">
      <video controls preload="metadata">
        <source src={src} type="video/mp4" />
        <track 
          kind="captions" 
          src={captions} 
          srcLang="en" 
          label="English Captions"
          default 
        />
        {audioDescription && (
          <track 
            kind="descriptions" 
            src={audioDescription} 
            srcLang="en" 
            label="Audio Description"
          />
        )}
        <p>
          Your browser doesn't support HTML video. Here is a 
          <a href={transcript}>transcript of the video</a> instead.
        </p>
      </video>
      
      <details className="video-transcript">
        <summary>Video Transcript</summary>
        <div dangerouslySetInnerHTML={{ __html: transcript }} />
      </details>
    </div>
  );
}
```

## 8. Responsive and Scalable Design

### 8.1 Text Scaling

```css
/* styles/typography.css */

/* Use relative units for text */
html {
  font-size: 16px; /* Base size */
}

body {
  font-size: 1rem;
  line-height: 1.5;
}

/* Responsive typography */
h1 {
  font-size: clamp(1.8rem, 5vw, 2.5rem);
}

h2 {
  font-size: clamp(1.5rem, 4vw, 2rem);
}

/* Ensure text scales with browser zoom */
.container {
  max-width: 80ch; /* Character-based width */
  margin: 0 auto;
  padding: 1rem;
}

/* Don't prevent scaling */
* {
  -webkit-text-size-adjust: 100%;
  -ms-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
```

### 8.2 Touch Targets

```css
/* styles/touch.css */

/* Minimum touch target size: 44x44px (WCAG) */
button, 
[role="button"],
input[type="submit"],
input[type="button"],
.touch-target {
  min-width: 44px;
  min-height: 44px;
  padding: 12px;
}

/* Spacing between touch targets */
.button-group {
  display: flex;
  gap: 16px; /* Minimum 8px gap */
  flex-wrap: wrap;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .button-group {
    flex-direction: column;
    gap: 12px;
  }
  
  button, 
  [role="button"] {
    width: 100%;
    justify-content: center;
  }
}
```

## 9. Testing and Validation

### 9.1 Automated Testing

```typescript
// tests/accessibility/a11y.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { PatientDashboard } from '@/components/PatientDashboard';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  it('PatientDashboard should have no accessibility violations', async () => {
    const { container } = render(<PatientDashboard patientId="test" />);
    
    const results = await axe(container, {
      rules: {
        // Customize rules if needed
        'color-contrast': { enabled: true },
        'aria-allowed-attr': { enabled: true }
      }
    });
    
    expect(results).toHaveNoViolations();
  });
  
  it('should have proper heading hierarchy', () => {
    const { container } = render(<PatientDashboard />);
    
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const levels = Array.from(headings).map(h => parseInt(h.tagName[1]));
    
    // Check that headings don't skip levels
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i-1]).toBeLessThanOrEqual(1);
    }
  });
  
  it('all interactive elements should be keyboard accessible', () => {
    const { container } = render(<PatientDashboard />);
    
    const interactive = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    interactive.forEach(element => {
      // Check that element can receive focus
      element.focus();
      expect(document.activeElement).toBe(element);
    });
  });
});
```

### 9.2 Manual Testing Checklist

```typescript
// docs/testing/accessibility-checklist.md
export const accessibilityChecklist = {
  keyboard: [
    'Can all interactive elements be reached with Tab key?',
    'Is focus order logical and intuitive?',
    'Is there a visible focus indicator?',
    'Can modals/popups be closed with Escape key?',
    'Are there keyboard shortcuts for common actions?'
  ],
  
  screenReader: [
    'Do all images have meaningful alt text?',
    'Are headings properly structured?',
    'Do forms have associated labels?',
    'Are error messages announced?',
    'Do dynamic updates get announced?'
  ],
  
  visual: [
    'Is contrast ratio at least 4.5:1 for text?',
    'Can text be resized up to 200% without loss of functionality?',
    'Is information conveyed without relying on color alone?',
    'Are touch targets at least 44x44px?',
    'Does the layout work at 400% zoom?'
  ],
  
  cognitive: [
    'Is language clear and simple?',
    'Are instructions provided for complex tasks?',
    'Is navigation consistent across pages?',
    'Are error messages helpful and specific?',
    'Is there enough time to complete tasks?'
  ]
};
```

### 9.3 CI/CD Integration

```yaml
# .github/workflows/accessibility.yml
name: Accessibility Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  axe-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run axe accessibility tests
        run: npm run test:a11y
        
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: a11y-report
          path: a11y-report/
  
  lighthouse-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            https://staging.limuruhospital.co.ke
            https://staging.limuruhospital.co.ke/dashboard/patient
            https://staging.limuruhospital.co.ke/dashboard/doctor
          uploadArtifacts: true
          temporaryPublicStorage: true
          budgetPath: ./lighthouse-budget.json
```

## 10. Documentation and Training

### 10.1 Accessibility Statement

```markdown
# Accessibility Statement - Limuru Cottage Hospital

## Our Commitment

Limuru Cottage Hospital is committed to ensuring digital accessibility for all patients and staff, including those with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.

## Conformance Status

The Web Content Accessibility Guidelines (WCAG) define requirements for designers and developers to improve accessibility for people with disabilities. Our hospital queuing system aims to conform to WCAG 2.1 Level AA.

## Feedback

We welcome your feedback on the accessibility of our queuing system. Please let us know if you encounter accessibility barriers:

- **Email**: accessibility@limuruhospital.co.ke
- **Phone**: +254 123 456 789
- **In-person**: Speak to any hospital staff member

## Technical Specifications

Accessibility of our system relies on the following technologies:

- HTML5
- WAI-ARIA
- CSS3
- JavaScript

These technologies are relied upon for conformance with the accessibility standards used.

## Assessment Approach

Limuru Cottage Hospital assessed the accessibility of our queuing system through:

- Self-evaluation
- Automated testing tools (axe, Lighthouse)
- Manual testing with assistive technologies
- User testing with people with disabilities

## Date

This statement was last updated on March 3, 2026.
```

### 10.2 Developer Guidelines

```markdown
# Accessibility Guidelines for Developers

## Before Writing Code

1. **Think semantically**: Choose the right HTML element for the job
2. **Plan for keyboard**: Ensure all functionality is keyboard accessible
3. **Consider color contrast**: Check colors meet WCAG standards
4. **Write meaningful labels**: Every interactive element needs a label

## During Development

1. **Use semantic HTML** (not divs for everything)
2. **Add alt text** to all images
3. **Label all form inputs** with explicit <label> elements
4. **Manage focus** for dynamic content
5. **Announce changes** with ARIA live regions
6. **Test with keyboard** only (no mouse)
7. **Check contrast** with browser tools

## Before Committing

1. Run axe accessibility tests
2. Test with screen reader (NVDA/VoiceOver)
3. Verify keyboard navigation
4. Check responsive design at 200% zoom
5. Review color contrast in different modes

## Resources

- [WCAG Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [A11Y Project Checklist](https://www.a11yproject.com/checklist/)
- [MDN Accessibility Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM Articles](https://webaim.org/articles/)
```

## 11. Accessibility Checklist Summary

### Pre-Launch Checklist
- [ ] All images have appropriate alt text
- [ ] All form inputs have associated labels
- [ ] Heading hierarchy is logical and complete
- [ ] Color contrast meets WCAG AA standards
- [ ] All functionality is keyboard accessible
- [ ] Focus indicators are visible
- [ ] ARIA landmarks are properly implemented
- [ ] Dynamic content announces changes
- [ ] Error messages are clear and associated with fields
- [ ] Touch targets meet minimum size requirements
- [ ] Text can be resized without breaking layout
- [ ] Screen reader testing completed
- [ ] Accessibility statement published

### Quarterly Review
- [ ] Automated accessibility tests run
- [ ] Manual testing with assistive technologies
- [ ] User feedback reviewed and addressed
- [ ] Updates to WCAG standards reviewed
- [ ] Staff training on accessibility maintained

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-03 | System | Initial version |

**Review Date:** 2026-06-03
```

**File created successfully: `.opencode/context/core/standards/06-accessibility.md`**

Please confirm if I should proceed with the next file: `.opencode/context/core/workflows/01-development.md`
