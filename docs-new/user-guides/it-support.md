# IT Support User Guide

**Role:** IT Support  
**Last Updated:** March 2026

---

## 1. Overview

As an IT Support technician, you maintain system health, troubleshoot issues, and ensure reliable operation of the hospital queue management system.

### Your Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│  IT SUPPORT DASHBOARD                                          │
├────────────────────────────────────────────────────────────────┤
│  System Status: ● Healthy    Uptime: 99.8%    Active: 24 users │
│                                                                │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │  SYSTEM HEALTH       │  │  ACTIVE TICKETS (5)  │           │
│  │  ● API: OK          │  │  #1234 - Login issue  │           │
│  │  ● Database: OK     │  │  #1235 - Display err │           │
│  │  ● Cache: OK        │  │  [+View All]         │           │
│  │  [+View Details]    │  │                      │           │
│  └──────────────────────┘  └──────────────────────┘           │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  QUICK TOOLS                                              │ │
│  │  [Logs] [Deploy] [Backup] [Users] [Settings]            │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Accessing the System

```bash
URL: https://limuruhospital.co.ke/dashboard/it
```

---

## 3. System Monitoring

### 3.1 Health Dashboard

Navigate to: **Monitor → System Health**

```markdown
┌─────────────────────────────────────────────────────────────┐
│ SYSTEM COMPONENTS                                           │
├─────────────────────────────────────────────────────────────┤
│ Component        │ Status    │ Response │ Last Check       │
│ ───────────────────────────────────────────────────────────│
│ API Server       │ ● Healthy │ 45ms     │ 10:45:30 AM      │
│ Database (D1)    │ ● Healthy │ -        │ 10:45:30 AM      │
│ KV Cache         │ ● Healthy │ -        │ 10:45:30 AM      │
│ R2 Storage       │ ● Healthy │ -        │ 10:45:30 AM      │
│ Authentication   │ ● Healthy │ -        │ 10:45:30 AM      │
│ Notifications    │ ● Healthy │ -        │ 10:45:30 AM      │
│ SMS Service      │ ● Degraded│ -        │ 10:45:30 AM      │
│ WhatsApp Service │ ● Healthy │ -        │ 10:45:30 AM      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Performance Metrics

Navigate to: **Monitor → Performance**

```markdown
┌─────────────────────────────────────────────────────────────┐
│ REAL-TIME METRICS (Last 24 hours)                          │
├─────────────────────────────────────────────────────────────┤
│ API Requests:        45,230    Avg Response: 85ms          │
│ Active Users:        24        Peak Concurrent: 42         │
│ Database Queries:    125,400   Error Rate: 0.1%            │
│ Queue Operations:    1,245     Failed: 2                   │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Alerts

Navigate to: **Monitor → Alerts**

```markdown
Active Alerts (2):
┌─────────────────────────────────────────────────────────────┐
│ ⚠ WARNING - SMS Service Latency                             │
│ Time: 10:30 AM | Duration: 15 min                           │
│ Impact: SMS delays up to 5 minutes                          │
│ Action: Monitoring, vendor contacted                        │
├─────────────────────────────────────────────────────────────┤
│ ℹ INFO - Scheduled maintenance                              │
│ Time: Tonight 11 PM - 1 AM                                  │
│ Impact: Brief interruption expected                          │
│ Action: Users notified                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Log Analysis

### 4.1 View Logs

Navigate to: **Logs → Application**

```markdown
Filter Options:
- Level: [All ▼ Error ▼ Warning ▼ Info]
- Source: [All ▼ API ▼ Auth ▼ Queue]
- Time: [Last hour ▼]
- User: [All ▼ specific user]
- Search: [keyword]
```

### 4.2 Log Entry Format

```markdown
[TIMESTAMP] [LEVEL] [SOURCE] [MESSAGE]

Example:
2026-03-21 10:45:30 INFO  API      GET /api/queue - 200 (45ms)
2026-03-21 10:45:31 INFO  AUTH     User login: doctor@hospital.co.ke
2026-03-21 10:45:32 WARN  QUEUE    Ticket MED-015 priority updated
2026-03-21 10:45:33 ERROR SMS     Twilio API timeout - retry 1/3
```

### 4.3 Search Logs

```markdown
Search by:
- Error code
- User ID
- Session token
- Request ID
- Time range
```

---

## 5. User Management

### 5.1 View All Users

Navigate to: **Users → All Users**

```markdown
User List:
┌─────────────────────────────────────────────────────────────┐
│ Name          │ Email              │ Role     │ Status     │
│ ──────────────────────────────────────────────────────────│
│ John Smith    │ jsmith@...         │ Doctor   │ ● Active   │
│ Jane Doe      │ jdoe@...          │ Nurse    │ ● Active   │
│ Bob Wilson    │ bwilson@...       │ Doctor   │ ● Active   │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Force Password Reset

1. Find user
2. Click **Actions → Reset Password**
3. User receives new temporary password

### 5.3 Terminate Session

1. Find user
2. Click **Actions → Terminate Session**
3. User logged out immediately

---

## 6. Troubleshooting

### 6.1 Common Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Login failures | Multiple 401 errors | Check auth service, verify credentials |
| Slow API | High response times | Check database, clear cache |
| Queue not updating | Stale display | Restart queue sync, check WebSocket |
| SMS not sending | Failed notifications | Check Twilio config, verify balance |
| User locked out | 403 errors after login | Reset password, check attempts |

### 6.2 Diagnostic Commands

