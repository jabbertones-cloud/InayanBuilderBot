# AI Explorer Agent - Integration Guide

Complete setup and integration instructions for the MorningOps Desktop AI Exploratory Testing Agent.

## Prerequisites

- **Node.js** 18+ with TypeScript support
- **Playwright** 1.40+ for Electron automation
- **MorningOps Desktop** built and available at app path
- **macOS/Linux** (Windows support via WSL2)

## Step 1: Install Dependencies

```bash
cd morningops-desktop

npm install playwright @playwright/test commander --save-dev
npm install typescript @types/node --save-dev
```

## Step 2: Copy Configuration Files

```bash
# Copy example configuration
cp qa/ai-explorer/.explorerrc.example.json qa/ai-explorer/.explorerrc.json

# Edit for your environment
nano qa/ai-explorer/.explorerrc.json
```

Key settings to verify:
- `appPath`: Path to built MorningOps Desktop app
- `outputDir`: Where to save reports
- `maxSteps`: Exploration budget (start with 200-500)

## Step 3: Add NPM Scripts

Add to your main `package.json`:

```json
{
  "scripts": {
    "ai-explorer": "ts-node qa/ai-explorer/run-explorer.ts",
    "ai-explorer:quick": "npm run ai-explorer -- --steps 100 --strategy random",
    "ai-explorer:standard": "npm run ai-explorer -- --steps 500 --strategy mixed",
    "qa:reports:view": "open qa-reports/*.md || cat qa-reports/*.md"
  }
}
```

## Step 4: Build the App (if needed)

```bash
# Build MorningOps Desktop
npm run build

# Verify the app exists
ls -la build/mac/MorningOps.app
```

## Step 5: Run First Test

```bash
# Quick smoke test
npm run ai-explorer:quick

# View results
cat qa-reports/report-*.md
```

## Usage Scenarios

### Local Development

Run exploration daily while developing:

```bash
npm run ai-explorer:standard
```

Check reports for new bugs:

```bash
npm run qa:reports:summary
```

### Pre-Release Testing

Before releasing, run comprehensive exploration:

```bash
npm run ai-explorer:thorough  # 2000 steps, mixed strategy, chaos enabled
```

### Continuous Integration

Add to GitHub Actions (`.github/workflows/qa.yml`):

```yaml
name: QA Testing

on:
  pull_request:
    branches: [main, develop]

jobs:
  explorer:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install
        run: npm install

      - name: Build App
        run: npm run build

      - name: Run AI Explorer (PR)
        run: npm run ai-explorer -- \
          --steps 300 \
          --strategy random \
          --output ./ci-reports

      - name: Upload Reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: qa-reports
          path: ci-reports/

      - name: Comment on PR
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: 'QA: Explorer Agent found issues. See artifacts.'
            })
```

### Nightly Testing

Add longer-running nightly tests (`.github/workflows/nightly-qa.yml`):

```yaml
name: Nightly QA

on:
  schedule:
    - cron: '2 0 * * *'  # 2 AM UTC daily

jobs:
  thorough-qa:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install
        run: npm install

      - name: Build App
        run: npm run build

      - name: Run Thorough Exploration
        run: npm run ai-explorer -- \
          --steps 2000 \
          --strategy mixed \
          --chaos \
          --timeout 300 \
          --output ./nightly-reports

      - name: Archive Reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: nightly-qa-reports-${{ github.run_number }}
          path: nightly-reports/
          retention-days: 30

      - name: Notify on Critical Bugs
        if: failure()
        run: |
          echo "Critical bugs found in nightly QA run"
          echo "Reports: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

## Advanced Configurations

### Focused Testing on Features

Test specific features in isolation:

```bash
# Onboarding flow only
npm run ai-explorer -- --focus onboarding --steps 300

# Sync and offline functionality
npm run ai-explorer -- --focus sync,offline --steps 500 --chaos

# Email/messaging features
npm run ai-explorer -- --focus messaging --steps 400 --strategy grammar
```

### Chaos Engineering Focus

Test failure recovery:

```bash
npm run ai-explorer -- \
  --steps 1000 \
  --strategy chaos \
  --chaos \
  --output ./chaos-reports
```

### Boundary Testing

Find input validation bugs:

```bash
npm run ai-explorer -- \
  --steps 500 \
  --strategy boundary \
  --output ./boundary-reports
