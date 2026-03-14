/**
 * Automated anomaly detection for exploratory testing
 * Detects console errors, unhandled rejections, layout shifts, and performance issues
 */

import { Page } from 'playwright';
import { UIState, StateComparison } from './state-capture';

export interface Anomaly {
  type:
    | 'console_error'
    | 'unhandled_rejection'
    | 'layout_shift'
    | 'dead_click'
    | 'infinite_loading'
    | 'memory_leak'
    | 'network_error'
    | 'crash'
    | 'timeout'
    | 'visual_regression';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: number;
  context?: any;
  selector?: string;
}

export class AnomalyDetector {
  private unhandledRejections: Error[] = [];
  private spinnerStartTime: Map<string, number> = new Map();
  private previousMemoryUsage: number = 0;
  private memoryReadings: number[] = [];
  private previousScreenshots = new Map<string, number>();
  private consoleErrorsSeen = new Set<string>();
  private lastCrashTime: number = 0;

  async initializeDetectors(page: Page): Promise<void> {
    // Catch unhandled rejections
    page.on('pageerror', (error) => {
      this.unhandledRejections.push(error);
    });

    // Catch console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const errorMsg = msg.text();
        if (!this.consoleErrorsSeen.has(errorMsg)) {
          this.consoleErrorsSeen.add(errorMsg);
        }
      }
    });

    // Detect crashes
    page.on('close', () => {
      this.lastCrashTime = Date.now();
    });
  }

  /**
   * Detect anomalies from state transition
   */
  async detectAnomalies(
    previousState: UIState | null,
    currentState: UIState,
    comparison: StateComparison | null,
    page: Page
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Console errors
    anomalies.push(...this.detectConsoleErrors(currentState));

    // Unhandled rejections
    anomalies.push(...this.detectUnhandledRejections());

    // Layout shifts
    if (previousState && comparison) {
      anomalies.push(...this.detectLayoutShifts(comparison));
    }

    // Dead clicks
    anomalies.push(...this.detectDeadClicks(currentState));

    // Infinite loading
    anomalies.push(...this.detectInfiniteLoading(currentState));

    // Memory leaks
    anomalies.push(...this.detectMemoryLeaks(currentState));

    // Network errors
    anomalies.push(...this.detectNetworkErrors(currentState));

    // Timeout detection
    anomalies.push(...this.detectTimeouts(currentState));

    // Visual regressions (if we have previous screenshots)
    if (previousState) {
      anomalies.push(...this.detectVisualRegressions(previousState, currentState));
    }

    return anomalies;
  }

  /**
   * Detect console errors
   */
  private detectConsoleErrors(state: UIState): Anomaly[] {
    return state.errors.map((error) => ({
      type: 'console_error' as const,
      severity: this.getErrorSeverity(error),
      message: error,
      timestamp: state.timestamp,
      context: { consoleError: error },
    }));
  }

  /**
   * Detect unhandled rejections
   */
  private detectUnhandledRejections(): Anomaly[] {
    const anomalies = this.unhandledRejections.map((error) => ({
      type: 'unhandled_rejection' as const,
      severity: 'high' as const,
      message: `Unhandled promise rejection: ${error.message}`,
      timestamp: Date.now(),
      context: { error: error.toString() },
    }));

    // Clear after reporting
    this.unhandledRejections = [];

    return anomalies;
  }

  /**
   * Detect layout shifts
   */
  private detectLayoutShifts(comparison: StateComparison): Anomaly[] {
    if (!comparison.layoutShifts) {
      return [];
    }

    return [
      {
        type: 'layout_shift' as const,
        severity: 'medium' as const,
        message: 'Unexpected layout shift detected',
        timestamp: Date.now(),
        context: { layoutShifted: true },
      },
    ];
  }

  /**
   * Detect dead clicks - elements that don't respond
   */
  private detectDeadClicks(state: UIState): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // If there are console errors about missing handlers or click events
    for (const error of state.errors) {
      if (
        error.includes('click') ||
        error.includes('handler') ||
        error.includes('listener') ||
        error.includes('undefined')
      ) {
        anomalies.push({
          type: 'dead_click' as const,
          severity: 'medium' as const,
          message: `Potential dead click detected: ${error}`,
          timestamp: state.timestamp,
          context: { error },
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect infinite loading - spinners stuck for > 10 seconds
   */
  async detectInfiniteLoading(state: UIState): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Try to detect loading spinners via accessibility tree
    try {
      const spinners = state.accessibility.toLowerCase().match(/loading|spinner|progress/gi) || [];

      for (const spinner of spinners) {
        const key = spinner;
        const now = Date.now();

        if (!this.spinnerStartTime.has(key)) {
          this.spinnerStartTime.set(key, now);
        } else {
          const startTime = this.spinnerStartTime.get(key)!;
          const duration = now - startTime;

          if (duration > 10000) {
            anomalies.push({
              type: 'infinite_loading' as const,
              severity: 'high' as const,
              message: `Infinite loading detected: ${key} spinner active for ${duration}ms`,
              timestamp: state.timestamp,
              context: { spinnerType: key, duration },
            });
          }
        }
      }

      // Clear spinners that are no longer visible
      for (const [key] of this.spinnerStartTime) {
        if (!state.accessibility.toLowerCase().includes(key.toLowerCase())) {
          this.spinnerStartTime.delete(key);
        }
      }
    } catch (error) {
      // Ignore parsing errors
    }

    return anomalies;
  }

  /**
   * Detect memory leaks - steadily growing memory
   */
  private detectMemoryLeaks(state: UIState): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const currentMemory = state.performance.memoryUsage;

    this.memoryReadings.push(currentMemory);

    // Keep last 10 readings
    if (this.memoryReadings.length > 10) {
      this.memoryReadings.shift();
    }

    // Check if memory is steadily growing
    if (this.memoryReadings.length >= 10) {
      let increasing = true;
      for (let i = 1; i < this.memoryReadings.length; i++) {
        if (this.memoryReadings[i] < this.memoryReadings[i - 1]) {
          increasing = false;
          break;
        }
      }

      if (increasing) {
        const growth = currentMemory - this.memoryReadings[0];
        const growthPercent = (growth / this.memoryReadings[0]) * 100;

        if (growthPercent > 50) {
          anomalies.push({
            type: 'memory_leak' as const,
            severity: 'high' as const,
            message: `Potential memory leak: memory grew by ${growthPercent.toFixed(1)}%`,
            timestamp: state.timestamp,
            context: { initialMemory: this.memoryReadings[0], currentMemory, growthPercent },
          });
        }
      }
    }

    this.previousMemoryUsage = currentMemory;
    return anomalies;
  }

  /**
   * Detect network errors
   */
  private detectNetworkErrors(state: UIState): Anomaly[] {
    const anomalies: Anomaly[] = [];

    for (const event of state.networkEvents) {
      if (event.failed) {
        anomalies.push({
          type: 'network_error' as const,
          severity: this.getNetworkErrorSeverity(event.status),
          message: `Network error: ${event.method} ${event.url} returned ${event.status}`,
          timestamp: event.timestamp,
          context: { url: event.url, status: event.status, method: event.method },
        });
      }

      // Detect slow requests (> 5 seconds)
      if (event.duration > 5000) {
        anomalies.push({
          type: 'timeout' as const,
          severity: 'medium' as const,
          message: `Slow request: ${event.url} took ${event.duration}ms`,
          timestamp: event.timestamp,
          context: { url: event.url, duration: event.duration },
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect timeouts
   */
  private detectTimeouts(state: UIState): Anomaly[] {
    if (this.lastCrashTime && Date.now() - this.lastCrashTime < 1000) {
      return [
        {
          type: 'crash' as const,
          severity: 'critical' as const,
          message: 'Application crashed',
          timestamp: this.lastCrashTime,
          context: { crashTime: this.lastCrashTime },
        },
      ];
    }

    return [];
  }

  /**
   * Detect visual regressions
   */
  private detectVisualRegressions(previousState: UIState, currentState: UIState): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Simple hash comparison - significant change = potential regression
    if (previousState.screenshotHash !== currentState.screenshotHash) {
      const similarityScore = this.calculateHashSimilarity(
        previousState.screenshotHash,
        currentState.screenshotHash
      );

      if (similarityScore < 0.7) {
        anomalies.push({
          type: 'visual_regression' as const,
          severity: 'medium' as const,
          message: `Visual regression detected: ${(similarityScore * 100).toFixed(1)}% similarity`,
          timestamp: currentState.timestamp,
          context: { similarityScore, previousHash: previousState.screenshotHash },
        });
      }
    }

    return anomalies;
  }

  /**
   * Get error severity based on error message
   */
  private getErrorSeverity(error: string): 'critical' | 'high' | 'medium' | 'low' {
    const errorLower = error.toLowerCase();

    if (
      errorLower.includes('critical') ||
      errorLower.includes('fatal') ||
      errorLower.includes('crash') ||
      errorLower.includes('cannot read')
    ) {
      return 'critical';
    } else if (
      errorLower.includes('error') ||
      errorLower.includes('failed') ||
      errorLower.includes('exception')
    ) {
      return 'high';
    } else if (errorLower.includes('warning')) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Get network error severity based on status code
   */
  private getNetworkErrorSeverity(status?: number): 'critical' | 'high' | 'medium' | 'low' {
    if (!status) return 'medium';
    if (status >= 500) return 'high';
    if (status === 408 || status === 429) return 'medium';
    if (status >= 400) return 'low';
    return 'low';
  }

  /**
   * Calculate similarity between two hashes (Hamming distance)
   */
  private calculateHashSimilarity(hash1: string, hash2: string): number {
    let matches = 0;
    const minLength = Math.min(hash1.length, hash2.length);

    for (let i = 0; i < minLength; i++) {
      if (hash1[i] === hash2[i]) {
        matches++;
      }
    }

    return matches / minLength;
  }

  /**
   * Clear anomaly history
   */
  clear(): void {
    this.unhandledRejections = [];
    this.spinnerStartTime.clear();
    this.memoryReadings = [];
    this.consoleErrorsSeen.clear();
    this.previousScreenshots.clear();
  }
}
