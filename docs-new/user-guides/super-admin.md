# Super Admin User Guide

**Role:** Super Admin  
**System Access Level:** Full system-wide access  
**Last Updated:** March 2026

---

## 1. Overview

As a Super Admin, you have complete system-wide access to manage all facilities, configurations, and users across the Limuru Cottage Hospital Queue Management System.

### Your Capabilities

| Feature | Access Level |
|---------|--------------|
| Multi-facility Management | Full |
| User Management | All users, all facilities |
| System Configuration | Global settings |
| Audit Logs | System-wide |
| Analytics | All facilities |
| Security Settings | Full |

---

## 2. Accessing the System

### Login Credentials

```bash
URL: https://limuruhospital.co.ke/login
Email: superadmin@limuruhospital.co.ke
Password: [Your secure password]
```

### First-time Login

1. Navigate to the login page
2. Enter your admin credentials
3. You will be prompted to change your password
4. Set a strong password (minimum 12 characters, mixed case, numbers, symbols)
5. Complete your profile setup

---

## 3. Dashboard Overview

### Main Dashboard

The Super Admin dashboard provides:

```
┌────────────────────────────────────────────────────────────────┐
│  SUPER ADMIN DASHBOARD                                        │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Total Users  │  │   Active     │  │  Departments │        │
│  │     156      │  │   Sessions   │  │      12       │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                │
│  ┌────────────────────────────────────────────────────┐       │
│  │  FACILITY OVERVIEW                                  │       │
│  │  [Main Hospital] [Clinic A] [Clinic B] [+ Add]     │       │
│  └────────────────────────────────────────────────────┘       │
│                                                                │
│  ┌────────────────────────────────────────────────────┐       │
│  │  SYSTEM STATUS                                      │       │
│  │  ● API: Healthy  ● Database: Connected  ● Cache: OK │       │
│  └────────────────────────────────────────────────────┘       │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. Facility Management

### 4.1 View All Facilities

Navigate to: **Settings → Facilities**

| Column | Description |
|--------|-------------|
| Facility Name | Official facility name |
| Location | Physical address |
| Active Users | Currently logged in |
| Status | Active/Inactive |
| Actions | Edit, View, Disable |

### 4.2 Create New Facility

1. Go to **Settings → Facilities**
2. Click **+ Add Facility**
3. Fill in the details:

```markdown
Facility Name: [Clinic Name]
Facility Code: [3-letter code, e.g., CLN]
Address: [Physical address]
Phone: [Contact number]
Email: [Contact email]
Timezone: [Africa/Nairobi]
```

4. Click **Create Facility**

### 4.3 Configure Facility Settings

1. Select a facility
2. Navigate to **Settings → [Facility Name]**
3. Configure:
   - Working hours
   - Departments
   - Default priorities
   - Notification preferences

---

## 5. User Management

### 5.1 View All Users

Navigate to: **Users → All Users**

```markdown
Filters:
- Role: [All roles dropdown]
- Facility: [All facilities dropdown]
- Status: [Active/Inactive/All]
- Search: [Name, email, or ID]
```

### 5.2 Create New User

1. Go to **Users → All Users**
2. Click **+ Add User**
3. Complete the form:

```markdown
Personal Information:
- Full Name: [Required]
- Email: [Required, unique]
- Phone: [Optional]
- Role: [Select from dropdown]

Assignment:
- Facility: [Primary facility]
- Department: [Assigned department]
- Room: [Office/room number]

Security:
- Send welcome email: [Checkbox]
- Force password change: [Checkbox]
```

4. Click **Create User**
5. User will receive login credentials via email

### 5.3 User Roles

| Role | Description | Typical Count |
|------|-------------|---------------|
| Super Admin | System-wide access | 1-2 |
| Admin | Facility-level management | 2-4 |
| IT Support | Technical administration | 2-3 |
| Facility Manager | Resource management | 1-2 |
| Doctor | Clinical services | Variable |
| Nurse | Patient care | Variable |
| Receptionist | Patient services | Variable |
| Pharmacist | Medication services | 1-2 |
| Lab Technician | Laboratory services | 1-2 |
| Patient | Self-service portal | Unlimited |

### 5.4 Reset User Password

1. Find the user in **Users → All Users**
2. Click the **Actions** menu
3. Select **Reset Password**
4. Choose:
   - Send reset email to user
   - Set temporary password (auto-generated)
5. Click **Reset**

---

## 6. System Configuration

### 6.1 Global Settings

Navigate to: **Settings → System → Global**

| Setting | Description | Default |
|---------|-------------|---------|
| System Name | Display name | Limuru Cottage Hospital |
| Timezone | System timezone | Africa/Nairobi |
| Date Format | Date display format | DD/MM/YYYY |
| Time Format | Time display (12h/24h) | 12h |
| Language | Default UI language | English |
| Session Timeout | Auto-logout time | 24 hours |

### 6.2 Security Settings

Navigate to: **Settings → System → Security**

```markdown
Authentication:
□ Enable two-factor authentication
□ Enforce strong passwords (min 12 chars)
□ Password expiry: [30/60/90/never] days
□ Login attempts before lockout: [3/5/10]

