#!/usr/bin/env node
/**
 * Super QA Runner — Inayan Builder Bot
 *
 * Runs QA layers for this repo: lint, unit, e2e, security, claw gates.
 * Report written to qa/reports/.
 *
 * Usage:
 *   node qa/super-qa-runner.mjs
 *   node qa/super-qa-runner.mjs --layer e2e
 *   node qa/super-qa-runner.mjs --ci --json
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(ROOT, 'qa', 'reports');

const args = process.argv.slice(2);
const flags = {
  layer: getFlag('--layer'),
  fast: args.includes('--fast'),
  ci: args.includes('--ci'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  json: args.includes('--json'),
  help: args.includes('--help') || args.includes('-h'),
};

function getFlag(name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

if (flags.help) {
  console.log(`
Super QA Runner — Inayan Builder Bot

Usage:
  node qa/super-qa-runner.mjs [options]

Options:
  --layer <name>   Run only: lint, unit, e2e, security, claw:security, claw:baseline
  --fast           Same as full for this repo (no slow layers to skip)
  --ci             CI mode: exit 1 on any failure, JSON report
  --verbose, -v    Show full output from each layer
  --json           Output final report as JSON
  --help, -h       This help
`);
  process.exit(0);
}

const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

function log(msg) {
  if (!flags.json) console.log(msg);
}

function header(title) {
  log(`\n${COLORS.bold}${COLORS.cyan}═══════════════════════════════════════════════════════════════${COLORS.reset}`);
  log(`${COLORS.bold}${COLORS.cyan}  ${title}${COLORS.reset}`);
  log(`${COLORS.bold}${COLORS.cyan}═══════════════════════════════════════════════════════════════${COLORS.reset}\n`);
}

function statusIcon(status) {
  switch (status) {
    case 'pass': return `${COLORS.green}✓ PASS${COLORS.reset}`;
    case 'fail': return `${COLORS.red}✗ FAIL${COLORS.reset}`;
    case 'warn': return `${COLORS.yellow}⚠ WARN${COLORS.reset}`;
    case 'skip': return `${COLORS.blue}⊘ SKIP${COLORS.reset}`;
    default: return status;
  }
}

function runCommand(cmd, cwd = ROOT) {
  try {
    const stdout = execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      timeout: 120_000,
      stdio: flags.verbose ? 'inherit' : 'pipe',
      env: { ...process.env, FORCE_COLOR: '0', NODE_ENV: 'test' },
    });
    return { stdout: stdout || '', exitCode: 0 };
  } catch (err) {
    return {
      stdout: err.stdout?.toString() || err.stderr?.toString() || err.message || 'Unknown error',
      exitCode: err.status ?? 1,
    };
  }
}

function runLint() {
  log(`${COLORS.magenta}▸ Running lint...${COLORS.reset}`);
  const start = Date.now();
  const { exitCode } = runCommand('npm run -s lint 2>&1');
  return {
    layer: 'lint',
    status: exitCode === 0 ? 'pass' : 'fail',
    duration_ms: Date.now() - start,
    findings: exitCode === 0 ? 0 : 1,
    critical: exitCode === 0 ? 0 : 1,
    details: `Exit code ${exitCode}.`,
  };
}

function runUnit() {
  log(`${COLORS.magenta}▸ Running unit tests (node --test)...${COLORS.reset}`);
  const start = Date.now();
  // Use per-test timeout to prevent hangs; overall layer timeout 120s
  const { stdout, exitCode } = runCommand('npm run -s test 2>&1');
  const passMatch = stdout.match(/# pass (\d+)/);
  const failMatch = stdout.match(/# fail (\d+)/);
  const passed = parseInt(passMatch?.[1] || '0', 10);
  const failed = parseInt(failMatch?.[1] || '0', 10);
  return {
    layer: 'unit',
    status: exitCode === 0 ? 'pass' : 'fail',
    duration_ms: Date.now() - start,
    findings: failed,
    critical: failed > 0 ? 1 : 0,
    details: `${passed} passed, ${failed} failed. Exit code ${exitCode}.`,
  };
}

function runE2E() {
  log(`${COLORS.magenta}▸ Running Playwright E2E...${COLORS.reset}`);
  const start = Date.now();
  const { stdout, exitCode } = runCommand('npm run -s test:e2e 2>&1');
  const passMatch = stdout.match(/"passed":\s*(\d+)/) || stdout.match(/(\d+)\s+passed/);
  const failMatch = stdout.match(/"failed":\s*(\d+)/) || stdout.match(/(\d+)\s+failed/);
  const passed = parseInt(passMatch?.[1] || '0', 10);
  const failed = parseInt(failMatch?.[1] || '0', 10);
  return {
    layer: 'e2e',
    status: exitCode === 0 ? 'pass' : failed > 0 ? 'fail' : 'warn',
    duration_ms: Date.now() - start,
    findings: failed,
    critical: failed,
    details: `${passed} passed, ${failed} failed. Exit code ${exitCode}.`,
  };
}

function runSecurity() {
  log(`${COLORS.magenta}▸ Running security check...${COLORS.reset}`);
  const start = Date.now();
  const { exitCode } = runCommand('npm run -s security:check 2>&1');
  return {
    layer: 'security',
    status: exitCode === 0 ? 'pass' : 'fail',
    duration_ms: Date.now() - start,
    findings: exitCode === 0 ? 0 : 1,
    critical: exitCode === 0 ? 0 : 1,
    details: `Exit code ${exitCode}.`,
  };
}

function runClawSecurity() {
  log(`${COLORS.magenta}▸ Running Claw security gate...${COLORS.reset}`);
  const start = Date.now();
  const { stdout, exitCode } = runCommand('npm run -s claw:security:gate 2>&1');
  const criticalMatch = stdout.match(/critical[:\s]+(\d+)/i);
  const critical = parseInt(criticalMatch?.[1] || '0', 10);
  return {
    layer: 'claw:security',
    status: exitCode === 0 && critical === 0 ? 'pass' : critical > 0 ? 'fail' : 'warn',
    duration_ms: Date.now() - start,
    findings: critical,
    critical,
    details: `Exit code ${exitCode}. ${critical} critical.`,
  };
}

function runClawBaseline() {
  log(`${COLORS.magenta}▸ Running Claw baseline gate...${COLORS.reset}`);
  const start = Date.now();
  const { exitCode } = runCommand('npm run -s claw:baseline:gate 2>&1');
  return {
    layer: 'claw:baseline',
    status: exitCode === 0 ? 'pass' : 'fail',
    duration_ms: Date.now() - start,
    findings: exitCode === 0 ? 0 : 1,
    critical: exitCode === 0 ? 0 : 1,
    details: `Exit code ${exitCode}.`,
  };
}

const LAYERS = {
  lint: runLint,
  unit: runUnit,
  e2e: runE2E,
  security: runSecurity,
  'claw:security': runClawSecurity,
  'claw:baseline': runClawBaseline,
};

const LAYER_ORDER = ['lint', 'unit', 'e2e', 'security', 'claw:security', 'claw:baseline'];

async function main() {
  const totalStart = Date.now();

  header('🔬 Inayan Builder Bot — Super QA Runner');
  log(`Mode: ${flags.fast ? 'FAST' : flags.ci ? 'CI' : 'FULL'}`);
  log(`Time: ${new Date().toISOString()}`);
  log(`Root: ${ROOT}\n`);

  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const layersToRun = flags.layer ? [flags.layer] : LAYER_ORDER;
  const results = [];

  for (const name of layersToRun) {
    const runner = LAYERS[name];
    if (!runner) {
      log(`${COLORS.red}Unknown layer: ${name}${COLORS.reset}`);
      continue;
    }
    const result = runner();
    results.push(result);
    log(`  ${statusIcon(result.status)}  ${result.layer.padEnd(15)} ${result.duration_ms}ms  ${result.details}`);
  }

  const totalDuration = Date.now() - totalStart;
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const warned = results.filter((r) => r.status === 'warn').length;
  const skipped = results.filter((r) => r.status === 'skip').length;
  const totalFindings = results.reduce((s, r) => s + r.findings, 0);
  const totalCritical = results.reduce((s, r) => s + r.critical, 0);

  const overallStatus = failed > 0 ? 'FAIL' : warned > 0 ? 'WARN' : 'PASS';

  header('📊 QA Summary');
  const statusColor = overallStatus === 'PASS' ? COLORS.green : overallStatus === 'FAIL' ? COLORS.red : COLORS.yellow;
  log(`  Overall:    ${statusColor}${COLORS.bold}${overallStatus}${COLORS.reset}`);
  log(`  Duration:   ${(totalDuration / 1000).toFixed(1)}s`);
  log(`  Layers:     ${passed} passed, ${failed} failed, ${warned} warned, ${skipped} skipped`);
  log(`  Findings:   ${totalFindings} total, ${totalCritical} critical`);
  log('');

  const report = {
    timestamp: new Date().toISOString(),
    mode: flags.fast ? 'fast' : flags.ci ? 'ci' : 'full',
    repo: 'InayanBuilderBot',
    total_duration_ms: totalDuration,
    overall_status: overallStatus,
    layers: results,
    summary: {
      total_layers: results.length,
      passed,
      failed,
      warned,
      skipped,
      total_findings: totalFindings,
      total_critical: totalCritical,
    },
  };

  const reportPath = path.join(REPORTS_DIR, `super-qa-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const latestPath = path.join(REPORTS_DIR, 'super-qa-report-latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));
  log(`  Report:     ${reportPath}`);

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
  }

  if (flags.ci && failed > 0) process.exit(1);
  if (totalCritical > 0) process.exit(2);
  process.exit(0);
}

main().catch((err) => {
  console.error('Super QA Runner failed:', err);
  process.exit(99);
});
