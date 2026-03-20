#!/bin/bash
# Hospital Queue System - Database Backup Script

# Configuration
BACKUP_DIR="./backups"
DATABASE_NAME="hospital_queue"
DATABASE_USER="hospital_queue"
KEEP_DAYS=30

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"

# Log start
echo "[$(date)] Starting backup..."

# Create backup with compression
docker-compose exec -T database pg_dump -U "$DATABASE_USER" -d "$DATABASE_NAME" | gzip > "$BACKUP_FILE"

# Check if backup succeeded
if [ $? -eq 0 ]; then
    echo "[$(date)] Backup completed: $BACKUP_FILE"
    echo "[$(date)] Backup size: $(du -h $BACKUP_FILE | cut -f1)"
else
    echo "[$(date)] Backup FAILED!"
    exit 1
fi

# Remove old backups (older than KEEP_DAYS)
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$KEEP_DAYS -delete
echo "[$(date)] Removed backups older than $KEEP_DAYS days"
