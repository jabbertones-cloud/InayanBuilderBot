#!/usr/bin/env node

/**
 * CLI entry point for exploratory testing agent
 * Usage: npx ts-node qa/ai-explorer/run-explorer.ts --steps 500 --timeout 300
 */

import { program } from 'commander';
import path from 'path';
import { promises as fs } from 'fs';
import { ExplorerAgent, ExplorationConfig } from './explorer-agent';

const DEFAULT_CONFIG: Partial<ExplorationConfig> = {
  maxSteps: 200,
  timeout: 30000,
  strategy: 'mixed',
  enableChaos: false,
  outputDir: './qa-reports',
  appPath: path.resolve(__dirname, '../..'),
};

async function main() {
  program
    .name('explorer-agent')
    .description('AI-driven exploratory testing agent for MorningOps Desktop')
    .option('--steps <number>', 'Maximum exploration steps', '200')
    .option('--timeout <number>', 'Timeout in seconds', '30')
    .option('--strategy <type>', 'Exploration strategy (random, grammar, boundary, chaos, mixed)', 'mixed')
    .option('--focus <areas>', 'Focus areas (comma-separated)', '')
    .option('--chaos', 'Enable chaos testing scenarios')
    .option('--output <dir>', 'Output directory for reports', './qa-reports')
    .option('--app <path>', 'Path to MorningOps Desktop app root', path.resolve(__dirname, '../..'))
    .option('--dry-run', 'Preview configuration without running')
    .parse(process.argv);

  const opts = program.opts();

  const config: ExplorationConfig = {
    maxSteps: parseInt(opts.steps),
    timeout: parseInt(opts.timeout) * 1000,
    strategy: opts.strategy,
    focusAreas: opts.focus ? opts.focus.split(',').map((s: string) => s.trim()) : undefined,
    enableChaos: opts.chaos || false,
    outputDir: opts.output,
    appPath: opts.app,
  };

  // Validate configuration
  if (config.maxSteps < 1) {
    console.error('Error: --steps must be at least 1');
    process.exit(1);
  }

  if (!['random', 'grammar', 'boundary', 'chaos', 'mixed'].includes(config.strategy)) {
    console.error(
      `Error: Invalid strategy "${config.strategy}". Must be one of: random, grammar, boundary, chaos, mixed`
    );
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('MorningOps Desktop - AI Exploratory Testing Agent');
  console.log('='.repeat(60));
  console.log('\nConfiguration:');
  console.log(`  Max Steps:        ${config.maxSteps}`);
  console.log(`  Timeout:          ${config.timeout / 1000}s`);
  console.log(`  Strategy:         ${config.strategy}`);
  if (config.focusAreas && config.focusAreas.length > 0) {
    console.log(`  Focus Areas:      ${config.focusAreas.join(', ')}`);
  }
  console.log(`  Chaos Testing:    ${config.enableChaos ? 'Enabled' : 'Disabled'}`);
  console.log(`  Output Directory: ${config.outputDir}`);
  console.log(`  App Path:         ${config.appPath}`);
  console.log('');

  if (opts.dryRun) {
    console.log('Dry-run mode: Configuration validated successfully');
    console.log('To run exploration, remove --dry-run flag');
    process.exit(0);
  }

  // Create output directory
  try {
    await fs.mkdir(config.outputDir, { recursive: true });
  } catch (error) {
    console.error(`Failed to create output directory: ${error}`);
    process.exit(1);
  }

  // Run exploration
  const agent = new ExplorerAgent(config);

  try {
    const startTime = Date.now();
    console.log('Starting exploration...\n');

    const report = await agent.run();

    const duration = (Date.now() - startTime) / 1000;

    console.log('\n' + '='.repeat(60));
    console.log('Exploration Results');
    console.log('='.repeat(60));
    console.log(`Duration:           ${duration.toFixed(1)}s`);
    console.log(`Total Steps:        ${report.totalSteps}`);
    console.log(`Bugs Found:         ${report.bugsFound}`);
    console.log(`Coverage:           ${report.coverage.coveragePercent.toFixed(1)}%`);
    console.log(`Explored States:    ${report.coverage.exploredStates}`);
    console.log(`Explored Flows:     ${Array.from(report.coverage.exploredFlows.keys()).join(', ')}`);

    if (report.coverage.unexploredAreas.length > 0) {
      console.log(`Unexplored Areas:   ${report.coverage.unexploredAreas.join(', ')}`);
    }

    console.log('\nAnomalies Found:');
    for (const [type, count] of Object.entries(report.anomalySummary)) {
      console.log(`  ${type}: ${count}`);
    }

    if (report.bugsFound > 0) {
      console.log('\nBug Reports:');
      for (const bug of report.bugReports) {
        console.log(`  [${bug.severity.toUpperCase()}] ${bug.title}`);
      }
    }

    console.log(`\nReports written to: ${config.outputDir}`);
    console.log('='.repeat(60));

    // Exit with appropriate code
    const criticalBugs = report.bugReports.filter((b) => b.severity === 'critical').length;
    const highBugs = report.bugReports.filter((b) => b.severity === 'high').length;

    if (criticalBugs > 0) {
      console.log(`\nFound ${criticalBugs} critical bug(s) - Exiting with code 2`);
      process.exit(2);
    } else if (highBugs > 0) {
      console.log(`\nFound ${highBugs} high-severity bug(s) - Exiting with code 1`);
      process.exit(1);
    } else {
      console.log('\nNo critical or high-severity bugs found - Exiting with code 0');
      process.exit(0);
    }
  } catch (error) {
    console.error('\nExploration failed:');
    console.error(error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
