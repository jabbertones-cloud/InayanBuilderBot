# AI-Driven Exploratory Testing Agent for MorningOps Desktop

A sophisticated automated QA system that explores your desktop application like a human tester would, discovering bugs that traditional scripted tests miss.

## Overview

The AI Explorer Agent is the crown jewel of the MorningOps QA stack. It combines:

- **Intelligent State Tracking** - Maintains a map of discovered UI states and transitions
- **Adaptive Action Selection** - Chooses next actions based on exploration strategy and curiosity scoring
- **Anomaly Detection** - Automatically detects console errors, layout shifts, memory leaks, and more
- **Chaos Engineering** - Simulates real-world failure scenarios (network flaps, disk full, token revocation)
- **Comprehensive Reporting** - Generates bug reports with reproducible steps, screenshots, and logs

## Installation

### Dependencies

```bash
npm install playwright @playwright/test commander
npm install --save-dev typescript @types/node
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## Quick Start

### Basic Exploration

```bash
npx ts-node qa/ai-explorer/run-explorer.ts \
  --steps 500 \
  --timeout 300 \
  --strategy mixed \
  --output ./qa-reports
```

### With Chaos Testing

```bash
npx ts-node qa/ai-explorer/run-explorer.ts \
  --steps 1000 \
  --timeout 300 \
  --strategy mixed \
  --chaos \
  --output ./qa-reports
```

### Focus on Specific Areas

```bash
npx ts-node qa/ai-explorer/run-explorer.ts \
  --steps 500 \
  --focus "onboarding,sync,settings" \
  --output ./qa-reports
```

### Dry Run (Preview Configuration)

```bash
npx ts-node qa/ai-explorer/run-explorer.ts \
  --steps 500 \
  --dry-run
```

## Command-Line Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--steps <n>` | number | 200 | Maximum exploration steps |
| `--timeout <n>` | number | 30 | Timeout in seconds |
| `--strategy <type>` | string | mixed | Exploration strategy: random, grammar, boundary, chaos, mixed |
| `--focus <areas>` | string | - | Focus areas (comma-separated): onboarding, sync, settings, etc. |
| `--chaos` | flag | false | Enable chaos testing scenarios |
| `--output <dir>` | string | ./qa-reports | Output directory for reports |
| `--app <path>` | string | ./app | Path to MorningOps Desktop app |
| `--dry-run` | flag | false | Preview configuration without running |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success: No critical or high-severity bugs found |
| 1 | High-severity bugs found |
| 2 | Critical bugs found |

## Architecture

### Core Components

#### 1. **explorer-agent.ts** - Main Orchestrator
The primary exploration loop that:
- Launches the Electron app
- Manages exploration budget and state
- Selects and executes actions
- Coordinates anomaly detection and reporting
- Handles chaos scenarios

```typescript
const agent = new ExplorerAgent(config);
const report = await agent.run();
```

#### 2. **state-capture.ts** - State Management
Captures and compares application state:
- DOM accessibility tree
- Console messages (errors, warnings)
- Network activity
- Performance metrics (memory, CPU)
- Screenshot hashes for visual regression detection

```typescript
const state = await capturer.captureState(page);
const comparison = await capturer.compareStates(previous, current);
```

#### 3. **action-generator.ts** - Strategy Engine
Generates actions based on exploration strategy:
- **Random**: Monkey testing - click random elements
- **Grammar-based**: Valid user flows (onboard → connect → sync)
- **Boundary testing**: Extreme inputs, rapid clicking, back/forward spam
- **Chaos**: Kill backend, corrupt database, network flaps
- **Mixed**: Combines all strategies

```typescript
const action = await generator.selectNextAction(
  exploredStates,
  currentSelectors,
  'grammar' // or 'random', 'boundary', 'chaos'
);
```

#### 4. **anomaly-detector.ts** - Quality Gate
Automatically detects:
- Console errors
- Unhandled promise rejections
- Layout shifts
- Dead clicks (unresponsive elements)
- Infinite loading (spinners > 10s)
- Memory leaks (steadily growing memory)
- Network errors (4xx/5xx responses)
- Application crashes
- Slow requests (> 5s)
- Visual regressions

