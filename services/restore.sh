#!/bin/bash
# Hospital Queue System - Database Restore Script

# Usage: ./restore.sh backup_20240315_120000.sql.gz

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_file>"
    echo "Available backups:"
    ls -la ./backups/
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "[$(date)] Starting restore from: $BACKUP_FILE"

# Confirm before destructive operation
read -p "This will overwrite the current database. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Restore
gunzip -c "$BACKUP_FILE" | docker-compose exec -T database psql -U hospital_queue -d hospital_queue

if [ $? -eq 0 ]; then
    echo "[$(date)] Restore completed successfully"
else
    echo "[$(date)] Restore FAILED!"
    exit 1
fi
