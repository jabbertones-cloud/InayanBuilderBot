# AI Explorer Agent - Usage Examples

Practical examples for common testing scenarios.

## Quick Start Examples

### 1. First Run - Quick Smoke Test

```bash
npm run ai-explorer -- --steps 50 --strategy random
```

What it does:
- Launches the app
- Makes 50 random interactions
- Captures app state after each action
- Detects any glaring errors
- Generates report

Expected output:
```
[1/50] Budget remaining: 50
State ID: a3f2d1b4e8c5
Action: Click on button[data-testid="sync-button"]
[2/50] Budget remaining: 49
...
Exploration complete!
Session: session-1710000000000
Steps: 50
Bugs found: 1
Coverage: 15.3%
Reports written to ./qa-reports
```

---

## Strategy Examples

### 2. Grammar-Based Flow Testing

Test valid user journeys:

```bash
npm run ai-explorer -- \
  --steps 200 \
  --strategy grammar \
  --output ./flow-reports
```

**What it tests:**
- Onboarding flow: Welcome → Setup → Connect → First Sync
- Settings flow: Open settings → Change preference → Save
- Sync flow: Trigger sync → Wait → Process results
- Messaging flow: Compose → Send → Verify

**Good for finding:**
- Flow completion bugs
- Data persistence issues
- State management problems
- Integration bugs

---

### 3. Boundary Testing - Input Validation

Find input validation bugs:

```bash
npm run ai-explorer -- \
  --steps 300 \
  --strategy boundary \
  --output ./boundary-reports
```

**What it tests:**
- Empty inputs
- Very long inputs (10,000+ characters)
- Special characters: `!@#$%^&*()`
- Unicode/Emojis: `🔥🎉🚀😀`
- SQL injection: `'; DROP TABLE users; --`
- XSS attacks: `<script>alert('xss')</script>`
- Null bytes: `\0\0\0`

**Good for finding:**
- Input validation bypasses
- Security vulnerabilities
- Crash triggers
- Buffer overflows (in native modules)

---

### 4. Chaos Engineering - Resilience Testing

Test failure recovery:

```bash
npm run ai-explorer -- \
  --steps 1000 \
  --strategy chaos \
  --chaos \
  --output ./chaos-reports
```

**What it tests:**
- Network disconnects
- Slow network (3s latency)
- Backend crashes
- Token revocation
- Database corruption (careful!)
- Disk full scenarios

**Good for finding:**
- Poor error handling
- Broken recovery flows
- Lost data issues
- Unrecoverable states

---

## Focus Area Examples

### 5. Onboarding-Focused Testing

Test new user experience thoroughly:

```bash
npm run ai-explorer -- \
  --steps 500 \
  --focus onboarding \
  --strategy grammar \
  --output ./onboarding-reports
```

This will:
1. Start fresh each run
2. Prioritize onboarding UI elements
3. Follow valid setup flows
4. Test authentication
5. Test initial configuration

**Check report for:**
- "Unexplored Areas" - missing steps
- High crash rates
- Memory growth during signup

---

### 6. Sync Functionality Testing

Deep dive into sync with chaos:

```bash
npm run ai-explorer -- \
  --steps 1000 \
  --focus sync,offline \
  --strategy mixed \
  --chaos \
  --output ./sync-reports
```

This will:
1. Test sync initiation
2. Interrupt with network flaps
3. Test offline handling
4. Test resume after reconnect
5. Validate data consistency

**Check report for:**
- Network errors
- Infinite loading
- Memory leaks during sync
- Data loss

---

### 7. Settings & Configuration

Verify all preferences work:

```bash
npm run ai-explorer -- \
  --steps 300 \
  --focus settings \
  --strategy grammar \
  --output ./settings-reports
```

This will:
1. Toggle every setting
2. Save each change
3. Verify persistence
4. Test edge combinations
5. Check reset functionality

---

## Real-World Workflow Examples

### 8. Pre-Release QA

Comprehensive testing before shipping:

