#!/bin/bash
# Reset database (WARNING: Destroys all data)
# Usage: ./reset.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "⚠️  WARNING: Database Reset"
echo "=========================================="
echo "This will DESTROY all existing data!"
echo ""

# Prompt for confirmation
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Resetting database..."

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "Error: docker-compose is not installed"
    exit 1
fi

# Get docker-compose file location
if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
    COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
elif [ -f "$SCRIPT_DIR/docker-compose.yaml" ]; then
    COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yaml"
elif [ -f "$SCRIPT_DIR/../docker-compose.yml" ]; then
    COMPOSE_FILE="$SCRIPT_DIR/../docker-compose.yml"
else
    COMPOSE_FILE="docker-compose.yml"
fi

cd "$SCRIPT_DIR"

# Stop and remove existing database volume
echo "Stopping database container..."
docker-compose -f "$COMPOSE_FILE" down -v 2>/dev/null || docker compose down -v 2>/dev/null || true

# Start database container
echo "Starting database container..."
docker-compose -f "$COMPOSE_FILE" up -d database 2>/dev/null || docker compose up -d database 2>/dev/null

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 5

# Retry waiting for database
for i in {1..30}; do
    if docker exec $(docker-compose ps -q database 2>/dev/null || docker compose ps -q database 2>/dev/null) pg_isready -U hospital_queue &>/dev/null; then
        echo "Database is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "Error: Database did not become ready in time"
        exit 1
    fi
    sleep 2
done

sleep 2

# Get container name
CONTAINER=$(docker-compose ps -q database 2>/dev/null || docker compose ps -q database 2>/dev/null)

# Run init.sql
echo "Running init.sql..."
docker exec -i "$CONTAINER" psql -U hospital_queue -d hospital_queue < "$SCRIPT_DIR/init.sql"

# Run seed.sql if it exists
if [ -f "$SCRIPT_DIR/seed.sql" ]; then
    echo "Running seed.sql..."
    docker exec -i "$CONTAINER" psql -U hospital_queue -d hospital_queue < "$SCRIPT_DIR/seed.sql"
fi

echo ""
echo "=========================================="
echo "✓ Database reset complete!"
echo "=========================================="
echo ""
echo "You can now start the full stack with:"
echo "  cd $SCRIPT_DIR && docker-compose up -d"
