/**
 * Generate QA reports from exploratory testing sessions
 * Produces bug reports, coverage maps, and reproducible test sequences
 */

import { promises as fs } from 'fs';
import path from 'path';
import { UIState } from './state-capture';
import { Anomaly } from './anomaly-detector';

export interface BugReport {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  anomalies: Anomaly[];
  reproductionSteps: string[];
  actionHistory: any[];
  screenshots: string[];
  consoleLogs: string[];
  networkLogs: string[];
  domSnapshot: string;
  expectedBehavior: string;
  actualBehavior: string;
  timestamp: number;
  environment: any;
}

export interface CoverageMap {
  totalStates: number;
  exploredStates: number;
  exploredSelectors: Set<string>;
  exploredFlows: Map<string, number>;
  unexploredAreas: string[];
  coveragePercent: number;
}

export interface SessionReport {
  sessionId: string;
  startTime: number;
  endTime: number;
  duration: number;
  totalSteps: number;
  bugsFound: number;
  bugReports: BugReport[];
  coverage: CoverageMap;
  anomalySummary: Record<string, number>;
  flakiness: Record<string, number>;
}

export class ReportGenerator {
  private bugReports: BugReport[] = [];
  private actionHistory: any[] = [];
  private allStates = new Map<string, UIState>();
  private exploredSelectors = new Set<string>();
  private exploredFlows = new Map<string, number>();
  private anomalyCounts = new Map<string, number>();
  private actionFlakiness = new Map<string, number>();

