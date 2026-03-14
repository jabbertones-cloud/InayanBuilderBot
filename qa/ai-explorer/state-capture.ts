/**
 * State capture and comparison for exploratory testing
 * Captures DOM snapshots, console messages, network activity, and performance metrics
 */

import { Page, ElectronApp } from 'playwright';
import crypto from 'crypto';

export interface ConsoleMessage {
  type: 'log' | 'error' | 'warning' | 'info' | 'debug';
  message: string;
  timestamp: number;
  stackTrace?: string;
}

export interface NetworkEvent {
  url: string;
  method: string;
  status?: number;
  duration: number;
  timestamp: number;
  failed: boolean;
  responseSize?: number;
}

export interface PerformanceMetrics {
  memoryUsage: number;
  cpuUsage: number;
  timestamp: number;
}

export interface UIState {
  id: string;
  timestamp: number;
  accessibility: string;
  consoleMessages: ConsoleMessage[];
  networkEvents: NetworkEvent[];
  performance: PerformanceMetrics;
  screenshotHash: string;
  windowSize: { width: number; height: number };
  focusedElement?: string;
  errors: string[];
  warnings: string[];
}

export interface StateComparison {
  changed: boolean;
  consoleErrors: ConsoleMessage[];
  networkFailures: NetworkEvent[];
  layoutShifts: boolean;
  newErrors: ConsoleMessage[];
  memoryGrowth: number;
}

export class StateCapturer {
  private previousConsoleMessages: ConsoleMessage[] = [];
  private previousNetworkEvents: NetworkEvent[] = [];
  private previousPerformance: PerformanceMetrics | null = null;
  private errorTimestamps = new Map<string, number>();

  async captureState(page: Page): Promise<UIState> {
    const timestamp = Date.now();

    // Capture accessibility tree
    const accessibility = await this.captureAccessibilityTree(page);

    // Get console messages
    const consoleMessages = await this.captureConsoleMessages(page);

    // Get network activity
    const networkEvents = await this.captureNetworkActivity(page);

    // Get performance metrics
    const performance = await this.capturePerformanceMetrics(page);

    // Capture screenshot hash
    const screenshotHash = await this.captureScreenshotHash(page);

    // Get window size
    const windowSize = await page.viewportSize() || { width: 1024, height: 768 };

    // Get focused element
    const focusedElement = await this.getFocusedElement(page);

    // Extract errors and warnings
    const errors = consoleMessages
      .filter(m => m.type === 'error')
      .map(m => m.message);

    const warnings = consoleMessages
      .filter(m => m.type === 'warning')
      .map(m => m.message);

    // Generate unique state ID
    const stateId = this.generateStateId({
      accessibility,
      screenshotHash,
      timestamp,
    });

    return {
      id: stateId,
      timestamp,
      accessibility,
      consoleMessages,
      networkEvents,
      performance,
      screenshotHash,
      windowSize,
      focusedElement,
      errors,
      warnings,
    };
  }

  async compareStates(previous: UIState, current: UIState): Promise<StateComparison> {
    const changed = previous.id !== current.id;

    // Find new console errors
    const previousErrorSet = new Set(
      previous.consoleMessages
        .filter(m => m.type === 'error')
        .map(m => m.message)
    );

    const newErrors = current.consoleMessages.filter(
      m => m.type === 'error' && !previousErrorSet.has(m.message)
    );

    // Find network failures
    const networkFailures = current.networkEvents.filter(e => e.failed);

    // Detect layout shifts
    const layoutShifts = await this.detectLayoutShifts(previous, current);

    // Calculate memory growth
    const memoryGrowth = current.performance.memoryUsage - previous.performance.memoryUsage;

    return {
      changed,
      consoleErrors: current.consoleMessages.filter(m => m.type === 'error'),
      networkFailures,
      layoutShifts,
      newErrors,
      memoryGrowth,
    };
  }

  private async captureAccessibilityTree(page: Page): Promise<string> {
    try {
      const snapshot = await page.accessibility.snapshot();
      return JSON.stringify(snapshot, null, 2);
    } catch (error) {
      return JSON.stringify({ error: String(error) });
    }
  }

  private async captureConsoleMessages(page: Page): Promise<ConsoleMessage[]> {
    const messages: ConsoleMessage[] = [];

    const handleConsole = (msg: any) => {
      messages.push({
        type: msg.type() as any,
        message: msg.text(),
        timestamp: Date.now(),
        stackTrace: msg.location().url,
      });
    };

    page.on('console', handleConsole);

    // Return accumulated messages, removing duplicates
    const allMessages = [...this.previousConsoleMessages, ...messages];
    const uniqueMessages = Array.from(
      new Map(allMessages.map(m => [m.message, m])).values()
    );

    this.previousConsoleMessages = uniqueMessages;
    return uniqueMessages;
  }

  private async captureNetworkActivity(page: Page): Promise<NetworkEvent[]> {
    const events: NetworkEvent[] = [];

    const handleResponse = (response: any) => {
      events.push({
        url: response.url(),
        method: response.request().method(),
        status: response.status(),
        duration: 0,
        timestamp: Date.now(),
        failed: !response.ok(),
        responseSize: 0,
      });
    };

    page.on('response', handleResponse);

    const allEvents = [...this.previousNetworkEvents, ...events];
    const uniqueEvents = Array.from(
      new Map(allEvents.map(e => [e.url + e.timestamp, e])).values()
    );

    this.previousNetworkEvents = uniqueEvents;
    return uniqueEvents;
  }

  private async capturePerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
    try {
      const metrics = await page.metrics();
      return {
        memoryUsage: metrics.JSHeapUsedSize,
        cpuUsage: 0, // Would need CDP for CPU usage
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        memoryUsage: 0,
        cpuUsage: 0,
        timestamp: Date.now(),
      };
    }
  }

  private async captureScreenshotHash(page: Page): Promise<string> {
    try {
      const screenshot = await page.screenshot({ type: 'png' });
      return crypto.createHash('sha256').update(screenshot).digest('hex');
    } catch (error) {
      return 'error';
    }
  }

  private async getFocusedElement(page: Page): Promise<string | undefined> {
    try {
      const focused = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        return el?.tagName + (el?.id ? `#${el.id}` : '');
      });
      return focused;
    } catch (error) {
      return undefined;
    }
  }

  private async detectLayoutShifts(previous: UIState, current: UIState): Promise<boolean> {
    // Simple heuristic: compare accessibility tree structure
    const prevStructure = this.extractStructure(previous.accessibility);
    const currStructure = this.extractStructure(current.accessibility);
    return prevStructure !== currStructure;
  }

  private extractStructure(accessibility: string): string {
    try {
      const data = JSON.parse(accessibility);
      return JSON.stringify(data, (key, value) => {
        if (key === 'name' || key === 'role') return value;
        return undefined;
      });
    } catch {
      return '';
    }
  }

  private generateStateId(data: any): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex').substring(0, 12);
  }
}
