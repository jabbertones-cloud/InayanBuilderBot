#!/bin/bash
# Semgrep Static Analysis Runner for MorningOps Desktop
# Runs custom security, anti-pattern, and code quality rules

set -e

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$SCRIPT_DIR/semgrep.yml"
REPORTS_DIR="$PROJECT_ROOT/reports/semgrep"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
JSON_REPORT="$REPORTS_DIR/findings_${TIMESTAMP}.json"
SARIF_REPORT="$REPORTS_DIR/findings_${TIMESTAMP}.sarif"
HTML_REPORT="$REPORTS_DIR/findings_${TIMESTAMP}.html"

# Parse command line arguments
SEVERITY_FILTER="ALL"
FORMAT="text"
DRY_RUN=false
VERBOSE=false
SHOW_HELP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --severity)
            SEVERITY_FILTER="$2"
            shift 2
            ;;
        --format)
            FORMAT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            SHOW_HELP=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            SHOW_HELP=true
            shift
            ;;
    esac
done

# Print help
if [ "$SHOW_HELP" = true ]; then
    cat << EOF
Usage: $0 [OPTIONS]

Options:
  --severity LEVEL      Filter results by severity (ALL, CRITICAL, HIGH, MEDIUM, LOW)
                        Default: ALL
  --format FORMAT       Output format (text, json, sarif, html)
                        Default: text
  --dry-run            Preview rules without running scan
  -v, --verbose        Enable verbose output
  -h, --help           Show this help message

Examples:
  # Run all rules
  $0

  # Only show CRITICAL and HIGH findings
  $0 --severity HIGH

  # Output as JSON
  $0 --format json

  # Dry-run to preview rules
  $0 --dry-run

EOF
    exit 0
fi

# Check if semgrep is installed
if ! command -v semgrep &> /dev/null; then
    echo -e "${RED}Error: semgrep is not installed${NC}"
    echo "Install with: pip install semgrep"
    exit 1
fi

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Config file not found: $CONFIG_FILE${NC}"
    exit 1
fi

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Print header
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}MorningOps Desktop - Semgrep Analysis${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo "Configuration: $CONFIG_FILE"
echo "Target: $PROJECT_ROOT/src"
echo "Severity Filter: $SEVERITY_FILTER"
echo "Output Format: $FORMAT"
echo "Report Directory: $REPORTS_DIR"
echo ""

# Build semgrep command
SEMGREP_CMD="semgrep --config=$CONFIG_FILE --json"

# Add source directory
SEMGREP_CMD="$SEMGREP_CMD $PROJECT_ROOT/src"

# Add verbose flag
if [ "$VERBOSE" = true ]; then
    SEMGREP_CMD="$SEMGREP_CMD --verbose"
fi

# Show preview if dry-run
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN] Command to be executed:${NC}"
    echo "$SEMGREP_CMD"
    echo ""
    echo -e "${YELLOW}[DRY RUN] Available rules:${NC}"
    semgrep --list-rules --config="$CONFIG_FILE" | head -20
    exit 0
fi

# Run semgrep
echo -e "${BLUE}Running Semgrep...${NC}"
echo ""

# Capture output
OUTPUT=$($SEMGREP_CMD 2>&1 || true)
EXIT_CODE=$?

# Save JSON output
echo "$OUTPUT" > "$JSON_REPORT"
echo -e "${GREEN}JSON report saved to: $JSON_REPORT${NC}"

# Parse findings from JSON
FINDINGS_COUNT=$(echo "$OUTPUT" | grep -o '"results":\[' | wc -l)
CRITICAL_COUNT=$(echo "$OUTPUT" | grep -o '"severity":"CRITICAL"' | wc -l)
HIGH_COUNT=$(echo "$OUTPUT" | grep -o '"severity":"HIGH"' | wc -l)
MEDIUM_COUNT=$(echo "$OUTPUT" | grep -o '"severity":"MEDIUM"' | wc -l)
LOW_COUNT=$(echo "$OUTPUT" | grep -o '"severity":"LOW"' | wc -l)

# Generate SARIF report (if available)
if command -v semgrep &> /dev/null; then
    echo "$OUTPUT" | semgrep --json --output-format sarif > "$SARIF_REPORT" 2>/dev/null || true
    if [ -f "$SARIF_REPORT" ] && [ -s "$SARIF_REPORT" ]; then
        echo -e "${GREEN}SARIF report saved to: $SARIF_REPORT${NC}"
    fi
fi

# Print summary
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}============================================${NC}"

if [ "$CRITICAL_COUNT" -gt 0 ]; then
    echo -e "${RED}CRITICAL: $CRITICAL_COUNT${NC}"
else
    echo -e "${GREEN}CRITICAL: $CRITICAL_COUNT${NC}"
fi

if [ "$HIGH_COUNT" -gt 0 ]; then
    echo -e "${RED}HIGH: $HIGH_COUNT${NC}"
else
    echo -e "${GREEN}HIGH: $HIGH_COUNT${NC}"
fi

if [ "$MEDIUM_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}MEDIUM: $MEDIUM_COUNT${NC}"
else
    echo -e "${GREEN}MEDIUM: $MEDIUM_COUNT${NC}"
fi

echo -e "${GREEN}LOW: $LOW_COUNT${NC}"
echo ""

# Apply severity filter
FILTERED_FINDINGS=0
if [ "$SEVERITY_FILTER" != "ALL" ]; then
    echo "Filtering for severity: $SEVERITY_FILTER and higher"
    case "$SEVERITY_FILTER" in
        CRITICAL)
            FILTERED_FINDINGS=$CRITICAL_COUNT
            ;;
        HIGH)
            FILTERED_FINDINGS=$((CRITICAL_COUNT + HIGH_COUNT))
            ;;
        MEDIUM)
            FILTERED_FINDINGS=$((CRITICAL_COUNT + HIGH_COUNT + MEDIUM_COUNT))
            ;;
        LOW)
            FILTERED_FINDINGS=$((CRITICAL_COUNT + HIGH_COUNT + MEDIUM_COUNT + LOW_COUNT))
            ;;
    esac
    echo "Matching findings: $FILTERED_FINDINGS"
    echo ""
fi

# Print detailed findings (optional)
if [ "$FORMAT" = "text" ] && [ "$CRITICAL_COUNT" -gt 0 ] || [ "$HIGH_COUNT" -gt 0 ]; then
    echo -e "${RED}Found Issues:${NC}"
    echo ""
    # Parse and display findings
    echo "$OUTPUT" | jq -r '.results[] | select(.severity == "CRITICAL" or .severity == "HIGH") |
        "\(.rule.id): \(.message)\n  File: \(.path):\(.start.line)-\(.end.line)\n"' 2>/dev/null || echo "(Could not parse findings)"
    echo ""
fi

# Exit with appropriate code
if [ "$CRITICAL_COUNT" -gt 0 ]; then
    echo -e "${RED}FAILED: Found CRITICAL issues${NC}"
    exit 2
elif [ "$HIGH_COUNT" -gt 0 ]; then
    if [ "$SEVERITY_FILTER" = "CRITICAL" ]; then
        echo -e "${YELLOW}WARNING: Found HIGH severity issues (not checked in filter mode)${NC}"
        exit 0
    else
        echo -e "${RED}FAILED: Found HIGH severity issues${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}PASSED: No critical or high severity issues found${NC}"
    exit 0
fi