  async addBugReport(
    anomalies: Anomaly[],
    actionHistory: any[],
    currentState: UIState,
    environment: any
  ): Promise<void> {
    if (anomalies.length === 0) return;

    const mostSevereAnomaly = anomalies.reduce((prev, current) => {
      const severityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
      return severityOrder[current.severity] > severityOrder[prev.severity] ? current : prev;
    });

    const bugReport: BugReport = {
      id: `bug-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      title: this.generateTitle(mostSevereAnomaly),
      severity: mostSevereAnomaly.severity,
      description: this.generateDescription(anomalies),
      anomalies,
      reproductionSteps: this.generateReproductionSteps(actionHistory),
      actionHistory,
      screenshots: [], // Would be populated from action history
      consoleLogs: currentState.errors.concat(currentState.warnings),
      networkLogs: currentState.networkEvents.map((e) => `${e.method} ${e.url} - ${e.status}`),
      domSnapshot: currentState.accessibility,
      expectedBehavior: this.inferExpectedBehavior(actionHistory),
      actualBehavior: this.inferActualBehavior(anomalies),
      timestamp: Date.now(),
      environment,
    };

    this.bugReports.push(bugReport);

    // Track anomaly types
    for (const anomaly of anomalies) {
      this.anomalyCounts.set(anomaly.type, (this.anomalyCounts.get(anomaly.type) || 0) + 1);
    }
  }

  recordAction(action: any, state: UIState): void {
    this.actionHistory.push({
      action,
      state,
      timestamp: Date.now(),
    });

    this.allStates.set(state.id, state);

    if (action.selector) {
      this.exploredSelectors.add(action.selector);
    }
  }

  recordFlow(flowName: string): void {
    this.exploredFlows.set(flowName, (this.exploredFlows.get(flowName) || 0) + 1);
  }

  recordActionFlakiness(action: string, failed: boolean): void {
    this.actionFlakiness.set(action, (this.actionFlakiness.get(action) || 0) + (failed ? 1 : 0));
  }

  async generateSessionReport(sessionId: string, startTime: number): Promise<SessionReport> {
    const endTime = Date.now();
    const duration = endTime - startTime;

    const coverage = this.generateCoverageMap();

    const flakiness: Record<string, number> = {};
    for (const [action, fails] of this.actionFlakiness) {
      const totalAttempts = this.actionHistory.filter((a) => a.action === action).length;
      if (totalAttempts > 0) {
        flakiness[action] = (fails / totalAttempts) * 100;
      }
    }

    const anomalySummary: Record<string, number> = {};
    for (const [type, count] of this.anomalyCounts) {
      anomalySummary[type] = count;
    }

    return {
      sessionId,
      startTime,
      endTime,
      duration,
      totalSteps: this.actionHistory.length,
      bugsFound: this.bugReports.length,
      bugReports: this.bugReports,
      coverage,
      anomalySummary,
      flakiness,
    };
  }

  private generateCoverageMap(): CoverageMap {
    const totalPossibleStates = 100; // Heuristic estimate
    const exploredStates = this.allStates.size;

    return {
      totalStates: totalPossibleStates,
      exploredStates,
      exploredSelectors: this.exploredSelectors,
      exploredFlows: this.exploredFlows,
      unexploredAreas: this.findUnexploredAreas(),
      coveragePercent: (exploredStates / totalPossibleStates) * 100,
    };
  }

  private findUnexploredAreas(): string[] {
    const commonFlows = [
      'onboarding',
      'settings',
      'sync',
      'messaging',
      'notifications',
      'integrations',
      'help',
      'advanced-settings',
    ];

    const explored = Array.from(this.exploredFlows.keys());
    return commonFlows.filter((flow) => !explored.includes(flow));
  }

  private generateTitle(anomaly: Anomaly): string {
    const typeNames: Record<string, string> = {
      console_error: 'Console Error',
      unhandled_rejection: 'Unhandled Promise Rejection',
      layout_shift: 'Unexpected Layout Shift',
      dead_click: 'Dead Click - Unresponsive Element',
      infinite_loading: 'Infinite Loading',
      memory_leak: 'Potential Memory Leak',
      network_error: 'Network Error',
      crash: 'Application Crash',
      timeout: 'Slow Network Request',
      visual_regression: 'Visual Regression',
    };

    return typeNames[anomaly.type] || anomaly.type;
  }

  private generateDescription(anomalies: Anomaly[]): string {
    const details = anomalies
      .map((a) => `- ${a.type}: ${a.message}`)
      .join('\n');

    return `Found ${anomalies.length} anomaly(ies):\n${details}`;
  }

  private generateReproductionSteps(actionHistory: any[]): string[] {
    return actionHistory
      .slice(-10) // Last 10 actions
      .map((entry, idx) => {
        const action = entry.action;
        if (action.type === 'click') {
          return `${idx + 1}. Click on ${action.selector}`;
        } else if (action.type === 'type') {
          return `${idx + 1}. Type "${action.text}" in ${action.selector}`;
        } else if (action.type === 'navigate') {
          return `${idx + 1}. Navigate to ${action.text}`;
        } else {
          return `${idx + 1}. ${action.description}`;
        }
      });
  }

  private inferExpectedBehavior(actionHistory: any[]): string {
    if (actionHistory.length === 0) return 'Application should be responsive';

    const lastAction = actionHistory[actionHistory.length - 1]?.action;
    if (!lastAction) return 'Application should function normally';

    switch (lastAction.type) {
      case 'click':
        return 'Element should respond to click; related UI changes or navigation should occur';
      case 'type':
        return 'Text should be entered into field without errors';
      case 'navigate':
        return 'Navigation should succeed without console errors';
      default:
        return 'Application should function normally';
    }
  }

  private inferActualBehavior(anomalies: Anomaly[]): string {
    const types = new Set(anomalies.map((a) => a.type));
    const behaviors: string[] = [];

    if (types.has('console_error')) behaviors.push('Console errors occurred');
    if (types.has('dead_click')) behaviors.push('Element did not respond to interaction');
    if (types.has('infinite_loading'))
      behaviors.push('Loading state persisted indefinitely');
    if (types.has('network_error')) behaviors.push('Network request failed');
    if (types.has('crash')) behaviors.push('Application crashed');

    return behaviors.length > 0
      ? behaviors.join('; ')
      : 'Unexpected behavior occurred';
  }

  async writeReportsToFile(outputDir: string, report: SessionReport): Promise<void> {
    await fs.mkdir(outputDir, { recursive: true });

    // Write JSON report
    const jsonPath = path.join(outputDir, `report-${report.sessionId}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

    // Write Markdown report
    const mdPath = path.join(outputDir, `report-${report.sessionId}.md`);
    await fs.writeFile(mdPath, this.generateMarkdownReport(report));

    // Write bug reports
    const bugsPath = path.join(outputDir, `bugs-${report.sessionId}.json`);
    await fs.writeFile(bugsPath, JSON.stringify(report.bugReports, null, 2));

    console.log(`Reports written to ${outputDir}`);
  }

  private generateMarkdownReport(report: SessionReport): string {
    let markdown = `# Exploratory Testing Session Report\n\n`;
    markdown += `**Session ID:** ${report.sessionId}\n`;
    markdown += `**Duration:** ${(report.duration / 1000).toFixed(1)}s\n`;
    markdown += `**Total Steps:** ${report.totalSteps}\n`;
    markdown += `**Bugs Found:** ${report.bugsFound}\n`;
    markdown += `**Coverage:** ${report.coverage.coveragePercent.toFixed(1)}%\n\n`;

    markdown += `## Bug Summary\n\n`;
    for (const bug of report.bugReports) {
      markdown += `### [${bug.severity.toUpperCase()}] ${bug.title}\n\n`;
      markdown += `${bug.description}\n\n`;
      markdown += `**Reproduction Steps:**\n`;
      for (const step of bug.reproductionSteps) {
        markdown += `- ${step}\n`;
      }
      markdown += `\n`;
    }

    markdown += `## Coverage Analysis\n\n`;
    markdown += `- **Explored States:** ${report.coverage.exploredStates} / ${report.coverage.totalStates}\n`;
    markdown += `- **Explored Flows:** ${Array.from(report.coverage.exploredFlows.keys()).join(', ')}\n`;
    if (report.coverage.unexploredAreas.length > 0) {
      markdown += `- **Unexplored Areas:** ${report.coverage.unexploredAreas.join(', ')}\n`;
    }
    markdown += `\n`;

    markdown += `## Anomaly Summary\n\n`;
    for (const [type, count] of Object.entries(report.anomalySummary)) {
      markdown += `- ${type}: ${count}\n`;
    }
    markdown += `\n`;

    if (Object.keys(report.flakiness).length > 0) {
      markdown += `## Action Flakiness\n\n`;
      for (const [action, flakiness] of Object.entries(report.flakiness)) {
        markdown += `- ${action}: ${flakiness.toFixed(1)}% failure rate\n`;
      }
    }

    return markdown;
  }

  async generatePlaywrightTest(bug: BugReport, outputDir: string): Promise<void> {
    const testCode = this.generateTestCode(bug);
    const testPath = path.join(outputDir, `test-${bug.id}.ts`);
    await fs.writeFile(testPath, testCode);
  }

  private generateTestCode(bug: BugReport): string {
    let code = `import { test, expect } from '@playwright/test';\n\n`;
    code += `test('Regression test: ${bug.title}', async ({ page }) => {\n`;
    code += `  // Navigate to app\n`;
    code += `  await page.goto('http://localhost:3000');\n\n`;

    code += `  // Reproduce steps\n`;
    for (const step of bug.reproductionSteps) {
      code += `  // ${step}\n`;
    }

    code += `\n  // Verify fix\n`;
    code += `  // Add assertions here\n`;
    code += `});\n`;

    return code;
  }
}
