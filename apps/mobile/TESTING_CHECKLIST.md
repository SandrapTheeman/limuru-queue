# Mobile App Testing Checklist

## Pre-Deployment Testing

### 1. Accessibility Testing
- [ ] All touch targets are minimum 48x48px
- [ ] VoiceOver/TalkBack can navigate all screens
- [ ] Color contrast ratios meet WCAG AA (4.5:1 for text)
- [ ] All interactive elements have accessibility labels
- [ ] Haptic feedback works for all critical actions

### 2. Offline Mode Testing
- [ ] Offline indicator shows correct status
- [ ] Queue operations queue when offline
- [ ] Auto-sync triggers when back online
- [ ] Exponential backoff works correctly
- [ ] Pending actions list displays correctly
- [ ] Last synced timestamp updates

### 3. Push Notifications Testing
- [ ] Queue position updates fire correctly
- [ ] Appointment reminders work
- [ ] Doctor calling notification fires
- [ ] Emergency alerts work (high priority)
- [ ] Notification actions work (View, Dismiss, etc.)
- [ ] Deep linking from notifications works

### 4. Native Features Testing
- [ ] Camera QR code scanning works
- [ ] Share to WhatsApp works
- [ ] Share to SMS works
- [ ] Deep linking works (hospitalqueue://)

### 5. Voice Call Testing
- [ ] Call initiation works
- [ ] Mute/unmute works
- [ ] Speaker toggle works
- [ ] Hold/resume works
- [ ] Call end works
- [ ] Call quality indicator displays

### 6. Role-Specific Testing

#### Patient App
- [ ] Queue position displays correctly
- [ ] Wait time estimate displays
- [ ] Ticket QR code displays
- [ ] Share ticket works
- [ ] Appointment booking via WhatsApp works
- [ ] Feedback/rating after visit works

#### Staff App
- [ ] Quick queue view shows compact cards
- [ ] One-tap patient call works
- [ ] Message inbox displays
- [ ] Shift schedule displays

### 7. App Store Preparation
- [ ] App icons render correctly
- [ ] Splash screen works
- [ ] Privacy policy URL configured
- [ ] Content rating set (Medical/Healthcare)
- [ ] All required permissions declared

### 8. Performance Testing
- [ ] App launches within 3 seconds
- [ ] Navigation is smooth (60fps)
- [ ] No memory leaks after extended use
- [ ] Works on low-end devices

### 9. Error Handling
- [ ] Network errors handled gracefully
- [ ] Offline errors handled with user feedback
- [ ] API errors display user-friendly messages
- [ ] Crash recovery works

### 10. Security Testing
- [ ] No sensitive data in logs
- [ ] Secure storage works correctly
- [ ] Token refresh works
- [ ] Logout clears all data

## Device-Specific Testing
- [ ] Android - various screen sizes
- [ ] Android - various OS versions (11, 12, 13, 14)
- [ ] iOS - various screen sizes
- [ ] iOS - various OS versions

## Network Conditions Testing
- [ ] 5G connection
- [ ] 4G/LTE connection
- [ ] 3G connection
- [ ] WiFi connection
- [ ] No network (airplane mode)
- [ ] Intermittent connectivity
