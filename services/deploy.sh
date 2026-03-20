#!/bin/bash

# Hospital Queue System - Deployment Script

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🏥 Hospital Queue System Deployment${NC}"
echo "========================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    exit 1
fi

# Function to display usage
usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start     - Start all services"
    echo "  stop      - Stop all services"
    echo "  restart   - Restart all services"
    echo "  logs      - View logs"
    echo "  status    - View service status"
    echo "  clean    - Remove all containers and volumes"
    echo "  rebuild  - Rebuild and restart services"
}

# Parse command
COMMAND=${1:-start}

case $COMMAND in
    start)
        echo -e "${YELLOW}Starting services...${NC}"
        cd "$(dirname "$0")"
        docker-compose up -d
        echo -e "${GREEN}✓ Services started${NC}"
        echo ""
        echo "Access points:"
        echo "  - Web App: http://localhost:3000"
        echo "  - API: http://localhost:8787"
        echo "  - Database: localhost:5432"
        ;;
        
    stop)
        echo -e "${YELLOW}Stopping services...${NC}"
        cd "$(dirname "$0")"
        docker-compose down
        echo -e "${GREEN}✓ Services stopped${NC}"
        ;;
        
    restart)
        echo -e "${YELLOW}Restarting services...${NC}"
        cd "$(dirname "$0")"
        docker-compose restart
        echo -e "${GREEN}✓ Services restarted${NC}"
        ;;
        
    logs)
        cd "$(dirname "$0")"
        docker-compose logs -f
        ;;
        
    status)
        cd "$(dirname "$0")"
        docker-compose ps
        ;;
        
    clean)
        echo -e "${YELLOW}Removing all containers and volumes...${NC}"
        cd "$(dirname "$0")"
        docker-compose down -v
        echo -e "${GREEN}✓ Cleaned up${NC}"
        ;;
        
    rebuild)
        echo -e "${YELLOW}Rebuilding services...${NC}"
        cd "$(dirname "$0")"
        docker-compose up -d --build
        echo -e "${GREEN}✓ Services rebuilt and started${NC}"
        ;;
        
    *)
        usage
        exit 1
        ;;
esac