```bash
npm run ai-explorer -- \
  --steps 2000 \
  --strategy mixed \
  --chaos \
  --timeout 300 \
  --output ./pre-release-qa

# Check results
cat pre-release-qa/report-*.md

# If issues found:
npm run ai-explorer -- \
  --steps 500 \
  --focus "issue_area" \
  --strategy boundary \
  --output ./targeted-qa
```

**Workflow:**
1. Run comprehensive exploration
2. Review critical/high bugs
3. File GitHub issues
4. Run focused tests on fixes
5. Repeat until clean

---

### 9. Regression Testing on New Version

Ensure previous fixes still work:

```bash
# Run against old version
npm run ai-explorer -- --steps 500 --app ./build-old --output ./reports-v1.0

# Run against new version
npm run ai-explorer -- --steps 500 --app ./build-new --output ./reports-v1.1

# Compare
diff reports-v1.0/bugs-*.json reports-v1.1/bugs-*.json
```

**If new bugs found in v1.1:**
```bash
# Do focused investigation
npm run ai-explorer -- \
  --steps 200 \
  --focus "changed_feature" \
  --strategy boundary \
  --app ./build-new \
  --output ./regression-analysis
```

---

### 10. Daily Smoke Test (CI Integration)

Quick daily validation:

```bash
#!/bin/bash
set -e

# Run quick smoke test
npm run ai-explorer -- --steps 100 --strategy random

# Check exit code
if [ $? -eq 2 ]; then
  echo "Critical bugs found!"
  exit 1
elif [ $? -eq 1 ]; then
  echo "High-severity bugs found"
  exit 0  # Non-blocking for CI
fi
```

Add to `.github/workflows/daily-qa.yml`:

```yaml
name: Daily QA

on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily

jobs:
  smoke:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm run ai-explorer -- --steps 200 --strategy random
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: daily-qa-reports
          path: qa-reports/
```

---

## Debugging Examples

### 11. Investigate Specific Bug

Found a bug? Recreate and debug:

```bash
# Create targeted test
npm run ai-explorer -- \
  --steps 50 \
  --strategy grammar \
  --focus "feature_with_bug" \
  --output ./debug-reports

# View detailed state
cat debug-reports/report-*.json | \
  jq '.bugReports[0] | {title, reproductionSteps, consoleLogs}'

# Extract reproducible test
cat debug-reports/test-*.ts
```

Output example:
```typescript
import { test, expect } from '@playwright/test';

test('Regression test: Console Error: Cannot read property email of undefined',
  async ({ page }) => {
    await page.goto('http://localhost:3000');

    // 1. Click on Sync button
    await page.click('[data-testid="sync-button"]');

    // 2. Wait for sync to complete
    await page.waitForTimeout(3000);

    // 3. Close and reopen settings
    await page.click('[data-testid="settings-button"]');

    // Verify fix
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    expect(errors.length).toBe(0);
});
```

---

### 12. Memory Leak Investigation

Found growing memory? Debug it:

```bash
npm run ai-explorer -- \
  --steps 500 \
  --strategy random \
  --timeout 600 \
  --output ./memory-debug

# Check memory readings
cat memory-debug/report-*.json | \
  jq '.bugReports[] | select(.type == "memory_leak")'
```

This will show:
- Initial memory usage
- Final memory usage
- Percentage growth
- Which actions triggered growth

Then target the problematic flow:

```bash
npm run ai-explorer -- \
  --steps 100 \
  --focus "feature_with_leak" \
  --strategy grammar \
  --output ./leak-targeted
```

---

### 13. Network Error Investigation

Backend having issues? Test app resilience:

```bash
npm run ai-explorer -- \
  --steps 300 \
  --strategy chaos \
  --chaos \
  --output ./network-chaos

# Check what networks failed
cat network-chaos/report-*.json | \
  jq '.bugReports[] | select(.type == "network_error")'
```

Look for:
- 4xx errors (client issues)
- 5xx errors (server issues)
- Timeout errors (slow backend)
- Disconnect errors (unstable connection)