```bash
# Check API health
curl https://api.limuruhospital.co.ke/api/health

# Clear cache
wrangler kv:key delete --namespace-id=<id> cache:all

# Check database
wrangler d1 execute limuru-queue-db --command "SELECT COUNT(*) FROM queue"

# View recent errors
wrangler tail --status error
```

### 6.3 Escalation

```markdown
Escalate to:
- Admin: Critical system issues
- Cloudflare Support: Infrastructure issues
- Third-party vendors: Service-specific issues
```

---

## 7. Deployment

### 7.1 Deploy Updates

Navigate to: **Deploy → Pipeline**

```bash
# Local deployment
cd apps/api
wrangler deploy --env production

# Check deployment status
wrangler deployments list
```

### 7.2 Rollback

```bash
# List deployments
wrangler deployments list

# Rollback to previous
wrangler deployments rollback <deployment-id>
```

### 7.3 Environment Variables

Navigate to: **Settings → Environment**

```markdown
Current Environment Variables:
┌─────────────────────────────────────────────────────────────┐
│ Variable           │ Value              │ Last Updated     │
│ ──────────────────────────────────────────────────────────│
│ JWT_SECRET          │ ●●●●●●●●           │ Mar 15, 2026     │
│ TWILIO_SID          │ AC●●●●●●●          │ Mar 10, 2026     │
│ DEFAULT_PASSWORD    │ ●●●●●●             │ Mar 15, 2026     │
└─────────────────────────────────────────────────────────────┘

[+ Add Variable] [Edit] [View History]
```

---

## 8. Backup & Recovery

### 8.1 Manual Backup

Navigate to: **Backup → Create**

```bash
# Create backup via CLI
wrangler d1 export limuru-queue-db --output backup-$(date +%Y%m%d).sql
```

### 8.2 Restore from Backup

1. Navigate to **Backup → History**
2. Select backup point
3. Click **Restore**
4. Confirm restoration

```bash
# Restore via CLI
wrangler d1 execute limuru-queue-db --file=backup-20260320.sql
```

### 8.3 Backup Schedule

```markdown
Automated Backups:
- Daily: 2:00 AM
- Weekly: Sunday 1:00 AM
- Retain: 30 days

Last Backup: March 21, 2026 2:00 AM
Status: ✓ Success
Size: 15 MB
```

---

## 9. Security

### 9.1 Security Dashboard

Navigate to: **Security → Overview**

```markdown
Security Status: ✓ Secure

Active Sessions: 24
Failed Logins (24h): 3
Password Resets (24h): 2
New Users (7d): 5
```

### 9.2 Audit Logs

Navigate to: **Security → Audit Logs**

View all security-related events:
- Login attempts
- Password changes
- Permission changes
- Data access

### 9.3 API Keys

Navigate to: **Security → API Keys**

```markdown
Active API Keys:
┌─────────────────────────────────────────────────────────────┐
│ Key Name      │ Created     │ Last Used   │ Permissions     │
│ ──────────────────────────────────────────────────────────│
│ HMS Integration│ Mar 15      │ Today 10 AM │ Read/Write HMS  │
│ Mobile App    │ Feb 20      │ Today 10 AM │ Read only       │
└─────────────────────────────────────────────────────────────┘

[+ Create Key] [Revoke] [View Logs]
```

---

## 10. Performance Optimization

### 10.1 Cache Management

Navigate to: **Performance → Cache**

```markdown
Cache Hit Rate: 87%
Cache Size: 245 MB / 500 MB

Actions:
[Clear All Cache] [Clear Expired] [View Stats]
```

### 10.2 Database Optimization

```bash
# Check slow queries
wrangler d1 execute limuru-queue-db --command "
  EXPLAIN QUERY PLAN SELECT * FROM queue 
  WHERE status = 'waiting' 
  ORDER BY created_at
"

# Rebuild indexes
wrangler d1 execute limuru-queue-db --command "
  REINDEX
"
```

---

## 11. Documentation

### 11.1 System Documentation

Access technical documentation:
- Architecture diagrams
- API documentation
- Deployment guides
- Troubleshooting guides

### 11.2 Incident Reports

Create incident reports:
1. Navigate to **Incidents → New**
2. Fill details:
   - Description
   - Impact
   - Resolution
   - Lessons learned

---

## 12. Quick Reference

| Task | Steps |
|------|-------|
| Check system health | Dashboard → System Health |
| View logs | Logs → Application |
| Reset user password | Users → Select → Reset |
| Create backup | Backup → Create Now |
| Restore backup | Backup → History → Restore |
| Deploy update | Deploy → Pipeline → Deploy |
| Rollback | Deploy → History → Rollback |

---

## 13. Command Reference

```bash
# Wrangler Commands
wrangler deploy --env production
wrangler tail --env production
wrangler secret list
wrangler d1 execute limuru-queue-db --command "SQL"
wrangler d1 migrations apply limuru-queue-db

# KV Commands
wrangler kv:namespace list
wrangler kv:key list --namespace-id=<id>

# Deployment
wrangler deployments list
wrangler deployments rollback <id>
```

---

## 14. Emergency Contacts

```markdown
Escalation Path:
1. System Down: Call Admin (+254-XXX-XXXX)
2. Data Breach: Contact Security immediately
3. Cloudflare Issues: Open ticket at dash.cloudflare.com
4. Twilio Issues: Contact Twilio support
```

---

## 15. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `M` | View monitor |
| `L` | View logs |
| `U` | View users |
| `D` | Deployment tools |
| `B` | Backup/restore |
| `S` | Security dashboard |
