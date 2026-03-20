# Hospital Queue System - Cron & Backup Documentation

## Automated Daily Backups

### Setup Cron Job

1. Open crontab editor:
```bash
crontab -e
```

2. Add the following line for daily backups at 2 AM:
```bash
0 2 * * * cd /path/to/Cottage-Queuing-System/services && ./backup.sh >> ../logs/backup.log 2>&1
```

3. Alternative: Run backup every 6 hours:
```bash
0 */6 * * * cd /path/to/Cottage-Queuing-System/services && ./backup.sh >> ../logs/backup.log 2>&1
```

### Cron Format Reference
```
* * * * * command
│ │ │ │ │
│ │ │ │ └── Day of week (0-7, Sunday=0)
│ │ │ └──── Month (1-12)
│ │ └────── Day of month (1-31)
│ └──────── Hour (0-23)
└────────── Minute (0-59)
```

## Offsite Backup to S3

### Prerequisites
```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure
```

### S3 Backup Script

Create `backup-to-s3.sh`:
```bash
#!/bin/bash
# Upload latest backup to S3

S3_BUCKET="s3://your-bucket/hospital-queue-backups"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Find the latest backup
LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/backup_*.sql.gz | head -1)

if [ -n "$LATEST_BACKUP" ]; then
    echo "Uploading $LATEST_BACKUP to S3..."
    aws s3 cp "$LATEST_BACKUP" "${S3_BUCKET}/"
    aws s3 cp "$LATEST_BACKUP" "${S3_BUCKET}/latest.sql.gz"
    echo "Upload completed"
else
    echo "No backup found to upload"
    exit 1
fi
```

### Cron for S3 Sync (runs after local backup)
```bash
0 3 * * * cd /path/to/Cottage-Queuing-System/services && ./backup-to-s3.sh >> ../logs/s3-backup.log 2>&1
```

## Restore Procedures

### Local Restore

1. List available backups:
```bash
./restore.sh
```

2. Restore from specific backup:
```bash
./restore.sh ./backups/backup_20240315_120000.sql.gz
```

3. Confirm when prompted with "yes"

### S3 Restore

1. Download from S3:
```bash
aws s3 cp s3://your-bucket/hospital-queue-backups/latest.sql.gz ./backups/
```

2. Restore:
```bash
./restore.sh ./backups/latest.sql.gz
```

### Point-in-Time Restore (if using S3 with versioning)

1. List available versions:
```bash
aws s3api list-object-versions --bucket your-bucket --prefix hospital-queue-backups/
```

2. Download specific version:
```bash
aws s3 cp s3://your-bucket/hospital-queue-backups/latest.sql.gz ./backups/restore.sql.gz --version-id VERSION_ID
```

3. Restore:
```bash
./restore.sh ./backups/restore.sql.gz
```

## Backup Verification

### Test Restore
```bash
# Create test database
docker-compose exec database psql -U hospital_queue -c "CREATE DATABASE hospital_queue_test;"

# Restore to test database
gunzip -c ./backups/backup_latest.sql.gz | docker-compose exec -T database psql -U hospital_queue -d hospital_queue_test

# Verify data
docker-compose exec database psql -U hospital_queue -d hospital_queue_test -c "\dt"
```

### Health Check Script
```bash
#!/bin/bash
# verify-backup.sh

BACKUP_DIR="./backups"
LATEST=$(ls -t "${BACKUP_DIR}"/backup_*.sql.gz | head -1)

if [ -z "$LATEST" ]; then
    echo "ERROR: No backup found"
    exit 1
fi

# Check backup age (fail if older than 25 hours)
AGE_HOURS=$(find "$LATEST" -mmin +1500 | wc -l)
if [ "$AGE_HOURS" -gt 0 ]; then
    echo "WARNING: Latest backup is older than 25 hours"
fi

# Check backup size (fail if smaller than 1KB)
SIZE=$(stat -f%z "$LATEST" 2>/dev/null || stat -c%s "$LATEST")
if [ "$SIZE" -lt 1024 ]; then
    echo "ERROR: Backup file suspiciously small"
    exit 1
fi

echo "Backup verification passed"
exit 0
```
