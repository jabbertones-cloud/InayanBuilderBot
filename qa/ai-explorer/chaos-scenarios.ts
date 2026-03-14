/**
 * Chaos engineering scenarios for desktop app testing
 * Simulate failure modes and recovery
 */

import { ChildProcess, spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export interface ChaosScenario {
  name: string;
  description: string;
  setup: () => Promise<void>;
  teardown: () => Promise<void>;
  duration: number; // milliseconds
}

export class ChaosScenarioManager {
  private runningProcesses: Map<string, ChildProcess> = new Map();
  private originalEnv = { ...process.env };
  private dbPath: string;
  private backupDbPath: string;

  constructor(dbPath: string = './data.db') {
    this.dbPath = dbPath;
    this.backupDbPath = `${dbPath}.backup`;
  }

  /**
   * Kill and restart backend service mid-sync
   */
  async killAndRestartBackend(): Promise<ChaosScenario> {
    return {
      name: 'Kill and Restart Backend',
      description: 'Kill backend process during sync, test recovery',
      setup: async () => {
        // Send SIGTERM to backend process
        const backendPid = process.env.BACKEND_PID;
        if (backendPid) {
          try {
            process.kill(parseInt(backendPid), 'SIGTERM');
            console.log('Killed backend process');
          } catch (error) {
            console.error('Failed to kill backend:', error);
          }
        }
      },
      teardown: async () => {
        // Restart backend
        console.log('Restarting backend...');
        // This would depend on your specific backend startup mechanism
      },
      duration: 5000,
    };
  }

  /**
   * Corrupt SQLite database and test recovery
   */
  async corruptDatabase(): Promise<ChaosScenario> {
    return {
      name: 'Corrupt Database',
      description: 'Corrupt SQLite database file, test graceful degradation',
      setup: async () => {
        try {
          // Backup original database
          await fs.copyFile(this.dbPath, this.backupDbPath);
          console.log(`Backed up database to ${this.backupDbPath}`);

          // Read and corrupt database
          const data = await fs.readFile(this.dbPath);
          const corruptedData = Buffer.alloc(data.length);
          data.copy(corruptedData);

          // Flip some bits in the middle
          for (let i = Math.floor(data.length / 2); i < Math.floor(data.length / 2) + 100; i++) {
            corruptedData[i] = Math.floor(Math.random() * 256);
          }

          await fs.writeFile(this.dbPath, corruptedData);
          console.log('Database corrupted');
        } catch (error) {
          console.error('Failed to corrupt database:', error);
        }
      },
      teardown: async () => {
        try {
          // Restore backup
          await fs.copyFile(this.backupDbPath, this.dbPath);
          await fs.unlink(this.backupDbPath);
          console.log('Database restored');
        } catch (error) {
          console.error('Failed to restore database:', error);
        }
      },
      duration: 10000,
    };
  }

  /**
   * Simulate network flap - rapid disconnect/reconnect
   */
  async simulateNetworkFlap(): Promise<ChaosScenario> {
    const flaps = 5;
    const interval = 1000; // 1s between flaps

    return {
      name: 'Network Flap',
      description: 'Rapidly disconnect and reconnect network',
      setup: async () => {
        console.log('Starting network flap simulation...');

        for (let i = 0; i < flaps; i++) {
          console.log(`Flap ${i + 1}/${flaps}: Disconnecting...`);
          await this.simulateNetworkDisconnect();

          await this.sleep(interval / 2);

          console.log(`Flap ${i + 1}/${flaps}: Reconnecting...`);
          await this.simulateNetworkReconnect();

          if (i < flaps - 1) {
            await this.sleep(interval / 2);
          }
        }
      },
      teardown: async () => {
        // Ensure network is restored
        await this.simulateNetworkReconnect();
        console.log('Network flap simulation complete');
      },
      duration: flaps * interval + 2000,
    };
  }

  /**
   * Simulate slow network - add latency
   */
  async simulateSlowNetwork(latencyMs: number = 5000): Promise<ChaosScenario> {
    return {
      name: 'Slow Network',
      description: `Simulate slow network with ${latencyMs}ms latency`,
      setup: async () => {
        // Using system-level tools to simulate latency
        try {
          if (process.platform === 'darwin' || process.platform === 'linux') {
            // Using tc (traffic control) on Linux/macOS
            const command = `tc qdisc add dev lo root netem delay ${latencyMs}ms`;
            console.log(`Applying network slowdown: ${command}`);
            // This would require sudo privileges
          }
        } catch (error) {
          console.error('Failed to apply network slowdown:', error);
        }
      },
      teardown: async () => {
        try {
          if (process.platform === 'darwin' || process.platform === 'linux') {
            const command = `tc qdisc del dev lo root`;
            console.log('Removing network slowdown');
          }
        } catch (error) {
          console.error('Failed to remove network slowdown:', error);
        }
      },
      duration: 30000,
    };
  }

  /**
   * Fill disk space and test graceful degradation
   */
  async fillDiskSpace(percentFull: number = 95): Promise<ChaosScenario> {
    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, 'disk-fill-test.bin');
    const maxSize = 1024 * 1024 * 1024; // 1GB test file

    return {
      name: 'Fill Disk Space',
      description: `Fill disk to ${percentFull}% capacity`,
      setup: async () => {
        try {
          // Create a large file to simulate disk pressure
          const fileHandle = await fs.open(filePath, 'w');
          const buffer = Buffer.alloc(1024 * 1024); // 1MB chunks

          for (let i = 0; i < maxSize / buffer.length; i++) {
            await fileHandle.write(buffer);
          }

          await fileHandle.close();
          console.log(`Created disk fill file at ${filePath}`);
        } catch (error) {
          console.error('Failed to fill disk:', error);
        }
      },
      teardown: async () => {
        try {
          await fs.unlink(filePath);
          console.log('Cleaned up disk fill file');
        } catch (error) {
          console.error('Failed to clean disk fill file:', error);
        }
      },
      duration: 15000,
    };
  }

  /**
   * Revoke OAuth token mid-session
   */
  async revokeOAuthToken(): Promise<ChaosScenario> {
    return {
      name: 'Revoke OAuth Token',
      description: 'Revoke authentication token and test re-authentication flow',
      setup: async () => {
        // This would depend on your OAuth provider
        console.log('Revoking OAuth token...');

        // Simulate token revocation by clearing stored token
        const tokenPaths = [
          path.join(os.homedir(), '.morningops', 'auth-token'),
          path.join(os.homedir(), '.config', 'morningops', 'token'),
        ];

        for (const tokenPath of tokenPaths) {
          try {
            await fs.unlink(tokenPath);
            console.log(`Revoked token at ${tokenPath}`);
          } catch (error) {
            // File may not exist
          }
        }
      },
      teardown: async () => {
        console.log('OAuth token revocation complete');
      },
      duration: 5000,
    };
  }

  /**
   * Rapidly resize window
   */
  async rapidWindowResize(): Promise<ChaosScenario> {
    const sizes = [
      { width: 320, height: 480 }, // Mobile
      { width: 1024, height: 768 }, // Tablet
      { width: 1920, height: 1080 }, // Desktop
      { width: 1280, height: 720 }, // Laptop
    ];

    return {
      name: 'Rapid Window Resize',
      description: 'Rapidly resize window to different dimensions',
      setup: async () => {
        console.log('Starting rapid window resize...');
        // This would be handled by the exploratory testing agent
        // which has access to the Playwright page object
      },
      teardown: async () => {
        console.log('Window resize test complete');
      },
      duration: 10000,
    };
  }

  /**
   * Simulate CPU overload
   */
  async cpuOverload(): Promise<ChaosScenario> {
    let shouldStop = false;

    return {
      name: 'CPU Overload',
      description: 'Consume CPU resources to simulate system under load',
      setup: async () => {
        shouldStop = false;
        console.log('Starting CPU overload simulation...');

        // Spawn CPU-intensive worker threads
        const numWorkers = os.cpus().length;
        for (let i = 0; i < numWorkers; i++) {
          const worker = spawn('node', ['-e', 'while(true) { Math.sqrt(Math.random()); }']);
          this.runningProcesses.set(`cpu-worker-${i}`, worker);
        }

        console.log(`Started ${numWorkers} CPU workers`);
      },
      teardown: async () => {
        shouldStop = true;
        console.log('Stopping CPU workers...');

        for (const [name, process] of this.runningProcesses) {
          if (name.startsWith('cpu-worker')) {
            process.kill('SIGTERM');
            this.runningProcesses.delete(name);
          }
        }

        console.log('CPU workers stopped');
      },
      duration: 15000,
    };
  }

  /**
   * Simulate memory pressure
   */
  async memoryPressure(): Promise<ChaosScenario> {
    const targetMemoryMb = 500;

    return {
      name: 'Memory Pressure',
      description: `Allocate ${targetMemoryMb}MB of memory`,
      setup: async () => {
        console.log(`Starting memory pressure simulation (${targetMemoryMb}MB)...`);

        // Allocate memory
        const arrays: any[] = [];
        const chunkSize = 1024 * 1024; // 1MB chunks

        for (let i = 0; i < targetMemoryMb; i++) {
          arrays.push(new Array(chunkSize / 8).fill(Math.random()));
        }

        // Store reference to prevent garbage collection
        (global as any).pressureMemory = arrays;
      },
      teardown: async () => {
        console.log('Releasing memory...');
        (global as any).pressureMemory = null;
      },
      duration: 10000,
    };
  }

  /**
   * Run a chaos scenario
   */
  async runScenario(scenario: ChaosScenario): Promise<void> {
    console.log(`\nRunning chaos scenario: ${scenario.name}`);
    console.log(`Description: ${scenario.description}`);

    try {
      await scenario.setup();
      console.log(`Scenario active for ${scenario.duration}ms...`);
      await this.sleep(scenario.duration);
    } catch (error) {
      console.error(`Scenario error: ${error}`);
    } finally {
      try {
        await scenario.teardown();
        console.log(`Scenario complete: ${scenario.name}\n`);
      } catch (error) {
        console.error(`Teardown error: ${error}`);
      }
    }
  }

  /**
   * Helper: simulate network disconnect
   */
  private async simulateNetworkDisconnect(): Promise<void> {
    // This would typically involve setting proxy rules or firewall rules
    // For now, we'll just log the intention
    console.log('Network disconnected (simulated)');
  }

  /**
   * Helper: simulate network reconnect
   */
  private async simulateNetworkReconnect(): Promise<void> {
    console.log('Network reconnected (simulated)');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup all chaos scenarios
   */
  async cleanup(): Promise<void> {
    for (const [name, process] of this.runningProcesses) {
      try {
        process.kill('SIGTERM');
        this.runningProcesses.delete(name);
      } catch (error) {
        console.error(`Failed to kill process ${name}:`, error);
      }
    }

    // Restore original environment
    process.env = this.originalEnv;

    console.log('Chaos scenario manager cleaned up');
  }
}
