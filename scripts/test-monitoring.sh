#!/bin/bash

# Grafana Monitoring Test Script
# This script verifies the monitoring stack is properly configured

echo "🔍 Grafana Monitoring Setup Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker-compose file exists
echo "1. Checking docker-compose configuration..."
if [ -f "docker-compose.yml" ]; then
    echo -e "${GREEN}✓${NC} docker-compose.yml found"
else
    echo -e "${RED}✗${NC} docker-compose.yml not found"
    exit 1
fi

# Validate docker-compose
echo ""
echo "2. Validating docker-compose syntax..."
if docker-compose config --quiet 2>/dev/null; then
    echo -e "${GREEN}✓${NC} docker-compose.yml is valid"
else
    echo -e "${RED}✗${NC} docker-compose.yml has syntax errors"
    exit 1
fi

# Check monitoring directories
echo ""
echo "3. Checking monitoring configuration files..."

REQUIRED_FILES=(
    "monitoring/prometheus/prometheus.yml"
    "monitoring/grafana/provisioning/datasources/prometheus.yml"
    "monitoring/grafana/provisioning/dashboards/dashboards.yml"
    "monitoring/grafana/dashboards/mongodb-dashboard.json"
    "monitoring/grafana/dashboards/redis-dashboard.json"
    "monitoring/grafana/dashboards/system-overview.json"
)

ALL_FILES_EXIST=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file (missing)"
        ALL_FILES_EXIST=false
    fi
done

if [ "$ALL_FILES_EXIST" = false ]; then
    echo -e "${RED}Some configuration files are missing${NC}"
    exit 1
fi

# Check documentation
echo ""
echo "4. Checking documentation..."
if [ -f "docs/GRAFANA_MONITORING.md" ]; then
    echo -e "${GREEN}✓${NC} docs/GRAFANA_MONITORING.md"
else
    echo -e "${YELLOW}!${NC} docs/GRAFANA_MONITORING.md (missing)"
fi

# Check if Docker is running
echo ""
echo "5. Checking Docker status..."
if docker ps > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Docker is running"
else
    echo -e "${RED}✗${NC} Docker is not running"
    echo "   Please start Docker Desktop"
    exit 1
fi

# Check if services are running
echo ""
echo "6. Checking if monitoring services are running..."

SERVICES=("prometheus" "grafana" "mongodb-exporter" "redis-exporter")
SERVICES_RUNNING=0

for service in "${SERVICES[@]}"; do
    if docker-compose ps | grep -q "agenda-manager-$service.*Up"; then
        echo -e "${GREEN}✓${NC} $service is running"
        ((SERVICES_RUNNING++))
    else
        echo -e "${YELLOW}!${NC} $service is not running"
    fi
done

if [ $SERVICES_RUNNING -eq 0 ]; then
    echo ""
    echo -e "${YELLOW}No monitoring services are running.${NC}"
    echo ""
    read -p "Would you like to start them now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "Starting monitoring services..."
        docker-compose up -d prometheus grafana mongodb-exporter redis-exporter
        echo ""
        echo "Waiting for services to start..."
        sleep 5
    fi
fi

# Test endpoints
echo ""
echo "7. Testing service endpoints..."

# Test Prometheus
if curl -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Prometheus is accessible at http://localhost:9090"
else
    echo -e "${YELLOW}!${NC} Prometheus is not accessible at http://localhost:9090"
fi

# Test Grafana
if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Grafana is accessible at http://localhost:3002"
else
    echo -e "${YELLOW}!${NC} Grafana is not accessible at http://localhost:3002"
fi

# Test MongoDB Exporter
if curl -s http://localhost:9216/metrics > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} MongoDB Exporter is accessible at http://localhost:9216"
else
    echo -e "${YELLOW}!${NC} MongoDB Exporter is not accessible at http://localhost:9216"
fi

# Test Redis Exporter
if curl -s http://localhost:9121/metrics > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Redis Exporter is accessible at http://localhost:9121"
else
    echo -e "${YELLOW}!${NC} Redis Exporter is not accessible at http://localhost:9121"
fi

# Summary
echo ""
echo "=========================================="
echo "📊 Monitoring Stack Status"
echo "=========================================="
echo ""
echo "Access URLs:"
echo "  • Grafana:    http://localhost:3002 (admin/admin123)"
echo "  • Prometheus: http://localhost:9090"
echo ""
echo "Next steps:"
echo "  1. Open Grafana at http://localhost:3002"
echo "  2. View pre-configured dashboards"
echo "  3. Check Prometheus targets at http://localhost:9090/targets"
echo ""
echo "Documentation:"
echo "  • Full guide: docs/GRAFANA_MONITORING.md"
echo "  • Quick start: QUICKSTART.md"
echo ""
