# AI Explorer Agent - Architecture Overview

## System Design

The AI Exploratory Testing Agent is a sophisticated multi-component system that simulates intelligent QA testing behavior.

```
┌─────────────────────────────────────────────────────────────────┐
│                    explorer-agent.ts                            │
│                   (Main Orchestrator)                           │
│  • Launches Electron app                                        │
│  • Manages exploration loop (budget, steps)                    │
│  • Coordinates all subsystems                                  │
│  • Handles action execution                                    │
└────┬────────────────┬────────────────┬────────────────┬────────┘
     │                │                │                │
     ▼                ▼                ▼                ▼
┌─────────┐   ┌──────────────┐  ┌─────────────────┐  ┌─────────────┐
│  State  │   │   Action     │  │    Anomaly      │  │   Report    │
│Capturer │   │  Generator   │  │    Detector     │  │  Generator  │
│ (state- │   │ (action-     │  │ (anomaly-       │  │(report-     │
│capture) │   │ generator)   │  │ detector)       │  │ generator)  │
└────┬────┘   └──────┬───────┘  └────────┬────────┘  └──────┬──────┘
     │                │                   │                  │
     └────────────┬───┴───────────────────┴──────────────────┘
                  │
        ┌─────────▼──────────┐
        │  Chaos Scenarios   │
        │ (chaos-scenarios)  │
        └────────────────────┘
```

## Component Architecture

### 1. Explorer Agent (explorer-agent.ts)
**Primary Responsibilities:**
- Application lifecycle (launch, close)
- Exploration loop orchestration
- State tracking and history
- Action selection and execution
- Budget management
- Anomaly correlation with actions

**Key Methods:**
```typescript
async run()                          // Main exploration loop
async launchApp()                    // Start Electron app
async executeAction(action)          // Execute single action
async updateCuriosityScore()         // Update unexplored weight
async selectStrategy()               // Choose exploration strategy
async cleanup()                      // Shutdown
```

**State Management:**
```typescript
ExplorationState {
  currentStep: number              // Progress tracker
  budget: number                   // Remaining steps
  exploredStates: Map              // Visited UI states
  discoveredAnomalies: Anomaly[]   // Found bugs
  curiosityScore: Map              // Unexplored area weights
}
```

### 2. State Capturer (state-capture.ts)
**Primary Responsibilities:**
- Capture current application state
- Compare state transitions
- Detect changes/regressions
- Generate state hashes
- Collect diagnostic information

**Key Methods:**
```typescript
async captureState(page)                    // Full state snapshot
async compareStates(prev, current)          // Diff states
async captureAccessibilityTree(page)        // DOM structure
async captureConsoleMessages(page)          // Logs + errors
async captureNetworkActivity(page)          // HTTP requests
async capturePerformanceMetrics(page)       // Memory, CPU
```

**State Data Model:**
```typescript
UIState {
  id: string                           // Unique hash
  timestamp: number                    // When captured
  accessibility: string                // DOM tree JSON
  consoleMessages: ConsoleMessage[]   // Log entries
  networkEvents: NetworkEvent[]       // HTTP activity
  performance: PerformanceMetrics     // Resource usage
  screenshotHash: string              // Visual ID
  errors: string[]                    // Error messages
  warnings: string[]                  // Warning messages
}
```

### 3. Action Generator (action-generator.ts)
**Primary Responsibilities:**
- Select next action based on strategy
- Implement exploration strategies
- Track element interactions
- Generate relevant inputs
- Support multiple exploration modes

**Strategies:**
- **Random**: Monkey testing - random clicks/typing
- **Grammar-based**: Valid user flows - follows patterns
- **Boundary**: Edge cases - extreme inputs, rapid actions
- **Chaos**: Failure injection - kill processes, corrupt data

**Key Methods:**
```typescript
async selectNextAction(states, selectors, strategy)   // Choose action
async randomAction(selectors)                         // Random strategy
async grammarBasedAction(selectors)                   // Flow strategy
async boundaryTestingAction(selectors)                // Edge strategy
async chaosAction()                                   // Chaos strategy
```

**Action Types:**
```typescript
ActionType = 'click' | 'type' | 'navigate' | 'scroll' | 'hover' |
             'rightClick' | 'doubleClick' | 'pressKey' | 'resize' | 'chaos'
```