```typescript
const anomalies = await detector.detectAnomalies(
  previous,
  current,
  comparison,
  page
);
```

#### 5. **report-generator.ts** - QA Insights
Generates comprehensive reports:
- Bug reports with reproducible steps
- Coverage maps showing explored UI areas
- Anomaly summaries
- Action flakiness analysis
- Markdown and JSON output formats

```typescript
await generator.addBugReport(anomalies, history, state, env);
const report = await generator.generateSessionReport(sessionId, startTime);
await generator.writeReportsToFile(outputDir, report);
```

#### 6. **chaos-scenarios.ts** - Failure Injection
Simulates real-world scenarios:
- Kill and restart backend mid-sync
- Corrupt SQLite database
- Network flaps (rapid disconnect/reconnect)
- Slow network (add latency)
- Fill disk space
- Revoke OAuth token
- CPU overload
- Memory pressure

```typescript
const scenario = await chaosManager.corruptDatabase();
await chaosManager.runScenario(scenario);
```

## Exploration Strategies

### Random (Monkey Testing)
Explores by randomly clicking elements, typing random text, and triggering random interactions.

**Best for**: Finding obvious crashes, undefined handlers, basic input validation bugs

```bash
--strategy random
```

### Grammar-Based Testing
Follows valid user flows and application patterns based on UI structure.

**Best for**: Flow-specific bugs, integration issues, state management problems

```bash
--strategy grammar
```

### Boundary Testing
Tests edge cases and extreme conditions:
- Empty inputs / very long inputs
- Special characters, emojis, null bytes
- Rapid clicking and keyboard navigation
- Extreme window sizes
- XSS payloads, SQL injection attempts

**Best for**: Input validation, security issues, edge case crashes

```bash
--strategy boundary
```

### Chaos Testing
Simulates real-world failure scenarios to test resilience.

**Best for**: Recovery behavior, error handling, offline scenarios

```bash
--strategy chaos --chaos
```

### Mixed (Recommended)
Rotates through all strategies intelligently, with chaos testing every 50 steps.

**Best for**: Comprehensive testing, finding multiple bug categories

```bash
--strategy mixed --chaos
```

## Report Output

### Files Generated

```
qa-reports/
├── report-{sessionId}.json          # Full session report (JSON)
├── report-{sessionId}.md            # Human-readable report (Markdown)
├── bugs-{sessionId}.json            # Bug details for integration
├── test-{bugId}.ts                  # Reproducible Playwright tests
└── screenshots/                     # State snapshots
    ├── state-{stateId}.png
    └── state-{stateId}.html         # Accessible DOM snapshot
```

### Report Structure

```json
{
  "sessionId": "session-1710259200000",
  "startTime": 1710259200000,
  "endTime": 1710259350000,
  "duration": 150000,
  "totalSteps": 500,
  "bugsFound": 7,
  "bugReports": [
    {
      "id": "bug-1710259250000-abc123",
      "title": "Console Error: Cannot read property 'email' of undefined",
      "severity": "high",
      "description": "Application threw unhandled error when processing sync results",
      "reproductionSteps": [
        "1. Click on 'Sync' button",
        "2. Wait for sync to complete",
        "3. Close and reopen settings"
      ],
      "anomalies": [
        {
          "type": "console_error",
          "severity": "high",
          "message": "Cannot read property 'email' of undefined",
          "timestamp": 1710259260000
        }
      ],
      "consoleLogs": ["...", "Error: Cannot read..."],
      "networkLogs": ["GET /api/sync - 500"],
      "domSnapshot": "...",
      "expectedBehavior": "Sync should complete without errors",
      "actualBehavior": "Console error occurred after sync"
    }
  ],
  "coverage": {
    "exploredStates": 45,
    "exploredFlows": ["onboarding", "sync", "settings"],
    "unexploredAreas": ["notifications", "integrations"],
    "coveragePercent": 67.5
  },
  "anomalySummary": {
    "console_error": 3,
    "network_error": 2,
    "layout_shift": 1,
    "infinite_loading": 1
  },
  "flakiness": {
    "click_sync_button": 12.5,
    "type_email_field": 0
  }
}
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: AI Exploratory Testing

on: [push, pull_request]

jobs:
  explore:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install

      - run: npm run ai-explorer -- \
          --steps 1000 \
          --timeout 300 \
          --strategy mixed \
          --output ./qa-reports

      - name: Upload Reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: qa-reports
          path: qa-reports/

      - name: Fail on Critical Bugs
        if: failure()
        run: exit 1
```

