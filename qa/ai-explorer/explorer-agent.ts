/**
 * AI-driven exploratory testing agent for MorningOps Desktop
 * Main orchestrator that explores the app like a human QA tester
 */

import { _electron as electron, ElectronApp, Page } from 'playwright';
import path from 'path';
import { StateCapturer, UIState, StateComparison } from './state-capture';
import { ActionGenerator, Action } from './action-generator';
import { AnomalyDetector, Anomaly } from './anomaly-detector';
import { ReportGenerator, SessionReport } from './report-generator';
import { ChaosScenarioManager } from './chaos-scenarios';

export interface ExplorationConfig {
  maxSteps: number;
  timeout: number;
  focusAreas?: string[];
  strategy: 'random' | 'grammar' | 'boundary' | 'chaos' | 'mixed';
  enableChaos: boolean;
  outputDir: string;
  appPath: string;
}

export interface ExplorationState {
  currentStep: number;
  totalSteps: number;
  currentState: UIState | null;
  previousState: UIState | null;
  exploredStates: Map<string, number>;
  discoveredAnomalies: Anomaly[];
  curiosityScore: Map<string, number>;
  budget: number;
}

export class ExplorerAgent {
  private config: ExplorationConfig;
  private state: ExplorationState;
  private page: Page | null = null;
  private app: ElectronApp | null = null;
  private stateCapturer: StateCapturer;
  private actionGenerator: ActionGenerator | null = null;
  private anomalyDetector: AnomalyDetector;
  private reportGenerator: ReportGenerator;
  private chaosManager: ChaosScenarioManager;
  private sessionStartTime: number = 0;

  constructor(config: ExplorationConfig) {
    this.config = config;
    this.state = {
      currentStep: 0,
      totalSteps: config.maxSteps,
      currentState: null,
      previousState: null,
      exploredStates: new Map(),
      discoveredAnomalies: [],
      curiosityScore: new Map(),
      budget: config.maxSteps,
    };

    this.stateCapturer = new StateCapturer();
    this.anomalyDetector = new AnomalyDetector();
    this.reportGenerator = new ReportGenerator();
    this.chaosManager = new ChaosScenarioManager('./data.db');
  }

