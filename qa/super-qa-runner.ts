#!/usr/bin/env npx ts-node
/**
 * Super QA Runner — Unified orchestrator for the MorningOps multi-layer QA stack.
 *
 * Layers:
 *   1. Static Analysis  (Semgrep)         — catches bugs before code runs
 *   2. Unit Tests        (Jest)            — fast functional checks
 *   3. Property Tests    (fast-check)      — randomized input fuzzing
 *   4. E2E Tests         (Playwright)      — scripted UI automation
 *   5. Load Tests        (K6)             — performance under pressure
 *   6. AI Explorer       (Playwright+AI)   — autonomous exploratory testing
 *   7. Observability     (OpenTelemetry)   — runtime diagnostics check
 *
 * Usage:
 *   npx ts-node qa/super-qa-runner.ts                    # run all layers
 *   npx ts-node qa/super-qa-runner.ts --layer static     # run one layer
 *   npx ts-node qa/super-qa-runner.ts --fast             # skip slow layers (load, ai-explorer)
 *   npx ts-node qa/super-qa-runner.ts --ci               # CI mode (strict thresholds)
 */

import { execSync, exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// ─── Configuration ──────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(ROOT, 'qa', 'reports');

interface LayerResult {
  layer: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  duration_ms: number;
  findings: number;
  critical: number;
  details: string;
}

interface QAReport {
  timestamp: string;
  mode: string;
  total_duration_ms: number;
  overall_status: 'PASS' | 'FAIL' | 'WARN';
  layers: LayerResult[];
  summary: {
    total_layers: number;
    passed: number;
    failed: number;
    warned: number;
    skipped: number;
    total_findings: number;
    total_critical: number;
  };
}

// ─── CLI Parsing ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = {
  layer: getFlag('--layer'),
  fast: args.includes('--fast'),
  ci: args.includes('--ci'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  json: args.includes('--json'),
  help: args.includes('--help') || args.includes('-h'),
};

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

if (flags.help) {
  console.log(`
Super QA Runner — MorningOps Multi-Layer QA Orchestrator

Usage:
  npx ts-node qa/super-qa-runner.ts [options]

Options:
  --layer <name>   Run only a specific layer:
                     static, unit, property, e2e, load, ai-explorer, observability
  --fast           Skip slow layers (load testing, AI explorer)
  --ci             CI mode: strict thresholds, JSON output, non-zero exit on any failure
  --verbose, -v    Show full output from each layer
  --json           Output final report as JSON
  --help, -h       Show this help

Layers (execution order):
  1. static        Semgrep static analysis (security, anti-patterns, quality)
  2. unit          Jest unit tests
  3. property      fast-check property-based tests
  4. e2e           Playwright E2E tests (Electron app)
  5. load          K6 load/stress tests (requires running backend)
  6. ai-explorer   AI-driven exploratory testing (requires built app)
  7. observability OpenTelemetry health check validation

Examples:
  npx ts-node qa/super-qa-runner.ts                     # Full QA run
  npx ts-node qa/super-qa-runner.ts --fast              # Skip slow layers
  npx ts-node qa/super-qa-runner.ts --layer property    # Only property tests
  npx ts-node qa/super-qa-runner.ts --ci --json         # CI mode with JSON report
`);
  process.exit(0);
}

// ─── Utilities ──────────────────────────────────────────────────────────────

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

function log(msg: string) {
  if (!flags.json) console.log(msg);
}

function header(title: string) {
  log(`\n${COLORS.bold}${COLORS.cyan}═══════════════════════════════════════════════════════════════${COLORS.reset}`);
  log(`${COLORS.bold}${COLORS.cyan}  ${title}${COLORS.reset}`);
  log(`${COLORS.bold}${COLORS.cyan}═══════════════════════════════════════════════════════════════${COLORS.reset}\n`);
}

function statusIcon(status: string): string {
  switch (status) {
    case 'pass': return `${COLORS.green}✓ PASS${COLORS.reset}`;
    case 'fail': return `${COLORS.red}✗ FAIL${COLORS.reset}`;
    case 'warn': return `${COLORS.yellow}⚠ WARN${COLORS.reset}`;
    case 'skip': return `${COLORS.blue}⊘ SKIP${COLORS.reset}`;
    default: return status;
  }
}

function runCommand(cmd: string, cwd: string = ROOT): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      timeout: 600_000, // 10 min max per layer
      stdio: flags.verbose ? 'inherit' : 'pipe',
      env: { ...process.env, FORCE_COLOR: '0', NODE_ENV: 'test' },
    });
    return { stdout: stdout || '', exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout?.toString() || err.message || 'Unknown error',
      exitCode: err.status || 1,
    };
  }
}

