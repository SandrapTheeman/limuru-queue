# HMS Adapter Setup Guide

## Overview

The Hospital Management System (HMS) adapter provides integration between the Limuru Cottage Hospital Queue Management System and various hospital information systems including OpenMRS, Bahmni, and OpenELIS.

## Supported HMS Systems

### OpenMRS
- **Type**: `openmrs`
- **Description**: OpenMRS is an open-source electronic medical record system
- **API**: REST API at `/ws/rest/v1`
- **Features**:
  - Patient search and retrieval
  - Patient creation and update
  - Appointment management
  - Provider/doctor listing
  - Lab order submission
  - Lab result retrieval

### Bahmni
- **Type**: `bahmni`
- **Description**: Bahmni is a distribution of OpenMRS tailored for resource-constrained environments
- **API**: REST API at `/openmrs/ws/rest/v1` and `/bahmnicore`
- **Features**: Same as OpenMRS with additional Bahmni-specific endpoints

### OpenELIS
- **Type**: `openelis`
- **Description**: OpenELIS is a laboratory information system
- **API**: REST API at `/rest`
- **Features**:
  - Lab order submission
  - Lab result retrieval
  - Sample tracking

### Mock
- **Type**: `mock`
- **Description**: For testing without a real HMS
- **Features**: Full feature set for testing purposes

## Environment Variables

Configure the following environment variables in your `wrangler.toml` or Cloudflare dashboard:

| Variable | Required | Description |
|----------|----------|-------------|
| `HMS_TYPE` | No | Adapter type: `mock`, `openmrs`, `bahmni`, `openelis`. Defaults to `mock` |
| `HMS_BASE_URL` | Yes* | Base URL of the HMS instance (*required for non-mock adapters) |
| `HMS_USERNAME` | Yes* | Username for HMS authentication (*required for OpenMRS/Bahmni) |
| `HMS_PASSWORD` | Yes* | Password for HMS authentication (*required for OpenMRS/Bahmni) |
| `HMS_FACILITY_ID` | No | Facility identifier for multi-facility deployments |
| `HMS_SYNC_INTERVAL` | No | Sync interval in minutes (default: 15) |
| `HMS_SYNC_RETRIES` | No | Number of retry attempts on sync failure (default: 3) |

## API Endpoints

### Patient Operations
```
GET  /api/hms/patients?q=<query>     - Search patients
GET  /api/hms/patients/:id            - Get patient details
GET  /api/hms/patients/:id/appointments - Get patient's appointments
POST /api/hms/patients                - Create new patient
PATCH /api/hms/patients/:id          - Update patient
```

### Appointment Operations
```
GET    /api/hms/appointments?date=<date> - Get appointments for date
POST   /api/hms/appointments           - Create appointment
DELETE /api/hms/appointments/:id       - Cancel appointment
```

### Doctor Operations
```
GET /api/hms/doctors?department=<id> - List doctors
GET /api/hms/doctors/:id/availability - Check doctor availability
```

### Lab Operations
```
GET /api/hms/lab/orders/:patientId  - Get lab orders
GET /api/hms/lab/results/:orderId   - Get lab results
POST /api/hms/lab/orders            - Submit lab order
GET /api/hms/lab/samples            - List lab samples
```

### Sync Operations
```
POST /api/hms/sync                  - Trigger sync (body: { type: 'patients' | 'appointments' | 'all', date?: string })
GET  /api/hms/sync/status           - Get sync status
```

### Configuration
```
GET  /api/hms/status                - Get adapter status and configuration
POST /api/hms/test-connection       - Test HMS connection
```

## Usage Examples

### Searching Patients
```bash
curl -X GET "http://localhost:8787/api/hms/patients?q=John" \
  -H "Authorization: Bearer <token>"
```

### Creating Patient
```bash
curl -X POST "http://localhost:8787/api/hms/patients" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+254700000001",
    "email": "john@example.com",
    "date_of_birth": "1990-01-01",
    "gender": "male"
  }'
```

### Triggering Sync
```bash
curl -X POST "http://localhost:8787/api/hms/sync" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "all",
    "date": "2024-01-15"
  }'
```

## Background Sync Job

The HMS sync job runs periodically to synchronize patients and appointments from the HMS. Configure the cron trigger in `wrangler.toml`:

```toml
[[triggers]]
crons = ["*/15 * * * *"]  # Every 15 minutes
```

The sync job:
1. Fetches all patients from HMS and creates local records
2. Fetches appointments for the current day
3. Handles errors with configurable retry logic

## Error Handling

All HMS operations return standard error responses:

```json
{
  "success": false,
  "error": "Error message"
}
```

Common error codes:
- `404`: Patient/appointment not found
- `500`: HMS connection error or internal error
- `400`: Invalid request data

## Security Considerations

1. **HTTPS**: Always use HTTPS in production
2. **Credentials**: Store HMS credentials as secrets, not in code
3. **Rate Limiting**: Implement rate limiting for HMS API calls
4. **Audit Logging**: All HMS operations are logged for compliance

## Troubleshooting

### Connection Test Fails
- Verify HMS_BASE_URL is correct and accessible
- Check username and password are valid
- Ensure network connectivity to HMS

### Sync Fails
- Check sync status endpoint for error details
- Verify HMS has data for the specified date
- Review Cloudflare logs for detailed error messages

### Patient Search Returns Empty
- Verify patient data exists in HMS
- Check search query parameters
- Review HMS API response in logs