### 4. Anomaly Detector (anomaly-detector.ts)
**Primary Responsibilities:**
- Monitor application health
- Detect error conditions
- Identify performance issues
- Flag UI/visual problems
- Classify severity levels

**Anomaly Types Detected:**
- Console errors (uncaught errors)
- Unhandled rejections (promise failures)
- Layout shifts (DOM movement)
- Dead clicks (unresponsive elements)
- Infinite loading (spinners > 10s)
- Memory leaks (steadily growing memory)
- Network errors (4xx/5xx responses)
- Crashes (renderer process death)
- Timeouts (slow requests)
- Visual regressions (screenshot changes)

**Key Methods:**
```typescript
async detectAnomalies(prev, current, comparison, page)
async detectConsoleErrors(state)
async detectUnhandledRejections()
async detectLayoutShifts(comparison)
async detectDeadClicks(state)
async detectInfiniteLoading(state)
async detectMemoryLeaks(state)
async detectNetworkErrors(state)
async detectVisualRegressions(prev, current)
```

**Severity Levels:**
```typescript
'critical'  // App crash, fatal errors
'high'      // Error conditions blocking use
'medium'    // Performance/layout issues
'low'       // Minor warnings, non-blocking
```

### 5. Report Generator (report-generator.ts)
**Primary Responsibilities:**
- Collect bug findings
- Generate reports (JSON, Markdown)
- Calculate coverage metrics
- Track action flakiness
- Create reproducible test code

**Output Formats:**
- JSON report (structured data)
- Markdown report (human-readable)
- Bug list (quick reference)
- Coverage map (exploration metrics)
- Test code (reproducible Playwright tests)

**Key Methods:**
```typescript
async addBugReport(anomalies, history, state, env)
async generateSessionReport(sessionId, startTime)
async writeReportsToFile(outputDir, report)
async generatePlaywrightTest(bug, outputDir)
private generateMarkdownReport(report)
private generateCoverageMap()
```

**Report Structure:**
```typescript
SessionReport {
  sessionId: string                  // Session ID
  startTime: number                  // Start timestamp
  endTime: number                    // End timestamp
  duration: number                   // Duration ms
  totalSteps: number                 // Actions taken
  bugsFound: number                  // Count
  bugReports: BugReport[]            // Details
  coverage: CoverageMap              // Metrics
  anomalySummary: Record<string, number>
  flakiness: Record<string, number>
}
```

### 6. Chaos Scenarios (chaos-scenarios.ts)
**Primary Responsibilities:**
- Implement failure injection scenarios
- Simulate real-world conditions
- Test recovery behavior
- Validate error handling
- Clean up after scenarios

**Scenarios Implemented:**
- Kill and restart backend
- Corrupt SQLite database
- Network flap (rapid disconnect)
- Slow network (add latency)
- Fill disk space
- Revoke OAuth token
- CPU overload
- Memory pressure

**Key Methods:**
```typescript
async killAndRestartBackend()
async corruptDatabase()
async simulateNetworkFlap()
async simulateSlowNetwork(latency)
async fillDiskSpace(percentFull)
async revokeOAuthToken()
async runScenario(scenario)
async cleanup()
```

## Exploration Loop

The main loop in `explorer-agent.run()`:

