#!/bin/bash
# Hospital Queue System - Database Reset Script
# WARNING: This deletes ALL data!

set -e

echo "⚠️  WARNING: This will delete ALL database data!"
echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."

sleep 5

# Database connection
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-hospital_queue}
DB_USER=${DB_USER:-hospital_queue}
DB_PASSWORD=${DB_PASSWORD:-hospital_queue_pass}

echo "📦 Connecting to PostgreSQL at $DB_HOST:$DB_PORT..."

export PGPASSWORD=$DB_PASSWORD

# Drop all tables
echo "🗑️  Dropping all tables..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;
EOF

# Drop migrations table
echo "🗑️  Dropping migrations table..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "DROP TABLE IF EXISTS migrations CASCADE;"

echo "✅ Database reset complete!"
echo ""
echo "Next steps:"
echo "  1. Run migrations: docker exec hqs-api npm run db:migrate"
echo "  2. Or use: docker-compose exec api npm run db:migrate"
