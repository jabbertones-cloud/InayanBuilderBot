#!/bin/bash

###############################################################################
# MorningOps Desktop - K6 Load Testing Runner
#
# Convenient script to run various load test scenarios with proper options
# and result collection.
#
# Usage:
#   ./run-tests.sh [smoke|load|stress|spike|soak|user-journey|all]
#   ./run-tests.sh smoke --env BASE_URL=https://staging.morningops.app
#   ./run-tests.sh all --quick
#
###############################################################################

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"
SCENARIOS_DIR="${SCRIPT_DIR}/scenarios"

# Create results directory
mkdir -p "${RESULTS_DIR}"

# Configuration
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BASE_URL="${BASE_URL:-http://localhost:3000}"
QUICK_MODE=false
CLOUD_MODE=false

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo -e "${BLUE}┌────────────────────────────────────────────────────┐${NC}"
    echo -e "${BLUE}│ $1${NC}"
    echo -e "${BLUE}└────────────────────────────────────────────────────┘${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

print_success() {
    echo -e "${GREEN}✓${NC}  $1"
}

print_error() {
    echo -e "${RED}✗${NC}  $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

check_k6_installed() {
    if ! command -v k6 &> /dev/null; then
        print_error "K6 is not installed or not in PATH"
        echo ""
        echo "Install K6 from: https://k6.io/docs/getting-started/installation"
        exit 1
    fi
    print_success "K6 found: $(k6 version)"
}

check_backend_health() {
    print_info "Checking backend health at ${BASE_URL}/api/health..."

    if ! response=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/health" 2>/dev/null); then
        print_error "Cannot connect to backend at ${BASE_URL}"
        return 1
    fi

    http_code=$(echo "${response}" | tail -n 1)

    if [ "${http_code}" = "200" ]; then
        print_success "Backend is healthy (HTTP ${http_code})"
        return 0
    else
        print_warning "Backend returned HTTP ${http_code}"
        return 1
    fi
}

run_test() {
    local test_name="$1"
    local scenario_file="${SCENARIOS_DIR}/${test_name}.js"
    local result_html="${RESULTS_DIR}/${test_name}-${TIMESTAMP}.html"
    local result_json="${RESULTS_DIR}/${test_name}-${TIMESTAMP}.json"
    shift

    if [ ! -f "${scenario_file}" ]; then
        print_error "Scenario file not found: ${scenario_file}"
        return 1
    fi

    print_header "Running ${test_name} Test"
    print_info "Base URL: ${BASE_URL}"
    print_info "Duration: depends on scenario"
    echo ""

    # Build K6 command
    local k6_cmd="k6 run"

    # Add environment variable
    k6_cmd="${k6_cmd} --env BASE_URL=${BASE_URL}"

    # Add cloud flag if requested
    if [ "${CLOUD_MODE}" = true ]; then
        k6_cmd="${k6_cmd} --cloud"
    fi

    # Add additional arguments
    while [ $# -gt 0 ]; do
        k6_cmd="${k6_cmd} $1"
        shift
    done

    # Add scenario file
    k6_cmd="${k6_cmd} ${scenario_file}"

    # Run the test
    if eval "${k6_cmd}"; then
        print_success "${test_name} test passed!"
        return 0
    else
        print_error "${test_name} test failed!"
        return 1
    fi
}

print_summary() {
    echo ""
    print_header "Test Run Summary"
    print_info "Base URL: ${BASE_URL}"
    print_info "Results saved to: ${RESULTS_DIR}"
    print_info "Timestamp: ${TIMESTAMP}"
    echo ""
    echo "Results:"
    if ls -1 "${RESULTS_DIR}" | grep "${TIMESTAMP}" &> /dev/null; then
        ls -lh "${RESULTS_DIR}" | grep "${TIMESTAMP}" | tail -5
    fi
    echo ""
}

show_usage() {
    cat <<EOF
${BLUE}MorningOps Desktop - K6 Load Testing${NC}

${YELLOW}Usage:${NC}
  ./run-tests.sh [COMMAND] [OPTIONS]

${YELLOW}Commands:${NC}
  smoke               Run smoke test (1 VU, ~1 min) - baseline health check
  load                Run email sync load test (50 VU, ~10 min)
  stress              Run checkout stress test (200 VU, ~11 min)
  spike               Run spike test (500 VU burst, ~4 min)
  soak                Run soak test (50 VU, ~30 min)
  user-journey        Run complete user journey (30 VU, ~10 min)
  all                 Run all tests sequentially
  help                Show this help message

${YELLOW}Options:${NC}
  --env BASE_URL=<url>      Override backend URL (default: http://localhost:3000)
  --quick                   Run abbreviated versions (shorter duration)
  --cloud                   Run in K6 Cloud (requires k6 login cloud)
  --no-health-check         Skip backend health check
  --results-only            Show results directory and exit

${YELLOW}Examples:${NC}
  # Run smoke test against local backend
  ./run-tests.sh smoke

  # Run load test against staging
  ./run-tests.sh load --env BASE_URL=https://staging.morningops.app

  # Run all tests in cloud
  ./run-tests.sh all --cloud

  # Run tests in quick mode (shorter duration)
  ./run-tests.sh stress --quick

  # Show latest results
  ./run-tests.sh --results-only

${YELLOW}Test Details:${NC}
  Smoke Test
    • Baseline validation of core API endpoints
    • 1 concurrent virtual user
    • Duration: ~50 seconds
    • Useful for: smoke testing, CI/CD pipeline

  Email Sync Load Test
    • Tests email sync under realistic load
    • Ramps from 10 to 50 concurrent users
    • Duration: ~10 minutes
    • Useful for: sync feature validation, weekly testing

  Checkout Stress Test
    • Payment processing and webhook handling under stress
    • Ramps up to 200 concurrent users
    • Duration: ~11 minutes
    • Useful for: payment feature testing, pre-release validation

  User Journey Test
    • Complete user flow from registration to brief
    • Ramps up to 30 concurrent users
    • Duration: ~10 minutes
    • Useful for: regression testing, UX validation

EOF
}

###############################################################################
# Main Script
###############################################################################

main() {
    local test_command="${1:-help}"
    shift || true

    # Parse options
    while [ $# -gt 0 ]; do
        case "$1" in
            --env)
                # Extract BASE_URL from next argument
                if [[ "$2" == BASE_URL=* ]]; then
                    BASE_URL="${2#BASE_URL=}"
                    shift 2
                else
                    shift
                fi
                ;;
            --quick)
                QUICK_MODE=true
                shift
                ;;
            --cloud)
                CLOUD_MODE=true
                shift
                ;;
            --no-health-check)
                # Skip health check
                shift
                ;;
            --results-only)
                echo "Latest test results:"
                ls -lht "${RESULTS_DIR}"/ 2>/dev/null | head -10 || echo "No results found"
                exit 0
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                shift
                ;;
        esac
    done

    # Initial checks
    check_k6_installed

    if [ "${test_command}" = "help" ] || [ "${test_command}" = "-h" ] || [ "${test_command}" = "--help" ]; then
        show_usage
        exit 0
    fi

    # Check backend unless skipped
    if [ "${test_command}" != "all" ] || ! echo "$@" | grep -q "no-health-check"; then
        if ! check_backend_health; then
            print_warning "Backend may not be accessible. Tests may fail."
            read -p "Continue anyway? (y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi

    echo ""

    # Run requested test(s)
    case "${test_command}" in
        smoke)
            run_test "api-smoke"
            ;;
        load)
            run_test "email-sync-load"
            ;;
        stress)
            run_test "stripe-checkout-stress"
            ;;
        spike)
            # Run with spike-specific configuration
            print_warning "Spike test requires special configuration. Running standard stress test instead."
            run_test "stripe-checkout-stress"
            ;;
        soak)
            print_warning "Soak test requires 30+ minutes. Consider running in background or K6 Cloud."
            run_test "email-sync-load"
            ;;
        user-journey)
            run_test "user-journey"
            ;;
        all)
            print_header "Running All Tests"
            echo "This will take approximately 42 minutes total"
            echo ""

            local failed=0

            run_test "api-smoke" || ((failed++))
            sleep 5

            run_test "email-sync-load" || ((failed++))
            sleep 5

            run_test "stripe-checkout-stress" || ((failed++))
            sleep 5

            run_test "user-journey" || ((failed++))

            echo ""
            if [ ${failed} -eq 0 ]; then
                print_success "All tests passed!"
            else
                print_error "${failed} test(s) failed"
            fi
            ;;
        *)
            print_error "Unknown command: ${test_command}"
            echo ""
            show_usage
            exit 1
            ;;
    esac

    print_summary
}

# Run main function with all arguments
main "$@"