### npm Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "ai-explorer": "ts-node qa/ai-explorer/run-explorer.ts",
    "ai-explorer:quick": "npm run ai-explorer -- --steps 100 --strategy random",
    "ai-explorer:thorough": "npm run ai-explorer -- --steps 2000 --strategy mixed --chaos",
    "ai-explorer:focused": "npm run ai-explorer -- --steps 500 --focus onboarding,sync",
    "ai-explorer:dry": "npm run ai-explorer -- --dry-run"
  }
}
```

## Advanced Usage

### Custom Focus Areas

Target specific features:

```bash
npx ts-node qa/ai-explorer/run-explorer.ts \
  --focus "onboarding" \
  --steps 500 \
  --output ./reports
```

Available focus areas:
- `onboarding` - Initial setup and welcome flow
- `sync` - Calendar synchronization
- `settings` - User preferences
- `messaging` - Email and chat features
- `notifications` - Alert system
- `integrations` - Third-party services
- `help` - Help and support
- `advanced-settings` - Advanced configuration

### Performance Tuning

For large exploration budgets:

```bash
# Use memory efficiently
export NODE_OPTIONS="--max-old-space-size=4096"

# Run longer exploration
npx ts-node qa/ai-explorer/run-explorer.ts \
  --steps 5000 \
  --timeout 600 \
  --output ./comprehensive-reports
```

### Debugging

Enable detailed logging:

```bash
DEBUG=* npx ts-node qa/ai-explorer/run-explorer.ts --steps 100
```

## Customization

### Custom Anomaly Detectors

Extend `AnomalyDetector`:

```typescript
class CustomDetector extends AnomalyDetector {
  async detectCustomAnomaly(state: UIState): Promise<Anomaly[]> {
    // Your custom detection logic
    return [{
      type: 'custom_issue',
      severity: 'high',
      message: 'Custom anomaly found',
      timestamp: Date.now()
    }];
  }
}
```

### Custom Action Strategies

Extend `ActionGenerator`:

```typescript
class CustomActionGenerator extends ActionGenerator {
  async customStrategy(selectors: string[]): Promise<Action> {
    // Your custom action selection logic
    return { type: 'click', selector: '...', description: '...' };
  }
}
```

## Troubleshooting

### App Won't Launch

```
Error: Failed to get first window
```

**Solution**: Ensure `--app` path is correct:

```bash
npx ts-node qa/ai-explorer/run-explorer.ts \
  --app /path/to/morningops-desktop/build/mac/MorningOps.app
```

### Memory Issues

```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed
```

**Solution**: Increase Node.js memory and reduce steps:

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npx ts-node qa/ai-explorer/run-explorer.ts --steps 500
```

### No Bugs Found (Too Many Steps)

**Solution**: Use shorter budgets with focused strategies:

```bash
npx ts-node qa/ai-explorer/run-explorer.ts \
  --steps 200 \
  --strategy boundary \
  --focus onboarding
```

## Performance Expectations

| Configuration | Duration | Coverage |
|---------------|----------|----------|
| `--steps 100` | ~2 min | 20-30% |
| `--steps 500` | ~10 min | 50-65% |
| `--steps 1000` | ~20 min | 70-85% |
| `--steps 2000` | ~40 min | 85-95% |

## License

Part of MorningOps Desktop QA Stack

## Support

For issues, feature requests, or contributions, refer to the main MorningOps documentation.
