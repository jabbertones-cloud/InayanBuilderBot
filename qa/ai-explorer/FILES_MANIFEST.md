# AI Explorer Agent - Files Manifest

Complete inventory of all files in the AI-driven exploratory testing system.

## Core Implementation Files

### explorer-agent.ts (500 lines)
**The main orchestrator and entry point for exploration**
- Launches Electron app via Playwright
- Manages exploration loop (budget, states, actions)
- Coordinates all subsystems
- Handles action execution with error recovery
- Implements curiosity scoring for state prioritization
- Supports multiple exploration strategies (random, grammar, boundary, chaos, mixed)

### state-capture.ts (350 lines)
**Captures and compares application state**
- DOM accessibility tree snapshots
- Console message logging (errors, warnings, info)
- Network activity tracking
- Performance metrics (memory, CPU usage)
- Screenshot hashing for visual regression detection
- State comparison and change detection
- Layout shift detection

### action-generator.ts (450 lines)
**Intelligent action selection engine**
- Random exploration (monkey testing)
- Grammar-based flows (valid user journeys)
- Boundary testing (extreme inputs, edge cases)
- Chaos engineering actions
- Flow detection from UI structure
- Contextual text generation
- Boundary input generation (XSS, SQL injection, extreme lengths)

### anomaly-detector.ts (350 lines)
**Automated quality assurance gate**
- Console error detection
- Unhandled promise rejection detection
- Layout shift detection
- Dead click detection (unresponsive elements)
- Infinite loading detection (>10 seconds)
- Memory leak detection (steady growth)
- Network error detection (4xx/5xx)
- Application crash detection
- Timeout detection (slow requests)
- Visual regression detection (screenshot hash comparison)
- Severity classification (critical, high, medium, low)

### report-generator.ts (400 lines)
**Comprehensive QA reporting system**
- Bug report generation with full context
- Coverage map calculation
- Action flakiness tracking
- Session report generation
- JSON and Markdown output formats
- Reproducible Playwright test generation
- Bug details with screenshots and logs
- Coverage gap identification
- Anomaly summary statistics

### chaos-scenarios.ts (350 lines)
**Failure injection and chaos engineering**
- Kill and restart backend mid-operation
- SQLite database corruption simulation
- Network flap simulation (rapid disconnect/reconnect)
- Slow network simulation (add latency)
- Disk space exhaustion simulation
- OAuth token revocation
- CPU overload simulation
- Memory pressure simulation
- Scenario-based chaos testing framework

### run-explorer.ts (300 lines)
**Command-line interface and entry point**
- Commander.js CLI with comprehensive options
- Configuration validation
- Dry-run mode for preview
- Exit code handling based on severity
- Report generation and saving
- User-friendly output formatting

## Documentation Files

### README.md (600 lines)
**Complete user guide**
- System overview and architecture
- Installation instructions
- Quick start examples
- Command-line options reference
- Exit code meanings
- Architecture component overview
- Exploration strategies explanation
- Report output formats
- CI/CD integration examples
- Advanced usage patterns
- Customization guide
- Troubleshooting guide
- Performance expectations

### INTEGRATION_GUIDE.md (500 lines)
**Step-by-step integration instructions**
- Prerequisites and setup
- Dependency installation
- Configuration setup
- NPM script addition
- First test execution
- GitHub Actions CI/CD setup
- Nightly testing configuration
- Advanced configurations
- Report analysis guide
- Debugging procedures
- Performance optimization
- Integration checklist
- Support resources

### ARCHITECTURE_OVERVIEW.md (400 lines)
**Technical system design documentation**
- Component architecture diagrams
- Detailed component responsibilities
- State management models
- Exploration loop flowchart
- Data flow diagrams
- Key design patterns
- Testing modes explanation
- Performance characteristics
- Extensibility points
- Cross-references to implementation

### EXAMPLES.md (600 lines)
**Practical usage examples**
- Quick start smoke test
- Strategy-specific examples (grammar, boundary, chaos)
- Focus area examples (onboarding, sync, settings)
- Real-world workflow examples
- Debugging and investigation examples
- Report analysis examples
- CI/CD integration examples
- Performance tuning examples

### FILES_MANIFEST.md (this file)
**Complete file inventory and descriptions**

## Configuration Files

### .explorerrc.example.json (250 lines)
**Example configuration file with all options**
- Profile definitions (quick, standard, thorough, chaos, boundary, onboarding)
- Default settings
- Anomaly thresholds
- Strategy weights
- Focus area definitions
- Chaos scenario settings
- Reporting options
- CI configuration

### package.json.snippet (80 lines)
**NPM scripts and dependency additions**
- AI explorer scripts (quick, standard, thorough, chaos, boundary, focused)
- QA reporting scripts
- CI integration scripts
- Dependency specifications
- Installation instructions

