#!/bin/bash

# Test scenario runner for quantum scheduler
# Usage: ./run_test_scenarios.sh [small|medium|large|all]

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TIME=0

echo -e "${PURPLE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║  🧪 Quantum Scheduler Test Suite Runner       ║${NC}"
echo -e "${PURPLE}╚════════════════════════════════════════════════╝${NC}\n"

# Check if virtual environment exists
if [ ! -d "quantum-env" ]; then
    echo -e "${RED}❌ Virtual environment not found!${NC}"
    exit 1
fi

source quantum-env/bin/activate

# Function to run a single test
run_test() {
    local test_file=$1
    local test_name=$2
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🚀 Running: ${test_name}${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    # Get test info
    local hosts_count=$(jq '.hosts | length' "$test_file")
    local requests_count=$(jq '.requests | length' "$test_file")
    
    echo -e "${BLUE}📊 Test Configuration:${NC}"
    echo -e "  • File: ${test_file}"
    echo -e "  • Hosts: ${GREEN}${hosts_count}${NC}"
    echo -e "  • Requests: ${GREEN}${requests_count}${NC}"
    
    # Calculate expected solver
    if [ "$requests_count" -gt 20 ]; then
        echo -e "  • Expected Solver: ${YELLOW}Classical (>20 vars)${NC}"
    else
        echo -e "  • Expected Solver: ${PURPLE}QAOA Quantum${NC}"
    fi
    
    echo ""
    
    # Run the test
    START_TIME=$(date +%s)
    
    if OUTPUT=$(python3 quantum/qaoa_scheduler.py "$test_file" 2>&1); then
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        TOTAL_TIME=$((TOTAL_TIME + DURATION))
        
        # Parse results
        RESULT_JSON=$(echo "$OUTPUT" | tail -n 1)
        
        if echo "$RESULT_JSON" | jq . >/dev/null 2>&1; then
            SCHEDULED=$(echo "$RESULT_JSON" | jq '[.[] | select(. > 0.5)] | length')
            
            echo -e "${GREEN}✅ Test PASSED${NC}"
            echo -e "${GREEN}⏱️  Execution time: ${DURATION}s${NC}"
            echo -e "${GREEN}📋 Results: ${SCHEDULED}/${requests_count} requests scheduled${NC}"
            
            # Show solver used
            if echo "$OUTPUT" | grep -q "Using QAOA"; then
                echo -e "${PURPLE}⚛️  Solver: QAOA Quantum${NC}"
            elif echo "$OUTPUT" | grep -q "classical solver"; then
                echo -e "${YELLOW}🔢 Solver: Classical NumPy${NC}"
            fi
            
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}❌ Test FAILED: Invalid JSON output${NC}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    else
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        
        echo -e "${RED}❌ Test FAILED: Execution error${NC}"
        echo -e "${RED}⏱️  Failed after: ${DURATION}s${NC}"
        echo -e "${RED}Error output:${NC}"
        echo "$OUTPUT" | tail -n 10
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    echo -e "\n"
}

# Function to display summary
show_summary() {
    local total_tests=$((TESTS_PASSED + TESTS_FAILED))
    local pass_rate=0
    
    if [ "$total_tests" -gt 0 ]; then
        pass_rate=$((TESTS_PASSED * 100 / total_tests))
    fi
    
    echo -e "${PURPLE}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║           📊 Test Suite Summary                ║${NC}"
    echo -e "${PURPLE}╚════════════════════════════════════════════════╝${NC}\n"
    
    echo -e "  Total Tests:    ${BLUE}${total_tests}${NC}"
    echo -e "  Passed:         ${GREEN}${TESTS_PASSED}${NC}"
    echo -e "  Failed:         ${RED}${TESTS_FAILED}${NC}"
    echo -e "  Pass Rate:      ${CYAN}${pass_rate}%${NC}"
    echo -e "  Total Time:     ${YELLOW}${TOTAL_TIME}s${NC}"
    
    echo ""
    
    if [ "$TESTS_FAILED" -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed successfully!${NC}\n"
        exit 0
    else
        echo -e "${RED}⚠️  Some tests failed. Please review the output above.${NC}\n"
        exit 1
    fi
}

# Main execution
case "${1:-all}" in
    small)
        run_test "test_scenarios/small_test.json" "Small Test (2 hosts, 3 requests)"
        show_summary
        ;;
    medium)
        run_test "test_scenarios/medium_test.json" "Medium Test (5 hosts, 8 requests)"
        show_summary
        ;;
    large)
        run_test "test_scenarios/large_test.json" "Large Test (10 hosts, 25 requests)"
        show_summary
        ;;
    all)
        run_test "test_scenarios/small_test.json" "Small Test (2 hosts, 3 requests)"
        run_test "test_scenarios/medium_test.json" "Medium Test (5 hosts, 8 requests)"
        run_test "test_scenarios/large_test.json" "Large Test (10 hosts, 25 requests)"
        show_summary
        ;;
    *)
        echo -e "${RED}Usage: $0 [small|medium|large|all]${NC}"
        exit 1
        ;;
esac
