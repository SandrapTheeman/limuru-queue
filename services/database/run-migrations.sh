#!/bin/bash
# Run all migrations in order
# Usage: ./run-migrations.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

echo "=========================================="
echo "Running Database Migrations"
echo "=========================================="

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "Error: docker-compose is not installed"
    exit 1
fi

# Check if database container is running
CONTAINER=$(docker-compose ps -q database 2>/dev/null || echo "")
if [ -z "$CONTAINER" ]; then
    echo "Error: Database container is not running"
    echo "Please run: docker-compose up -d database"
    exit 1
fi

# Get database name and user from docker-compose
DB_NAME=$(docker-compose config 2>/dev/null | grep -A2 'database:' | grep -E '^\s+database:' | awk '{print $2}' || echo 'hospital_queue')
DB_USER=$(docker-compose config 2>/dev/null | grep -A5 'environment:' | grep 'POSTGRES_USER' | cut -d':' -f2 | tr -d ' ' || echo 'hospital_queue')

echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "Error: Migrations directory not found: $MIGRATIONS_DIR"
    exit 1
fi

# Run each migration in order
for migration in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration" ]; then
        migration_name=$(basename "$migration")
        echo "Running: $migration_name"
        
        docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$migration"
        
        if [ $? -eq 0 ]; then
            echo "  ✓ Success"
        else
            echo "  ✗ Failed"
            exit 1
        fi
        echo ""
    fi
done

echo "=========================================="
echo "All migrations completed successfully!"
echo "=========================================="