Session Management:
□ Single session per user
□ Remember me duration: [7/14/30] days
□ Force logout on browser close
```

### 6.3 API Configuration

Navigate to: **Settings → System → API**

```markdown
Rate Limits:
- Public endpoints: [30] requests/minute
- Authenticated: [100] requests/minute
- Auth endpoints: [5] attempts/15 minutes

API Access:
□ Enable API access
□ API key management
□ Webhook configuration
□ Integration logs
```

---

## 7. Audit Logs

### 7.1 View Audit Logs

Navigate to: **Logs → Audit Trail**

```markdown
Filters:
- Date Range: [Start date] to [End date]
- User: [Select user]
- Action Type: [All actions dropdown]
- Entity Type: [Patient/User/Queue/Settings]
- Facility: [All facilities]
```

### 7.2 Export Audit Logs

1. Set your filters
2. Click **Export**
3. Choose format:
   - CSV (for spreadsheets)
   - JSON (for developers)
   - PDF (for reports)
4. Click **Download**

### 7.3 Audit Log Fields

| Field | Description |
|-------|-------------|
| Timestamp | When the action occurred |
| User | Who performed the action |
| Role | User's role at time of action |
| Action | What was done |
| Entity Type | Type of record affected |
| Entity ID | ID of affected record |
| IP Address | User's IP address |
| Details | Additional context |

---

## 8. Analytics & Reporting

### 8.1 System Overview

Navigate to: **Analytics → Overview**

Shows metrics across all facilities:
- Total patients
- Active queues
- Average wait times
- Completion rates

### 8.2 Generate Reports

1. Go to **Analytics → Reports**
2. Select report type:
   - Patient Volume Report
   - Wait Time Analysis
   - Staff Performance
   - Department Metrics
3. Set parameters:
   - Date range
   - Facilities to include
   - Department filters
4. Click **Generate Report**
5. Download or schedule recurring reports

### 8.3 Scheduled Reports

1. Go to **Analytics → Scheduled Reports**
2. Click **+ New Schedule**
3. Configure:
   ```markdown
   Report Type: [Select]
   Frequency: [Daily/Weekly/Monthly]
   Time: [Select time]
   Recipients: [Email addresses]
   Format: [PDF/CSV/Excel]
   ```
4. Click **Save Schedule**

---

## 9. Backup & Recovery

### 9.1 Backup Management

Navigate to: **Settings → System → Backup**

```markdown
Backup Status:
- Last Backup: [DateTime]
- Next Scheduled: [DateTime]
- Backup Size: [Size]
- Location: Cloudflare R2

Actions:
[Create Backup Now]  [View History]  [Configure Schedule]
```

### 9.2 Restore from Backup

1. Go to **Settings → System → Backup**
2. Click **View History**
3. Select a backup point
4. Click **Restore**
5. Confirm restoration
6. System will restore and restart

---

## 10. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Cannot access facility | Check user permissions for that facility |
| API errors | Check system status in dashboard |
| Slow performance | Review active sessions and clear cache |
| User locked out | Reset password from user management |

### Get Help

| Channel | Contact |
|---------|---------|
| Internal IT | it-support@limuruhospital.co.ke |
| Documentation | docs.limuruhospital.co.ke |
| Emergency | +254-XXX-XXXX |

---

## 11. Best Practices

### Security

- Use strong, unique passwords
- Enable two-factor authentication
- Review audit logs weekly
- Follow principle of least privilege

### Operations

- Schedule reports during off-peak hours
- Perform backups before major changes
- Test restore procedures quarterly
- Keep user roles updated

---

## 12. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + U` | Open user management |
| `Ctrl + S` | Open settings |
| `Ctrl + A` | Open analytics |
| `Ctrl + L` | View audit logs |
| `Ctrl + /` | Show help |