  /**
   * Start exploratory testing session
   */
  async run(): Promise<SessionReport> {
    console.log('Starting AI Exploratory Testing Agent');
    console.log(`Configuration: ${JSON.stringify(this.config, null, 2)}`);

    this.sessionStartTime = Date.now();
    const sessionId = `session-${Date.now()}`;

    try {
      await this.launchApp();
      await this.anomalyDetector.initializeDetectors(this.page!);

      // Main exploration loop
      while (this.state.budget > 0) {
        console.log(
          `\n[${this.state.currentStep + 1}/${this.config.maxSteps}] Budget remaining: ${this.state.budget}`
        );

        // Capture current state
        this.state.currentState = await this.stateCapturer.captureState(this.page!);

        console.log(`State ID: ${this.state.currentState.id}`);

        // Detect anomalies
        let comparison: StateComparison | null = null;
        if (this.state.previousState) {
          comparison = await this.stateCapturer.compareStates(
            this.state.previousState,
            this.state.currentState
          );
        }

        const anomalies = await this.anomalyDetector.detectAnomalies(
          this.state.previousState || null,
          this.state.currentState,
          comparison || null,
          this.page!
        );

        if (anomalies.length > 0) {
          console.log(`Found ${anomalies.length} anomaly(ies):`);
          for (const anomaly of anomalies) {
            console.log(
              `  - [${anomaly.severity.toUpperCase()}] ${anomaly.type}: ${anomaly.message}`
            );
          }

          // Report bugs
          await this.reportGenerator.addBugReport(
            anomalies,
            this.getActionHistory(),
            this.state.currentState,
            { strategy: this.config.strategy }
          );

          this.state.discoveredAnomalies.push(...anomalies);
        }

        // Track state
        const stateId = this.state.currentState.id;
        this.state.exploredStates.set(stateId, (this.state.exploredStates.get(stateId) || 0) + 1);

        // Update curiosity score
        this.updateCuriosityScore();

        // Generate next action
        if (this.actionGenerator === null) {
          this.actionGenerator = new ActionGenerator(this.page!);
        }

        const strategy = this.selectStrategy();
        const action = await this.actionGenerator.selectNextAction(
          this.state.exploredStates,
          await this.extractSelectorsFromState(this.state.currentState),
          strategy
        );

        console.log(`Action: ${action.description}`);

        // Execute action
        try {
          await this.executeAction(action);
          this.reportGenerator.recordAction(action, this.state.currentState);
        } catch (error) {
          console.error(`Action failed: ${error}`);
        }

        // Move to next step
        this.state.previousState = this.state.currentState;
        this.state.currentStep++;
        this.state.budget--;
      }

      // Generate final report
      const report = await this.reportGenerator.generateSessionReport(
        sessionId,
        this.sessionStartTime
      );

      console.log(`\nExploration complete!`);
      console.log(`Session: ${report.sessionId}`);
      console.log(`Steps: ${report.totalSteps}`);
      console.log(`Bugs found: ${report.bugsFound}`);
      console.log(`Coverage: ${report.coverage.coveragePercent.toFixed(1)}%`);

      // Write reports
      await this.reportGenerator.writeReportsToFile(this.config.outputDir, report);

      return report;
    } catch (error) {
      console.error('Exploration error:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Launch the Electron app
   *
   * Matches the launch pattern from e2e/app.spec.ts:
   * - Uses the compiled main script (dist/main/main/index.js)
   * - Sets SKIP_LICENSE=1 and NODE_ENV=test
   * - Sets cwd to the app root
   * - Uses a 45s launch timeout
   */
  private async launchApp(): Promise<void> {
    // Resolve the app root and main script, matching e2e/app.spec.ts
    const appRoot = path.resolve(this.config.appPath);
    const mainScript = path.join(appRoot, 'dist', 'main', 'main', 'index.js');

    console.log(`Launching app from: ${appRoot}`);
    console.log(`Main script: ${mainScript}`);

    this.app = await electron.launch({
      args: [mainScript],
      cwd: appRoot,
      env: {
        ...process.env,
        SKIP_LICENSE: '1',
        NODE_ENV: 'test',
      },
      timeout: 45000,
    });

    this.page = await this.app.firstWindow({ timeout: 15000 });

    if (!this.page) {
      throw new Error('Failed to get first window');
    }

    console.log('App launched successfully');
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: Action): Promise<void> {
    const timeout = Math.min(5000, this.config.timeout);

    switch (action.type) {
      case 'click':
        if (action.selector) {
          try {
            await this.page!.click(action.selector, { timeout });
          } catch (error) {
            console.warn(`Click failed: ${error}`);
          }
        }
        break;

      case 'type':
        if (action.selector && action.text) {
          try {
            await this.page!.fill(action.selector, action.text, { timeout });
          } catch (error) {
            console.warn(`Type failed: ${error}`);
          }
        }
        break;

      case 'navigate':
        if (action.text) {
          try {
            // Handle relative URLs
            const url = action.text.startsWith('http') ? action.text : `http://localhost:3000${action.text}`;
            await this.page!.goto(url, { timeout });
          } catch (error) {
            console.warn(`Navigation failed: ${error}`);
          }
        }
        break;

      case 'scroll':
        try {
          const amount = action.payload?.amount || 100;
          await this.page!.evaluate((amt: number) => {
            window.scrollBy(0, amt);
          }, amount);
        } catch (error) {
          console.warn(`Scroll failed: ${error}`);
        }
        break;

      case 'hover':
        if (action.selector) {
          try {
            await this.page!.hover(action.selector, { timeout });
          } catch (error) {
            console.warn(`Hover failed: ${error}`);
          }
        }
        break;

      case 'rightClick':
        if (action.selector) {
          try {
            await this.page!.click(action.selector, { button: 'right', timeout });
          } catch (error) {
            console.warn(`Right-click failed: ${error}`);
          }
        }
        break;

      case 'doubleClick':
        if (action.selector) {
          try {
            await this.page!.dblclick(action.selector, { timeout });
          } catch (error) {
            console.warn(`Double-click failed: ${error}`);
          }
        }
        break;

      case 'pressKey':
        if (action.key) {
          try {
            await this.page!.keyboard.press(action.key);
          } catch (error) {
            console.warn(`Key press failed: ${error}`);
          }
        }
        break;

      case 'resize':
        if (action.payload) {
          try {
            await this.page!.setViewportSize(action.payload);
          } catch (error) {
            console.warn(`Resize failed: ${error}`);
          }
        }
        break;

      case 'chaos':
        if (action.payload) {
          await this.executeChaos(action.payload);
        }
        break;

      default:
        console.warn(`Unknown action type: ${action.type}`);
    }

    // Small delay to allow UI to update
    await new Promise((resolve) => setTimeout(resolve, action.delay || 100));
  }

  /**
   * Execute chaos scenario
   */
  private async executeChaos(payload: any): Promise<void> {
    if (!this.config.enableChaos) {
      console.log('Chaos testing disabled');
      return;
    }

    console.log(`Executing chaos scenario: ${payload.type}`);

    switch (payload.type) {
      case 'kill-backend':
        // Would require backend PID environment variable
        console.log('Chaos: kill-backend (not implemented in this scope)');
        break;

      case 'network-flap':
        const flapScenario = await this.chaosManager.simulateNetworkFlap();
        await this.chaosManager.runScenario(flapScenario);
        break;

      case 'slow-network':
        const slowScenario = await this.chaosManager.simulateSlowNetwork(3000);
        await this.chaosManager.runScenario(slowScenario);
        break;

      case 'corrupt-db':
        const corruptScenario = await this.chaosManager.corruptDatabase();
        await this.chaosManager.runScenario(corruptScenario);
        break;

      case 'fill-disk':
        const diskScenario = await this.chaosManager.fillDiskSpace(90);
        await this.chaosManager.runScenario(diskScenario);
        break;

      case 'revoke-token':
        const tokenScenario = await this.chaosManager.revokeOAuthToken();
        await this.chaosManager.runScenario(tokenScenario);
        break;

      case 'restart-app':
        console.log('Restarting app...');
        await this.cleanup();
        await this.launchApp();
        break;
    }
  }

  /**
   * Select exploration strategy based on state
   */
  private selectStrategy(): 'random' | 'grammar' | 'boundary' | 'chaos' {
    if (this.config.strategy === 'mixed') {
      const strategies: Array<'random' | 'grammar' | 'boundary' | 'chaos'> = [
        'random',
        'grammar',
        'boundary',
      ];

      if (this.config.enableChaos && this.state.currentStep % 50 === 0) {
        strategies.push('chaos');
      }

      return strategies[Math.floor(Math.random() * strategies.length)];
    }

    return this.config.strategy as 'random' | 'grammar' | 'boundary' | 'chaos';
  }

  /**
   * Update curiosity score for unexplored states
   */
  private updateCuriosityScore(): void {
    if (!this.state.currentState) return;

    const stateId = this.state.currentState.id;
    const visitCount = this.state.exploredStates.get(stateId) || 0;

    // Penalize frequently visited states
    const curiosity = Math.max(0, 1 - visitCount / 10);
    this.state.curiosityScore.set(stateId, curiosity);
  }

  /**
   * Extract interactive selectors from current state
   */
  private async extractSelectorsFromState(state: UIState): Promise<string[]> {
    try {
      // Parse accessibility tree to find interactive elements
      const data = JSON.parse(state.accessibility);
      return this.walkAccessibilityTree(data);
    } catch (error) {
      return [];
    }
  }

  /**
   * Recursively walk accessibility tree to find selectors
   */
  private walkAccessibilityTree(node: any, selectors: string[] = []): string[] {
    if (!node) return selectors;

    // Collect node info
    if (node.role && (node.role === 'button' || node.role === 'link' || node.role === 'textbox')) {
      const selector = node.name || node.role;
      selectors.push(selector);
    }

    // Recurse on children
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.walkAccessibilityTree(child, selectors);
      }
    }

    return selectors;
  }

  /**
   * Get action history for reporting
   */
  private getActionHistory(): any[] {
    // This would be collected during exploration
    return [];
  }

  /**
   * Cleanup and shutdown
   */
  private async cleanup(): Promise<void> {
    console.log('Cleaning up...');

    try {
      if (this.page) {
        await this.page.close();
      }

      if (this.app) {
        await this.app.close();
      }

      await this.chaosManager.cleanup();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}