```

## Report Analysis

### Understanding Bug Reports

Each bug report includes:

```markdown
# [HIGH] Console Error: Cannot read property 'email' of undefined

Found 1 anomaly(ies):
- console_error: Cannot read property 'email' of undefined

## Reproduction Steps

1. Click on Sync button
2. Wait for sync to complete
3. Close and reopen settings

## Console Logs

Error: Cannot read property 'email' of undefined
  at processSync (app.js:1234:56)

## Network Logs

GET /api/sync - 200
POST /api/save-results - 500
```

### Coverage Analysis

Reports show:

```
Coverage: 67.5%
Explored States: 45 / 100
Explored Flows: onboarding, sync, settings
Unexplored Areas: notifications, integrations
```

Priority: Test unexplored areas in next runs

### Flakiness Detection

Identifies unreliable actions:

```
Action Flakiness:
- click_sync_button: 12.5% failure rate
- type_email_field: 0% failure rate
```

Priority: Flaky actions indicate bugs

## Debugging

### Verbose Output

```bash
DEBUG=* npm run ai-explorer:quick
```

### Dry Run

Preview config without running:

```bash
npm run ai-explorer:dry
```

### Inspect Specific State

```bash
# Run and save DOM snapshots
npm run ai-explorer -- --steps 100 --output ./debug-reports

# Examine accessibility tree
cat debug-reports/*.json | jq '.bugReports[0].domSnapshot'
```

## Troubleshooting

### Issue: "App not found"

```
Error: Failed to launch app at path
```

**Solution:**
```bash
# Verify app exists
ls -la build/mac/MorningOps.app

# Update path in command
npm run ai-explorer -- --app /correct/path/to/app
```

### Issue: "Timeout waiting for window"

```
Error: Timeout waiting for first window
```

**Solution:**
```bash
# Increase timeout
npm run ai-explorer -- --timeout 60 --steps 100

# Check app logs
cat ~/Library/Logs/MorningOps/*
```

### Issue: Memory exhaustion during long runs

```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed
```

**Solution:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Use shorter budget
npm run ai-explorer -- --steps 1000
```

### Issue: No bugs found (expected?)

**Possible causes:**
1. App is very stable (good!)
2. Exploration budget too low
3. Focus areas too narrow

**Solution:**
```bash
# Increase budget and enable chaos
npm run ai-explorer -- --steps 1000 --strategy mixed --chaos
```

## Performance Optimization

### For Fast Feedback (CI)

```bash
npm run ai-explorer -- \
  --steps 100 \
  --strategy random \
  --output ./ci-reports
# Duration: ~2 minutes
```

### For Comprehensive Testing (Nightly)

```bash
npm run ai-explorer -- \
  --steps 2000 \
  --strategy mixed \
  --chaos \
  --output ./nightly-reports
# Duration: ~40 minutes
```

### Memory Tuning

```bash
# For systems with <8GB RAM
export NODE_OPTIONS="--max-old-space-size=2048"

# For systems with >16GB RAM
export NODE_OPTIONS="--max-old-space-size=8192"
```

## Integration Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Configuration file created (`.explorerrc.json`)
- [ ] App path verified in config
- [ ] Quick test runs successfully (`npm run ai-explorer:quick`)
- [ ] Reports generated and viewable
- [ ] NPM scripts added to `package.json`
- [ ] CI workflow configured (.github/workflows/qa.yml)
- [ ] Team notified of new QA capability
- [ ] Reports added to project documentation
- [ ] Nightly testing scheduled (optional)

## Next Steps

1. **Run initial exploration**: `npm run ai-explorer:quick`
2. **Review findings**: `npm run qa:reports:summary`
3. **File bugs**: Create GitHub issues from critical findings
4. **Integrate with CI**: Add to pull request checks
5. **Schedule nightly**: Set up recurring comprehensive tests
6. **Monitor trends**: Track bugs found over time

## Support

For issues:
1. Check logs: `cat qa-reports/report-*.json | jq '.anomalySummary'`
2. Review this guide's troubleshooting section
3. Check MorningOps documentation
4. Enable debug mode: `DEBUG=* npm run ai-explorer:quick`

## See Also

- Main documentation: `qa/ai-explorer/README.md`
- Configuration reference: `qa/ai-explorer/.explorerrc.example.json`
- Example workflows: `docs/QA_AUTOMATION.md`
