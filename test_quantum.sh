#!/bin/bash

# Test script for quantum scheduler
# Usage: ./test_quantum.sh

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Quantum Scheduler Test Script${NC}"
echo -e "${BLUE}=================================${NC}\n"

# Check if virtual environment exists
if [ ! -d "quantum-env" ]; then
    echo -e "${RED}❌ Virtual environment not found!${NC}"
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv quantum-env
    source quantum-env/bin/activate
    pip install -r quantum-requirements.txt
else
    echo -e "${GREEN}✅ Virtual environment found${NC}"
    source quantum-env/bin/activate
fi

# Check if test data exists
if [ ! -f "backend/temp/quantum_input.json" ]; then
    echo -e "${YELLOW}⚠️  Test data not found, creating sample data...${NC}"
    mkdir -p backend/temp
    cat > backend/temp/quantum_input.json << 'EOF'
{
  "hosts": [
    {
      "_id": "host1",
      "name": "Dr. Jane Smith",
      "organization": "MIT",
      "availability": [
        { "start": "2025-11-15T09:00:00Z", "end": "2025-11-15T17:00:00Z" }
      ]
    },
    {
      "_id": "host2",
      "name": "Prof. John Doe",
      "organization": "Stanford",
      "availability": [
        { "start": "2025-11-15T10:00:00Z", "end": "2025-11-15T16:00:00Z" }
      ]
    },
    {
      "_id": "host3",
      "name": "Dr. Alice Johnson",
      "organization": "Berkeley",
      "availability": [
        { "start": "2025-11-15T11:00:00Z", "end": "2025-11-15T18:00:00Z" }
      ]
    }
  ],
  "requests": [
    {
      "_id": "req1",
      "visitorName": "Bob Anderson",
      "organization": "Tech Corp",
      "preferredHosts": ["host1", "host2"],
      "duration": 60,
      "priority": 1
    },
    {
      "_id": "req2",
      "visitorName": "Carol White",
      "organization": "Innovation Inc",
      "preferredHosts": ["host2", "host3"],
      "duration": 45,
      "priority": 2
    },
    {
      "_id": "req3",
      "visitorName": "David Brown",
      "organization": "Future Labs",
      "preferredHosts": ["host1", "host3"],
      "duration": 30,
      "priority": 1
    },
    {
      "_id": "req4",
      "visitorName": "Emma Davis",
      "organization": "Quantum Ventures",
      "preferredHosts": ["host1", "host2", "host3"],
      "duration": 60,
      "priority": 3
    }
  ]
}
EOF
    echo -e "${GREEN}✅ Sample test data created${NC}"
fi

# Display test data info
echo -e "\n${BLUE}📊 Test Data Summary:${NC}"
HOSTS_COUNT=$(jq '.hosts | length' backend/temp/quantum_input.json)
REQUESTS_COUNT=$(jq '.requests | length' backend/temp/quantum_input.json)
echo -e "  • Hosts: ${GREEN}${HOSTS_COUNT}${NC}"
echo -e "  • Requests: ${GREEN}${REQUESTS_COUNT}${NC}"

# Run the quantum scheduler
echo -e "\n${BLUE}⚛️  Running Quantum Optimization...${NC}"
echo -e "${BLUE}===================================${NC}\n"

START_TIME=$(date +%s)

if python3 quantum/qaoa_scheduler.py backend/temp/quantum_input.json; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo -e "\n${GREEN}✅ Optimization Complete!${NC}"
    echo -e "${GREEN}⏱️  Time taken: ${DURATION} seconds${NC}\n"
    
    # Display results summary
    echo -e "${BLUE}📋 Results Summary:${NC}"
    echo -e "${BLUE}==================${NC}"
    python3 << 'PYTHON_EOF'
import json
import sys

try:
    # Read the last output (should be JSON from stdout)
    # In practice, you might want to save to a file
    print("  Check the output above for assignment results")
    print("  Each request ID shows its assignment value (0.0 or 1.0)")
    print("  1.0 = Request was scheduled")
    print("  0.0 = Request was not scheduled")
except Exception as e:
    print(f"  Could not parse results: {e}")
PYTHON_EOF
else
    echo -e "\n${RED}❌ Optimization failed!${NC}"
    exit 1
fi

echo -e "\n${GREEN}🎉 Test completed successfully!${NC}\n"

# Offer to run again
read -p "Run test again? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    exec "$0"
fi