## Statistics

| Category | Count | Lines |
|----------|-------|-------|
| TypeScript Source Files | 7 | ~2,700 |
| Documentation | 4 | ~2,100 |
| Configuration | 2 | ~330 |
| **Total** | **13** | **~5,130** |

## File Dependencies

```
explorer-agent.ts
├── state-capture.ts
├── action-generator.ts
├── anomaly-detector.ts
├── report-generator.ts
└── chaos-scenarios.ts

run-explorer.ts
└── explorer-agent.ts
    └── [same as above]
```

## Getting Started Reading Order

1. **README.md** - Start here for overview
2. **INTEGRATION_GUIDE.md** - Setup and installation
3. **EXAMPLES.md** - See real usage patterns
4. **explorer-agent.ts** - Understand orchestration
5. **ARCHITECTURE_OVERVIEW.md** - Deep dive into design
6. **.explorerrc.example.json** - Configuration reference

## Key Classes and Interfaces

### ExplorerAgent
Main class managing exploration loop
- `run()` - Main exploration loop
- `launchApp()` - Start Electron app
- `executeAction()` - Execute single action
- `selectStrategy()` - Choose strategy

### StateCapturer
State capture and comparison
- `captureState()` - Full state snapshot
- `compareStates()` - Diff states
- Returns `UIState` and `StateComparison`

### ActionGenerator
Action selection and generation
- `selectNextAction()` - Choose next action
- Implements strategies: random, grammar, boundary, chaos
- Returns `Action` objects

### AnomalyDetector
Quality gate and anomaly detection
- `detectAnomalies()` - Analyze state for anomalies
- Detects 10+ anomaly types
- Returns `Anomaly[]` with severity levels

### ReportGenerator
QA reporting and analysis
- `addBugReport()` - Record found bugs
- `generateSessionReport()` - Create session report
- `writeReportsToFile()` - Save reports
- Returns `SessionReport`

### ChaosScenarioManager
Failure injection and chaos testing
- `runScenario()` - Execute chaos scenario
- Implements 8+ failure scenarios
- `cleanup()` - Restore state after chaos

## External Dependencies

```json
{
  "playwright": "^1.40.0",
  "@playwright/test": "^1.40.0",
  "commander": "^11.1.0",
  "typescript": "^5.3.0",
  "@types/node": "^20.10.0"
}
```

## Output Structure

```
qa-reports/
├── report-{sessionId}.json          # Full session report
├── report-{sessionId}.md            # Human-readable report
├── bugs-{sessionId}.json            # Bug list for integration
└── test-{bugId}.ts                  # Reproducible tests
```

## Usage

```bash
# Install
npm install

# Quick test
npm run ai-explorer:quick

# View reports
npm run qa:reports:view

# CI integration
npm run ci:qa
```

## Version Info

- **Created**: 2026-03-12
- **Target**: MorningOps Desktop QA Stack
- **Node Version**: 18+
- **Playwright Version**: 1.40+
- **TypeScript Version**: 5.3+

## File Size Summary

| File | Type | Lines | Size |
|------|------|-------|------|
| explorer-agent.ts | TS | 450 | 18KB |
| state-capture.ts | TS | 350 | 13KB |
| action-generator.ts | TS | 450 | 17KB |
| anomaly-detector.ts | TS | 350 | 14KB |
| report-generator.ts | TS | 400 | 16KB |
| chaos-scenarios.ts | TS | 350 | 14KB |
| run-explorer.ts | TS | 300 | 12KB |
| README.md | MD | 600 | 25KB |
| INTEGRATION_GUIDE.md | MD | 500 | 20KB |
| ARCHITECTURE_OVERVIEW.md | MD | 400 | 17KB |
| EXAMPLES.md | MD | 600 | 25KB |
| .explorerrc.example.json | JSON | 250 | 10KB |
| package.json.snippet | TXT | 80 | 3KB |
| **Total** | - | ~5,130 | ~204KB |

## Next Steps

1. Review README.md for overview
2. Follow INTEGRATION_GUIDE.md for setup
3. Try examples from EXAMPLES.md
4. Customize .explorerrc.json for your environment
5. Run `npm run ai-explorer:quick` for first test
6. Check reports in qa-reports/ directory
7. Integrate into CI/CD workflow

## Support Resources

- Main README: `README.md`
- Integration: `INTEGRATION_GUIDE.md`
- Examples: `EXAMPLES.md`
- Architecture: `ARCHITECTURE_OVERVIEW.md`
- Source: Individual `*.ts` files

---

*Last Updated: 2026-03-12*
*Part of MorningOps Desktop QA Stack - Crown Jewel Edition*