```
Initialize Agent
    ↓
Launch App
    ↓
While (budget > 0) {
  1. Capture State
       ↓ ──→ Generate state ID, hash

  2. Detect Anomalies
       ├─→ Console errors
       ├─→ Unhandled rejections
       ├─→ Layout shifts
       ├─→ Network failures
       ├─→ Memory leaks
       └─→ Crashes

  3. Report Bugs (if found)
       ↓ ──→ Add to bug list
       ↓ ──→ Record action sequence

  4. Update Tracking
       ├─→ Mark state as visited
       ├─→ Update curiosity scores
       └─→ Track explored selectors

  5. Select Next Action
       ├─→ Choose strategy
       ├─→ Find interactive elements
       └─→ Generate action

  6. Execute Action
       ├─→ Click/type/navigate
       ├─→ Handle failures gracefully
       └─→ Wait for UI update

  7. Advance Loop
       └─→ Decrement budget
}
    ↓
Generate Report
    ↓
Cleanup & Exit
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Playwright Page                          │
│                    (Electron App Instance)                      │
└────────────────────────┬────────────────────────────────────────┘
                         │ (observe & interact)
                         ▼
        ┌────────────────────────────────────────┐
        │         State Capturer                 │
        │  • Read accessibility tree             │
        │  • Monitor console                     │
        │  • Track network                       │
        │  • Measure performance                 │
        └────────┬─────────────────────┬─────────┘
                 │                     │
        ┌────────▼──────────┐  ┌──────▼──────────────┐
        │    UIState        │  │  StateComparison   │
        │  (current)        │  │  (previous vs new) │
        └────────┬──────────┘  └──────┬─────────────┘
                 │                    │
                 └────────┬───────────┘
                          ▼
        ┌────────────────────────────────────────┐
        │      Anomaly Detector                  │
        │  • Analyze state changes               │
        │  • Check console for errors            │
        │  • Monitor performance                 │
        │  • Detect crashes                      │
        └────────┬─────────────────────┬─────────┘
                 │                     │
        ┌────────▼──────────┐  ┌──────▼──────────────┐
        │  Anomalies[]      │  │  Report Generator  │
        │  (bugs found)     │  │  (collect & save)  │
        └────────┬──────────┘  └──────┬─────────────┘
                 │                    │
                 └────────┬───────────┘
                          ▼
        ┌────────────────────────────────────────┐
        │    Action Generator                    │
        │  • Analyze available elements          │
        │  • Select exploration strategy         │
        │  • Generate next action                │
        └────────┬─────────────────────┬─────────┘
                 │                     │
                 │              ┌──────▼──────────────┐
                 │              │  Chaos Scenarios   │
                 │              │  (if chaos action) │
                 │              └──────┬─────────────┘
                 │                     │
                 └────────┬───────────┘
                          ▼
        ┌────────────────────────────────────────┐
        │    Execute Action (back to top)        │
        └────────────────────────────────────────┘
```

## Key Design Patterns

### 1. State Machine
- Application is modeled as states + transitions
- Each UI configuration = unique state
- Actions cause transitions
- Anomalies detected on transitions

### 2. Strategy Pattern
- Pluggable exploration strategies
- Easy to add new strategies
- Switch strategies mid-exploration
- Each strategy optimizes for different bug types

### 3. Observer Pattern
- Monitor multiple aspects (console, network, performance)
- React to state changes
- Detect anomalies as they occur

### 4. Adapter Pattern
- Playwright API wrapped for easier testing
- Action types abstracted from execution
- Easy to support additional action types

### 5. Chain of Responsibility
- Anomaly detection is modular
- Each detector is independent
- Easy to add new detectors

## Testing Modes

### Sequential (Default)
```
State 1 → Action 1 → State 2 → Action 2 → State 3 ...
```
Linear progression through exploration budget.

### Adaptive
```
State 1 → Analyze curiosity
        → Select high-curiosity action
        → State 2 → Repeat
```
Prioritizes unexplored areas.

### Chaos-Driven
```
State 1 → Action 1 (normal)
        → Action 2 (chaos)
        → Recover?
        → Continue
```
Injects failures strategically.

## Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| States captured/sec | 1-2 | Limited by screenshot, DOM parse |
| Actions executed/sec | 2-3 | Includes execution + wait time |
| Memory per state | ~1MB | Includes screenshots, logs |
| Typical run duration | 2-40min | Depends on step budget |
| Report generation | <1sec | JSON serialization |

## Extensibility Points

### Add New Anomaly Detector
1. Create method in `AnomalyDetector`
2. Call from `detectAnomalies()`
3. Return `Anomaly[]`

### Add New Action Strategy
1. Create method in `ActionGenerator`
2. Add case in `selectNextAction()`
3. Return `Action`

### Add New Chaos Scenario
1. Create async method in `ChaosScenarioManager`
2. Return `ChaosScenario` object
3. Call `runScenario()` from Explorer

### Customize Report Format
1. Extend `ReportGenerator`
2. Override `generateSessionReport()`
3. Customize output format

## See Also

- Implementation: `explorer-agent.ts`
- Usage: `run-explorer.ts`
- Documentation: `README.md`
- Integration: `INTEGRATION_GUIDE.md`