---

## Report Analysis Examples

### 14. Finding Patterns in Bugs

Analyze multiple runs to find patterns:

```bash
# Run multiple times
for i in {1..3}; do
  npm run ai-explorer -- --steps 200 --output ./run-$i
done

# Find consistent bugs (appear in all runs)
cat run-*/bugs-*.json | jq -s 'flatten | group_by(.title) | map({title: .[0].title, count: length})'
```

Output:
```json
[
  { "title": "Console Error: Cannot read property X", "count": 3 },
  { "title": "Infinite Loading detected", "count": 2 },
  { "title": "Dead Click - Unresponsive Element", "count": 1 }
]
```

Consistent bugs = high priority (appear every run)
Flaky bugs = investigate specific conditions

---

### 15. Coverage Analysis

See what's been tested:

```bash
# Run exploration
npm run ai-explorer -- --steps 1000

# View coverage
cat qa-reports/report-*.json | jq '{
  coveragePercent: .coverage.coveragePercent,
  exploredStates: .coverage.exploredStates,
  exploredFlows: .coverage.exploredFlows | keys,
  unexploredAreas: .coverage.unexploredAreas
}'
```

Output:
```json
{
  "coveragePercent": 67.5,
  "exploredStates": 45,
  "exploredFlows": ["onboarding", "sync", "settings"],
  "unexploredAreas": ["notifications", "integrations", "help"]
}
```

Target unexplored areas:

```bash
npm run ai-explorer -- \
  --steps 300 \
  --focus "notifications,integrations" \
  --strategy grammar
```

---

## CI/CD Integration Examples

### 16. Pull Request QA Gate

Add to `.github/workflows/pr-qa.yml`:

```yaml
name: PR QA Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  qa-explorer:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install && npm run build

      - name: Run AI Explorer
        run: npm run ai-explorer -- \
          --steps 300 \
          --strategy random

      - name: Upload Reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: qa-reports-${{ github.event.number }}
          path: qa-reports/

      - name: Comment Results
        if: always()
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(
              fs.readFileSync('qa-reports/report-*.json', 'utf8')
            );
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `QA Report: ${report.bugsFound} bugs found, ${report.coverage.coveragePercent.toFixed(1)}% coverage`
            });
```

---

### 17. Nightly Extended Testing

Schedule comprehensive testing (`.github/workflows/nightly-qa.yml`):

```yaml
on:
  schedule:
    - cron: '0 2 * * *'

jobs:
  nightly-qa:
    runs-on: [self-hosted, macos]  # Use faster runner
    steps:
      - uses: actions/checkout@v3
      - run: npm install && npm run build

      - name: Comprehensive Testing
        run: npm run ai-explorer -- \
          --steps 3000 \
          --strategy mixed \
          --chaos \
          --timeout 300

      - name: Store Results
        if: always()
        run: |
          mkdir -p reports
          cp qa-reports/*.json reports/
          echo "Nightly QA $(date)" >> reports/timestamp.txt

      - name: Upload to S3
        run: aws s3 sync reports s3://qa-results/nightly/$(date +%Y%m%d)/
```

---

## Performance Tuning Examples

### 18. Optimize for CI Speed

For quick PR feedback:

```bash
npm run ai-explorer -- \
  --steps 100 \
  --strategy random \
  --timeout 20  # Shorter timeout
```

Runs in ~2 minutes, catches obvious bugs.

---

### 19. Optimize for Thoroughness

For nightly comprehensive testing:

```bash
export NODE_OPTIONS="--max-old-space-size=8192"

npm run ai-explorer -- \
  --steps 5000 \
  --strategy mixed \
  --chaos \
  --timeout 600
```

Runs in ~1 hour, catches subtle bugs.

---

## See Also

- Main documentation: `README.md`
- Architecture: `ARCHITECTURE_OVERVIEW.md`
- Integration: `INTEGRATION_GUIDE.md`
- Configuration: `.explorerrc.example.json`