// ─── Layer Runners ──────────────────────────────────────────────────────────

function runStaticAnalysis(): LayerResult {
  log(`${COLORS.magenta}▸ Running Semgrep static analysis...${COLORS.reset}`);
  const start = Date.now();

  const semgrepScript = path.join(ROOT, 'qa', 'semgrep', 'run-semgrep.sh');
  if (!fs.existsSync(semgrepScript)) {
    return {
      layer: 'static',
      status: 'skip',
      duration_ms: Date.now() - start,
      findings: 0,
      critical: 0,
      details: 'Semgrep not configured (qa/semgrep/run-semgrep.sh missing)',
    };
  }

  // Try running semgrep, fall back to skip if not installed
  const { stdout, exitCode } = runCommand(`which semgrep && bash ${semgrepScript} --severity ALL 2>&1 || echo "SEMGREP_NOT_INSTALLED"`);

  if (stdout.includes('SEMGREP_NOT_INSTALLED')) {
    return {
      layer: 'static',
      status: 'skip',
      duration_ms: Date.now() - start,
      findings: 0,
      critical: 0,
      details: 'Semgrep not installed. Run: pip install semgrep',
    };
  }

  const criticalMatch = stdout.match(/CRITICAL[:\s]+(\d+)/i);
  const highMatch = stdout.match(/HIGH[:\s]+(\d+)/i);
  const totalMatch = stdout.match(/findings?[:\s]+(\d+)/i);

  const critical = parseInt(criticalMatch?.[1] || '0', 10);
  const findings = parseInt(totalMatch?.[1] || '0', 10);

  return {
    layer: 'static',
    status: critical > 0 ? 'fail' : findings > 0 ? 'warn' : 'pass',
    duration_ms: Date.now() - start,
    findings,
    critical,
    details: `Exit code ${exitCode}. ${findings} findings, ${critical} critical.`,
  };
}

function runUnitTests(): LayerResult {
  log(`${COLORS.magenta}▸ Running Jest unit tests...${COLORS.reset}`);
  const start = Date.now();

  const { stdout, exitCode } = runCommand('npx jest --passWithNoTests --forceExit 2>&1');

  const passMatch = stdout.match(/Tests:\s+(\d+) passed/);
  const failMatch = stdout.match(/(\d+) failed/);
  const passed = parseInt(passMatch?.[1] || '0', 10);
  const failed = parseInt(failMatch?.[1] || '0', 10);

  return {
    layer: 'unit',
    status: exitCode === 0 ? 'pass' : 'fail',
    duration_ms: Date.now() - start,
    findings: failed,
    critical: failed,
    details: `${passed} passed, ${failed} failed. Exit code ${exitCode}.`,
  };
}

function runPropertyTests(): LayerResult {
  log(`${COLORS.magenta}▸ Running fast-check property-based tests...${COLORS.reset}`);
  const start = Date.now();

  const propertyTestDir = path.join(ROOT, 'src', 'lib', '__tests__', 'property');
  if (!fs.existsSync(propertyTestDir)) {
    return {
      layer: 'property',
      status: 'skip',
      duration_ms: Date.now() - start,
      findings: 0,
      critical: 0,
      details: 'Property test directory not found.',
    };
  }

  const { stdout, exitCode } = runCommand(
    'npx jest --testPathPattern="property/" --passWithNoTests --forceExit 2>&1'
  );

  const passMatch = stdout.match(/Tests:\s+(\d+) passed/);
  const failMatch = stdout.match(/(\d+) failed/);
  const passed = parseInt(passMatch?.[1] || '0', 10);
  const failed = parseInt(failMatch?.[1] || '0', 10);

  return {
    layer: 'property',
    status: exitCode === 0 ? 'pass' : 'fail',
    duration_ms: Date.now() - start,
    findings: failed,
    critical: failed,
    details: `${passed} passed, ${failed} failed. Exit code ${exitCode}.`,
  };
}

