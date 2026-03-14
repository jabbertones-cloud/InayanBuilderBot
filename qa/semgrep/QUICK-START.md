# Semgrep Quick Start

## One-Minute Setup

```bash
# 1. Install Semgrep
pip install semgrep

# 2. Run scan
cd morningops-desktop/qa/semgrep
./run-semgrep.sh

# 3. Check results
cat ../reports/semgrep/findings_*.json | jq '.results[] | .rule.id'
```

## Common Commands

```bash
# Run all rules
./run-semgrep.sh

# Only CRITICAL issues
./run-semgrep.sh --severity CRITICAL

# Preview without running
./run-semgrep.sh --dry-run

# Verbose output
./run-semgrep.sh --verbose

# JSON output for automation
./run-semgrep.sh --format json
```

## What Gets Checked

| Category | Count | Examples |
|----------|-------|----------|
| Security | 9 | Hardcoded secrets, SQL injection, XSS, Electron issues |
| Anti-Patterns | 7 | execSync on hot paths, fd leaks, race conditions |
| Code Quality | 6 | Unhandled errors, empty catch blocks, any types |
| Electron-Specific | 2 | IPC validation, unsafe webPreferences |
| **TOTAL** | **25+** | |

## Key Files

- **semgrep.yml** - Rules configuration (574 lines)
- **run-semgrep.sh** - Scan runner with filtering and reporting
- **README.md** - Full documentation with examples

## Reports Location

```
morningops-desktop/reports/semgrep/
├── findings_20260312_021600.json
├── findings_20260312_021600.sarif
└── [history of all scans]
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | No critical or high issues |
| 1 | HIGH severity issues found |
| 2 | CRITICAL issues found |

## Next Steps

1. Run: `./run-semgrep.sh`
2. Review findings in reports/semgrep/
3. Fix high-priority issues
4. Add to CI/CD pipeline (see README.md)