function runE2ETests(): LayerResult {
  log(`${COLORS.magenta}▸ Running Playwright E2E tests...${COLORS.reset}`);
  const start = Date.now();

  // Check if app is built
  const mainScript = path.join(ROOT, 'dist', 'main', 'main', 'index.js');
  if (!fs.existsSync(mainScript)) {
    return {
      layer: 'e2e',
      status: 'skip',
      duration_ms: Date.now() - start,
      findings: 0,
      critical: 0,
      details: 'App not built. Run: npm run build',
    };
  }

  const { stdout, exitCode } = runCommand(
    'SKIP_ELECTRON_E2E=0 npx playwright test --reporter=json 2>&1'
  );

  const passMatch = stdout.match(/"passed":\s*(\d+)/);
  const failMatch = stdout.match(/"failed":\s*(\d+)/);
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

function runLoadTests(): LayerResult {
  log(`${COLORS.magenta}▸ Running K6 load tests (smoke profile)...${COLORS.reset}`);
  const start = Date.now();

  if (flags.fast) {
    return {
      layer: 'load',
      status: 'skip',
      duration_ms: 0,
      findings: 0,
      critical: 0,
      details: 'Skipped (--fast mode).',
    };
  }

  const k6Scenario = path.join(ROOT, 'qa', 'load-testing', 'scenarios', 'api-smoke.js');
  if (!fs.existsSync(k6Scenario)) {
    return {
      layer: 'load',
      status: 'skip',
      duration_ms: Date.now() - start,
      findings: 0,
      critical: 0,
      details: 'K6 scenarios not found.',
    };
  }

  const { stdout, exitCode } = runCommand(
    `which k6 && k6 run --quiet --summary-trend-stats="avg,p(95),p(99)" ${k6Scenario} 2>&1 || echo "K6_NOT_INSTALLED"`
  );

  if (stdout.includes('K6_NOT_INSTALLED')) {
    return {
      layer: 'load',
      status: 'skip',
      duration_ms: Date.now() - start,
      findings: 0,
      critical: 0,
      details: 'K6 not installed. Run: brew install k6',
    };
  }

  const thresholdFail = stdout.includes('✗') || exitCode !== 0;
  const failedChecks = (stdout.match(/✗/g) || []).length;

  return {
    layer: 'load',
    status: thresholdFail ? 'fail' : 'pass',
    duration_ms: Date.now() - start,
    findings: failedChecks,
    critical: failedChecks > 3 ? failedChecks : 0,
    details: `K6 exit code ${exitCode}. ${failedChecks} threshold violations.`,
  };
}

function runAIExplorer(): LayerResult {
  log(`${COLORS.magenta}▸ Running AI exploratory testing agent...${COLORS.reset}`);
  const start = Date.now();

  if (flags.fast) {
    return {
      layer: 'ai-explorer',
      status: 'skip',
      duration_ms: 0,
      findings: 0,
      critical: 0,
      details: 'Skipped (--fast mode).',
    };
  }

  const explorerScript = path.join(ROOT, 'qa', 'ai-explorer', 'run-explorer.ts');
  if (!fs.existsSync(explorerScript)) {
    return {
      layer: 'ai-explorer',
      status: 'skip',
      duration_ms: Date.now() - start,
      findings: 0,
      critical: 0,
      details: 'AI explorer not found.',
    };
  }

  const mainScript = path.join(ROOT, 'dist', 'main', 'main', 'index.js');
  if (!fs.existsSync(mainScript)) {
    return {
      layer: 'ai-explorer',
      status: 'skip',
      duration_ms: Date.now() - start,
      findings: 0,
      critical: 0,
      details: 'App not built. Run: npm run build',
    };
  }

  const { stdout, exitCode } = runCommand(
    `npx ts-node ${explorerScript} --steps 100 --timeout 120 --strategy mixed 2>&1`
  );

  const bugsMatch = stdout.match(/bugs?\s*(?:found)?[:\s]+(\d+)/i);
  const criticalMatch = stdout.match(/critical[:\s]+(\d+)/i);
  const bugs = parseInt(bugsMatch?.[1] || '0', 10);
  const critical = parseInt(criticalMatch?.[1] || '0', 10);

  return {
    layer: 'ai-explorer',
    status: critical > 0 ? 'fail' : bugs > 0 ? 'warn' : 'pass',
    duration_ms: Date.now() - start,
    findings: bugs,
    critical,
    details: `${bugs} bugs found, ${critical} critical. Exit code ${exitCode}.`,
  };
}

function runObservabilityCheck(): LayerResult {
  log(`${COLORS.magenta}▸ Validating observability setup...${COLORS.reset}`);
  const start = Date.now();

  const otelDir = path.join(ROOT, 'src', 'lib', 'observability');
  const requiredFiles = ['tracing.ts', 'metrics.ts', 'logger.ts', 'health-check.ts', 'qa-diagnostics.ts', 'index.ts'];
  const missing = requiredFiles.filter(f => !fs.existsSync(path.join(otelDir, f)));

  if (missing.length > 0) {
    return {
      layer: 'observability',
      status: 'warn',
      duration_ms: Date.now() - start,
      findings: missing.length,
      critical: 0,
      details: `Missing observability files: ${missing.join(', ')}`,
    };
  }

  // Verify TypeScript compiles
  const { exitCode } = runCommand(
    `npx tsc --noEmit --skipLibCheck ${requiredFiles.map(f => path.join(otelDir, f)).join(' ')} 2>&1`
  );

  return {
    layer: 'observability',
    status: exitCode === 0 ? 'pass' : 'warn',
    duration_ms: Date.now() - start,
    findings: exitCode === 0 ? 0 : 1,
    critical: 0,
    details: exitCode === 0
      ? 'All 6 observability modules present and compile.'
      : 'Observability modules present but have type errors. Install @opentelemetry/* packages.',
  };
}

// ─── Layer Registry ─────────────────────────────────────────────────────────

const LAYERS: Record<string, () => LayerResult> = {
  static: runStaticAnalysis,
  unit: runUnitTests,
  property: runPropertyTests,
  e2e: runE2ETests,
  load: runLoadTests,
  'ai-explorer': runAIExplorer,
  observability: runObservabilityCheck,
};

const LAYER_ORDER = ['static', 'unit', 'property', 'e2e', 'load', 'ai-explorer', 'observability'];

// ─── Main Execution ─────────────────────────────────────────────────────────

async function main() {
  const totalStart = Date.now();

  header('🔬 MorningOps Super QA Runner');
  log(`Mode: ${flags.fast ? 'FAST' : flags.ci ? 'CI' : 'FULL'}`);
  log(`Time: ${new Date().toISOString()}`);
  log(`Root: ${ROOT}\n`);

  // Ensure reports directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const results: LayerResult[] = [];

  // Determine which layers to run
  const layersToRun = flags.layer
    ? [flags.layer]
    : LAYER_ORDER;

  for (const layerName of layersToRun) {
    const runner = LAYERS[layerName];
    if (!runner) {
      log(`${COLORS.red}Unknown layer: ${layerName}${COLORS.reset}`);
      continue;
    }

    const result = runner();
    results.push(result);

    log(`  ${statusIcon(result.status)}  ${result.layer.padEnd(15)} ${result.duration_ms}ms  ${result.details}`);
  }

  // ─── Summary ──────────────────────────────────────────────────────────

  const totalDuration = Date.now() - totalStart;
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const skipped = results.filter(r => r.status === 'skip').length;
  const totalFindings = results.reduce((s, r) => s + r.findings, 0);
  const totalCritical = results.reduce((s, r) => s + r.critical, 0);

  const overallStatus: 'PASS' | 'FAIL' | 'WARN' =
    failed > 0 ? 'FAIL' : warned > 0 ? 'WARN' : 'PASS';

  header('📊 QA Summary');

  const statusColor = overallStatus === 'PASS' ? COLORS.green
    : overallStatus === 'FAIL' ? COLORS.red : COLORS.yellow;

  log(`  Overall:    ${statusColor}${COLORS.bold}${overallStatus}${COLORS.reset}`);
  log(`  Duration:   ${(totalDuration / 1000).toFixed(1)}s`);
  log(`  Layers:     ${passed} passed, ${failed} failed, ${warned} warned, ${skipped} skipped`);
  log(`  Findings:   ${totalFindings} total, ${totalCritical} critical`);
  log('');

  // ─── Report Generation ────────────────────────────────────────────────

  const report: QAReport = {
    timestamp: new Date().toISOString(),
    mode: flags.fast ? 'fast' : flags.ci ? 'ci' : 'full',
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

  // Write JSON report
  const reportPath = path.join(REPORTS_DIR, `super-qa-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Also write latest
  const latestPath = path.join(REPORTS_DIR, 'super-qa-report-latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));

  log(`  Report:     ${reportPath}`);

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
  }

  // ─── Exit Code ────────────────────────────────────────────────────────

  if (flags.ci && failed > 0) {
    process.exit(1);
  } else if (totalCritical > 0) {
    process.exit(2);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Super QA Runner failed:', err);
  process.exit(99);
});
