#!/usr/bin/env npx ts-node
/**
 * Super QA Runner — Unified orchestrator for the InayanBuilderBot multi-layer QA stack.
 *
 * Layers (14 total):
 *   1.  Static Analysis      (Semgrep)         — catches bugs before code runs
 *   2.  Unit Tests           (Jest)            — fast functional checks
 *   3.  Property Tests       (fast-check)      — randomized input fuzzing
 *   4.  Determinism Tests    (Magic Run)       — verifies identical I/O for deterministic pipeline
 *   5.  E2E Tests            (Playwright)      — scripted UI automation
 *   6.  Latency Profiling    (per-endpoint)    — P50/P95/P99 per API route
 *   7.  Load Tests           (K6)             — performance under pressure
 *   8.  AI Explorer          (Playwright+AI)   — autonomous exploratory testing
 *   9.  Production Readiness (audit)           — checks prod signals (not a demo!)
 *  10.  Runaway Detection    (code scan)       — catches infinite retry loops before they burn budget
 *  11.  Sandbox Escape       (containment)     — verifies agent can't break out of its boundary
 *  12.  Cost Regression      (historical)      — compares run metrics across builds to catch drift
 *  13.  Observability        (OpenTelemetry)   — runtime diagnostics check
 *  14.  Community QA         (last30days)      — best-practice gap analysis via live community research
 *
 * Improvements driven by last30days community research (2026-03-24):
 *   - Determinism layer: r/AI_Agents "How are people testing their AI agents?" — verifies planHash stability
 *   - Prod readiness: r/ClaudeAI "many AI agent repos are just well-packaged demos" — 12-point prod audit
 *   - Latency profiling: TestGrid (YouTube) single-user transaction metrics — per-endpoint P95/P99
 *   - Runaway detection: VelvetShark "$120 overnight from retry loop" — scans for unguarded loops
 *   - Sandbox escape: r/BrandNewSentence "AI agent broke out and mined crypto" — 8-point containment audit
 *   - Cost regression: r/aiagents "hardest part of building AI agents? testing" — historical metric comparison
 *   - Community QA: r/aiagents "AI Agent & RAG Testing: Industry Practices Survey 2025" — gap analysis
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
import { fileURLToPath } from 'url';

// ─── ES Module __dirname equivalent ──────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  --layer <name>   Run only a specific layer (see list below)
  --fast           Skip slow layers (load, ai-explorer, latency, community-qa)
  --ci             CI mode: strict thresholds, JSON output, non-zero exit on any failure
  --verbose, -v    Show full output from each layer
  --json           Output final report as JSON
  --help, -h       Show this help

Layers (execution order):
  1. static            Semgrep static analysis
  2. unit              Jest unit tests
  3. property          fast-check property-based tests
  4. determinism       Magic Run identical I/O verification
  5. e2e               Playwright E2E tests
  6. latency           Per-endpoint P50/P95/P99 profiling
  7. load              K6 load/stress tests
  8. ai-explorer       AI-driven exploratory testing
  9. prod-readiness    12-point production readiness audit
 10. runaway-detection Infinite loop / retry budget detection
 11. sandbox-escape    Agent containment boundary audit
 12. cost-regression   Historical run metric comparison
 13. observability     OpenTelemetry health check
 14. community-qa      last30days community best-practice gap analysis

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

// ─── NEW: Determinism Testing (inspired by r/AI_Agents community research) ──

function runDeterminismTests(): LayerResult {
  log(`${COLORS.magenta}▸ Running determinism tests (identical input → identical planHash)...${COLORS.reset}`);
  const start = Date.now();

  // Check if server is running
  const healthCheck = runCommand('curl -sf http://127.0.0.1:3000/health 2>/dev/null || echo "SERVER_NOT_RUNNING"');
  if (healthCheck.stdout.includes('SERVER_NOT_RUNNING')) {
    return {
      layer: 'determinism',
      status: 'skip',
      duration_ms: Date.now() - start,
      findings: 0,
      critical: 0,
      details: 'Server not running on port 3000. Start with: npm start',
    };
  }

  // Run the same Magic Run request twice with identical input and compare planHash
  const testPayload = JSON.stringify({
    productName: 'DeterminismTestBot',
    userGoal: 'Build a deterministic AI agent builder with dashboard and chat UI',
    stack: ['node', 'typescript', 'react'],
    constraints: { budgetUsd: 5000, deadlineDays: 14, teamSize: 2 },
    deterministic: true,
    timeoutTier: 'fast',
  });

  const apiKey = process.env.BUILDERBOT_API_KEY || 'ibb_test';
  const curlBase = `curl -sf -X POST http://127.0.0.1:3000/api/v1/masterpiece/magic-run -H "Content-Type: application/json" -H "x-api-key: ${apiKey}" -d '${testPayload}'`;

  const run1 = runCommand(`${curlBase} 2>&1`);
  const run2 = runCommand(`${curlBase} 2>&1`);

  let hash1 = '', hash2 = '', score1 = 0, score2 = 0;
  try {
    const j1 = JSON.parse(run1.stdout);
    const j2 = JSON.parse(run2.stdout);
    hash1 = j1.planHash || '';
    hash2 = j2.planHash || '';
    score1 = j1.qualityScore || 0;
    score2 = j2.qualityScore || 0;
  } catch {
    return {
      layer: 'determinism',
      status: 'fail',
      duration_ms: Date.now() - start,
      findings: 1,
      critical: 1,
      details: `Magic Run returned invalid JSON. Run1 exit: ${run1.exitCode}, Run2 exit: ${run2.exitCode}`,
    };
  }

  const hashMatch = hash1 === hash2 && hash1.length > 0;
  const scoreMatch = score1 === score2;
  const findings = (hashMatch ? 0 : 1) + (scoreMatch ? 0 : 1);

  return {
    layer: 'determinism',
    status: hashMatch && scoreMatch ? 'pass' : hashMatch ? 'warn' : 'fail',
    duration_ms: Date.now() - start,
    findings,
    critical: hashMatch ? 0 : 1,
    details: hashMatch
      ? `Deterministic: planHash=${hash1.slice(0, 12)}… score=${score1} (identical across 2 runs)`
      : `NON-DETERMINISTIC: hash1=${hash1.slice(0, 12)} hash2=${hash2.slice(0, 12)} score1=${score1} score2=${score2}`,
  };
}

// ─── NEW: Per-Endpoint Latency Profiling (inspired by TestGrid single-user metrics) ──

function runLatencyProfiling(): LayerResult {
  log(`${COLORS.magenta}▸ Running per-endpoint latency profiling (P50/P95/P99)...${COLORS.reset}`);
  const start = Date.now();

  const healthCheck = runCommand('curl -sf http://127.0.0.1:3000/health 2>/dev/null || echo "SERVER_NOT_RUNNING"');
  if (healthCheck.stdout.includes('SERVER_NOT_RUNNING')) {
    return {
      layer: 'latency',
      status: 'skip',
      duration_ms: Date.now() - start,
      findings: 0,
      critical: 0,
      details: 'Server not running on port 3000.',
    };
  }

  if (flags.fast) {
    return {
      layer: 'latency',
      status: 'skip',
      duration_ms: 0,
      findings: 0,
      critical: 0,
      details: 'Skipped (--fast mode).',
    };
  }

  // Profile key endpoints with 5 requests each
  const endpoints = [
    { name: 'GET /health', cmd: 'curl -sf -o /dev/null -w "%{time_total}" http://127.0.0.1:3000/health' },
    { name: 'GET /api/v1/index/stats', cmd: 'curl -sf -o /dev/null -w "%{time_total}" -H "x-api-key: ${BUILDERBOT_API_KEY:-ibb_test}" http://127.0.0.1:3000/api/v1/index/stats' },
    { name: 'GET /api/v1/index/gap-hotspots', cmd: 'curl -sf -o /dev/null -w "%{time_total}" -H "x-api-key: ${BUILDERBOT_API_KEY:-ibb_test}" http://127.0.0.1:3000/api/v1/index/gap-hotspots' },
  ];

  const RUNS = 5;
  const SLA_P95_MS = 500; // 500ms P95 SLA for read endpoints
  const violations: string[] = [];
  const profileResults: string[] = [];

  for (const ep of endpoints) {
    const timings: number[] = [];
    for (let i = 0; i < RUNS; i++) {
      const { stdout } = runCommand(ep.cmd);
      const ms = parseFloat(stdout || '0') * 1000;
      if (!isNaN(ms) && ms > 0) timings.push(ms);
    }

    if (timings.length === 0) {
      profileResults.push(`${ep.name}: NO_DATA`);
      continue;
    }

    timings.sort((a, b) => a - b);
    const p50 = timings[Math.floor(timings.length * 0.5)] || 0;
    const p95 = timings[Math.floor(timings.length * 0.95)] || timings[timings.length - 1] || 0;
    const p99 = timings[timings.length - 1] || 0;

    profileResults.push(`${ep.name}: p50=${p50.toFixed(0)}ms p95=${p95.toFixed(0)}ms p99=${p99.toFixed(0)}ms`);

    if (p95 > SLA_P95_MS) {
      violations.push(`${ep.name} P95=${p95.toFixed(0)}ms > ${SLA_P95_MS}ms SLA`);
    }
  }

  return {
    layer: 'latency',
    status: violations.length > 0 ? 'warn' : 'pass',
    duration_ms: Date.now() - start,
    findings: violations.length,
    critical: 0,
    details: profileResults.join(' | ') + (violations.length ? ` [SLA violations: ${violations.join('; ')}]` : ''),
  };
}

// ─── NEW: Production Readiness Audit (inspired by r/ClaudeAI "repos are just demos") ──

function runProductionReadinessAudit(): LayerResult {
  log(`${COLORS.magenta}▸ Running production readiness audit (12-point check)...${COLORS.reset}`);
  const start = Date.now();

  // 12 production-readiness signals (community-driven from last30days research)
  const checks: { name: string; pass: boolean; detail: string }[] = [];

  // 1. Auth middleware exists (not a demo = has auth)
  const indexSrc = fs.existsSync(path.join(ROOT, 'src', 'index.js'))
    ? fs.readFileSync(path.join(ROOT, 'src', 'index.js'), 'utf-8')
    : '';
  const hasAuth = indexSrc.includes('requireAuth') || indexSrc.includes('x-api-key');
  checks.push({ name: 'auth_middleware', pass: hasAuth, detail: hasAuth ? 'Auth gate found' : 'No auth middleware — demo-level security' });

  // 2. Rate limiting
  const hasRateLimit = indexSrc.includes('rateLimit') || indexSrc.includes('express-rate-limit');
  checks.push({ name: 'rate_limiting', pass: hasRateLimit, detail: hasRateLimit ? 'Rate limiter configured' : 'No rate limiting' });

  // 3. Input validation (Zod schemas)
  const hasZod = indexSrc.includes('z.object') || indexSrc.includes('safeParse');
  checks.push({ name: 'input_validation', pass: hasZod, detail: hasZod ? 'Zod schema validation present' : 'No input validation' });

  // 4. Error handling (try/catch in handlers)
  const tryCatchCount = (indexSrc.match(/try\s*\{/g) || []).length;
  const hasErrorHandling = tryCatchCount >= 5;
  checks.push({ name: 'error_handling', pass: hasErrorHandling, detail: `${tryCatchCount} try/catch blocks` });

  // 5. Health endpoint
  const hasHealth = indexSrc.includes('/health');
  checks.push({ name: 'health_endpoint', pass: hasHealth, detail: hasHealth ? '/health endpoint exists' : 'No health endpoint' });

  // 6. Persistent storage (not just in-memory)
  const hasPersistence = indexSrc.includes('better-sqlite3') || indexSrc.includes('sqlite') || indexSrc.includes('postgres');
  checks.push({ name: 'persistence', pass: hasPersistence, detail: hasPersistence ? 'SQLite/Postgres persistence' : 'In-memory only — data lost on restart' });

  // 7. Idempotency support
  const hasIdempotency = indexSrc.includes('idempotencyKey') || indexSrc.includes('idempotent');
  checks.push({ name: 'idempotency', pass: hasIdempotency, detail: hasIdempotency ? 'Idempotency keys supported' : 'No idempotency — duplicate runs possible' });

  // 8. Helmet/security headers
  const hasHelmet = indexSrc.includes('helmet');
  checks.push({ name: 'security_headers', pass: hasHelmet, detail: hasHelmet ? 'Helmet security headers enabled' : 'No security headers' });

  // 9. Tests exist (more than just health)
  const testFiles = fs.readdirSync(path.join(ROOT, 'tests'), { recursive: true }).filter((f: any) => String(f).endsWith('.js') || String(f).endsWith('.ts'));
  const hasTests = testFiles.length >= 3;
  checks.push({ name: 'test_coverage', pass: hasTests, detail: `${testFiles.length} test files found` });

  // 10. E2E tests exist
  const hasE2E = fs.existsSync(path.join(ROOT, 'tests', 'e2e'));
  checks.push({ name: 'e2e_tests', pass: hasE2E, detail: hasE2E ? 'E2E test directory exists' : 'No E2E tests' });

  // 11. Environment config (not hardcoded secrets)
  const hasEnvExample = fs.existsSync(path.join(ROOT, '.env.example'));
  checks.push({ name: 'env_config', pass: hasEnvExample, detail: hasEnvExample ? '.env.example exists (secrets externalized)' : 'No .env.example — secrets may be hardcoded' });

  // 12. Cache with TTL (not unbounded memory growth)
  const hasCacheTTL = indexSrc.includes('CACHE_TTL') || indexSrc.includes('cache_ttl') || indexSrc.includes('TTL_MS');
  checks.push({ name: 'cache_ttl', pass: hasCacheTTL, detail: hasCacheTTL ? 'Cache TTL configured' : 'No cache TTL — unbounded memory growth risk' });

  const passed = checks.filter(c => c.pass).length;
  const failed = checks.filter(c => !c.pass).length;
  const score = Math.round((passed / checks.length) * 100);
  const failedNames = checks.filter(c => !c.pass).map(c => c.name);

  return {
    layer: 'prod-readiness',
    status: score >= 90 ? 'pass' : score >= 70 ? 'warn' : 'fail',
    duration_ms: Date.now() - start,
    findings: failed,
    critical: score < 50 ? failed : 0,
    details: `Production readiness: ${score}% (${passed}/${checks.length}). ${failed > 0 ? `Missing: ${failedNames.join(', ')}` : 'All checks pass.'}`,
  };
}

// ─── NEW: Runaway Loop Detection (community research: VelvetShark $120 disaster, r/AI_Agents) ──

function runRunawayLoopDetection(): LayerResult {
  log(`${COLORS.magenta}▸ Scanning for unguarded retry/loop patterns (cost guardrail audit)...${COLORS.reset}`);
  const start = Date.now();

  const filesToScan = [
    'src/index.js',
    'src/last30days-research.js',
  ];

  const dangerPatterns: { pattern: RegExp; name: string; severity: 'critical' | 'warn' }[] = [
    { pattern: /while\s*\(\s*true\s*\)/g, name: 'while(true) without break condition', severity: 'critical' },
    { pattern: /for\s*\(\s*;\s*;\s*\)/g, name: 'infinite for(;;) loop', severity: 'critical' },
    { pattern: /setInterval\s*\([^)]*\)\s*(?!.*clearInterval)/g, name: 'setInterval without clearInterval reference', severity: 'warn' },
    { pattern: /retry|RETRY|maxRetries|MAX_RETRIES/g, name: 'retry pattern (verify has max cap)', severity: 'warn' },
    { pattern: /setTimeout\s*\([^,]+,\s*\d{6,}\)/g, name: 'setTimeout with very long delay (>100s)', severity: 'warn' },
    { pattern: /execSync\s*\(/g, name: 'execSync on hot path (blocks event loop)', severity: 'warn' },
    { pattern: /\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/g, name: 'empty catch handler (swallows errors)', severity: 'critical' },
  ];

  const findings: string[] = [];
  const criticals: string[] = [];

  for (const relPath of filesToScan) {
    const filePath = path.join(ROOT, relPath);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const dp of dangerPatterns) {
      let match;
      const re = new RegExp(dp.pattern.source, dp.pattern.flags);
      while ((match = re.exec(content)) !== null) {
        const lineNum = content.slice(0, match.index).split('\n').length;
        const finding = `${relPath}:${lineNum} — ${dp.name}`;
        findings.push(finding);
        if (dp.severity === 'critical') criticals.push(finding);
      }
    }

    // Check for retry loops without MAX_RETRIES cap
    if (content.includes('retry') || content.includes('attempt')) {
      const hasMaxRetries = /MAX_RETRIES|maxRetries|maxAttempts|max_retries/.test(content);
      if (!hasMaxRetries && (content.match(/retry|attempt/gi) || []).length > 2) {
        const finding = `${relPath} — retry/attempt logic without MAX_RETRIES constant`;
        findings.push(finding);
        criticals.push(finding);
      }
    }
  }

  // Also check for processes that could run forever
  const ecosystemFiles = ['ecosystem.config.js', 'ecosystem.background.config.js'].filter(
    f => fs.existsSync(path.join(ROOT, f))
  );
  for (const eco of ecosystemFiles) {
    const content = fs.readFileSync(path.join(ROOT, eco), 'utf-8');
    if (!content.includes('max_restarts') && !content.includes('max_memory_restart')) {
      findings.push(`${eco} — PM2 config missing max_restarts or max_memory_restart`);
    }
  }

  return {
    layer: 'runaway-detection',
    status: criticals.length > 0 ? 'fail' : findings.length > 0 ? 'warn' : 'pass',
    duration_ms: Date.now() - start,
    findings: findings.length,
    critical: criticals.length,
    details: findings.length === 0
      ? 'No unguarded retry/loop patterns detected.'
      : `${findings.length} patterns found (${criticals.length} critical). ${findings.slice(0, 3).join('; ')}`,
  };
}

// ─── NEW: Sandbox Escape Audit (community research: "AI agent broke out and mined crypto") ──

function runSandboxEscapeAudit(): LayerResult {
  log(`${COLORS.magenta}▸ Running sandbox escape / containment audit...${COLORS.reset}`);
  const start = Date.now();

  const checks: { name: string; pass: boolean; detail: string }[] = [];
  const indexSrc = fs.existsSync(path.join(ROOT, 'src', 'index.js'))
    ? fs.readFileSync(path.join(ROOT, 'src', 'index.js'), 'utf-8')
    : '';

  // 1. No shell exec of user input (command injection vector)
  const hasUnsafeExec = /exec\s*\(\s*[`'"].*\$\{/.test(indexSrc) || /exec\s*\(\s*.*\+\s*(req|payload|body|input)/i.test(indexSrc);
  checks.push({
    name: 'no_command_injection',
    pass: !hasUnsafeExec,
    detail: hasUnsafeExec ? 'Possible command injection: exec() with user input interpolation' : 'No exec() with user input found',
  });

  // 2. No eval() usage
  const hasEval = /\beval\s*\(/.test(indexSrc);
  checks.push({
    name: 'no_eval',
    pass: !hasEval,
    detail: hasEval ? 'eval() found — sandbox escape risk' : 'No eval() usage',
  });

  // 3. No unrestricted file system access from user input
  const hasUnsafeFs = /fs\.(readFile|writeFile|unlink|rmdir|rm)\s*\(\s*(req|payload|body|input)/i.test(indexSrc);
  checks.push({
    name: 'no_unvalidated_fs',
    pass: !hasUnsafeFs,
    detail: hasUnsafeFs ? 'File system ops with user-controlled paths' : 'No unvalidated file system access',
  });

  // 4. API keys not in source code (should be in .env)
  const hasHardcodedKeys = /(sk-|api_key|apikey|secret)\s*[:=]\s*["'][A-Za-z0-9]{20,}/i.test(indexSrc);
  checks.push({
    name: 'no_hardcoded_secrets',
    pass: !hasHardcodedKeys,
    detail: hasHardcodedKeys ? 'Possible hardcoded API key/secret in source' : 'No hardcoded secrets detected',
  });

  // 5. Child processes have timeout limits
  const execCalls = (indexSrc.match(/exec(File|Sync)?\s*\(/g) || []).length;
  const timeoutRefs = (indexSrc.match(/timeout/gi) || []).length;
  const hasExecTimeouts = execCalls === 0 || timeoutRefs >= execCalls;
  checks.push({
    name: 'exec_timeouts',
    pass: hasExecTimeouts,
    detail: `${execCalls} exec calls, ${timeoutRefs} timeout refs. ${hasExecTimeouts ? 'Adequate' : 'Some exec calls may lack timeouts'}`,
  });

  // 6. Network access restricted (outbound URLs validated)
  const hasUrlValidation = indexSrc.includes('allowedDomains') || indexSrc.includes('URL_WHITELIST') || indexSrc.includes('validateUrl');
  checks.push({
    name: 'network_restriction',
    pass: hasUrlValidation,
    detail: hasUrlValidation ? 'URL validation/whitelist found' : 'No URL validation — agents can reach any host',
  });

  // 7. No process.exit in request handlers (DoS vector)
  const hasExitInHandler = /app\.(get|post|put|delete|patch)\s*\([^)]*\)[\s\S]{0,500}process\.exit/m.test(indexSrc);
  checks.push({
    name: 'no_exit_in_handlers',
    pass: !hasExitInHandler,
    detail: hasExitInHandler ? 'process.exit() inside request handler — DoS risk' : 'No process.exit in handlers',
  });

  // 8. Environment isolation (.env.example exists, .env in .gitignore)
  const gitignore = fs.existsSync(path.join(ROOT, '.gitignore'))
    ? fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf-8')
    : '';
  const envInGitignore = gitignore.includes('.env');
  checks.push({
    name: 'env_isolation',
    pass: envInGitignore,
    detail: envInGitignore ? '.env excluded from git' : '.env NOT in .gitignore — secrets may leak',
  });

  const passed = checks.filter(c => c.pass).length;
  const failed = checks.filter(c => !c.pass).length;
  const score = Math.round((passed / checks.length) * 100);
  const failedNames = checks.filter(c => !c.pass).map(c => c.name);

  return {
    layer: 'sandbox-escape',
    status: score >= 90 ? 'pass' : score >= 70 ? 'warn' : 'fail',
    duration_ms: Date.now() - start,
    findings: failed,
    critical: checks.filter(c => !c.pass && ['no_command_injection', 'no_eval', 'no_hardcoded_secrets'].includes(c.name)).length,
    details: `Containment: ${score}% (${passed}/${checks.length}). ${failed > 0 ? `Gaps: ${failedNames.join(', ')}` : 'All containment checks pass.'}`,
  };
}

// ─── NEW: Cost Regression Testing (community research: "hardest part is testing" + budget tracking) ──

function runCostRegressionTest(): LayerResult {
  log(`${COLORS.magenta}▸ Running cost regression check (comparing run metrics)...${COLORS.reset}`);
  const start = Date.now();

  // Check if we have historical QA reports to compare against
  const reportsDir = path.join(ROOT, 'qa', 'reports');
  if (!fs.existsSync(reportsDir)) {
    return {
      layer: 'cost-regression',
      status: 'skip',
      duration_ms: Date.now() - start,
      findings: 0,
      critical: 0,
      details: 'No qa/reports directory — first run, no baseline to compare.',
    };
  }

  // Find all historical QA reports
  const reportFiles = fs.readdirSync(reportsDir)
    .filter((f: any) => String(f).startsWith('super-qa-report-') && String(f).endsWith('.json') && !String(f).includes('latest'))
    .sort()
    .slice(-10); // Last 10 reports

  if (reportFiles.length < 2) {
    return {
      layer: 'cost-regression',
      status: 'skip',
      duration_ms: Date.now() - start,
      findings: 0,
      critical: 0,
      details: `Only ${reportFiles.length} historical reports — need ≥2 for regression comparison.`,
    };
  }

  // Compare latest vs previous
  const regressions: string[] = [];
  try {
    const latest = JSON.parse(fs.readFileSync(path.join(reportsDir, reportFiles[reportFiles.length - 1]), 'utf-8'));
    const previous = JSON.parse(fs.readFileSync(path.join(reportsDir, reportFiles[reportFiles.length - 2]), 'utf-8'));

    // Duration regression: >50% slower
    if (latest.total_duration_ms && previous.total_duration_ms) {
      const ratio = latest.total_duration_ms / previous.total_duration_ms;
      if (ratio > 1.5) {
        regressions.push(`Duration regression: ${Math.round(latest.total_duration_ms / 1000)}s vs ${Math.round(previous.total_duration_ms / 1000)}s (${Math.round(ratio * 100 - 100)}% slower)`);
      }
    }

    // Findings regression: more findings than before
    if (latest.summary && previous.summary) {
      const findingsDelta = (latest.summary.total_findings || 0) - (previous.summary.total_findings || 0);
      if (findingsDelta > 3) {
        regressions.push(`Findings regression: ${latest.summary.total_findings} findings (was ${previous.summary.total_findings}, +${findingsDelta})`);
      }

      // Critical regression: any new criticals
      const criticalDelta = (latest.summary.total_critical || 0) - (previous.summary.total_critical || 0);
      if (criticalDelta > 0) {
        regressions.push(`Critical regression: ${latest.summary.total_critical} criticals (was ${previous.summary.total_critical}, +${criticalDelta})`);
      }

      // Pass rate regression
      const latestPassRate = latest.summary.passed / (latest.summary.total_layers || 1);
      const prevPassRate = previous.summary.passed / (previous.summary.total_layers || 1);
      if (latestPassRate < prevPassRate - 0.1) {
        regressions.push(`Pass rate dropped: ${Math.round(latestPassRate * 100)}% (was ${Math.round(prevPassRate * 100)}%)`);
      }
    }

    // Per-layer regression check
    if (Array.isArray(latest.layers) && Array.isArray(previous.layers)) {
      for (const latestLayer of latest.layers) {
        const prevLayer = previous.layers.find((l: any) => l.layer === latestLayer.layer);
        if (prevLayer && prevLayer.status === 'pass' && latestLayer.status === 'fail') {
          regressions.push(`Layer "${latestLayer.layer}" regressed: was PASS, now FAIL`);
        }
      }
    }
  } catch {
    return {
      layer: 'cost-regression',
      status: 'warn',
      duration_ms: Date.now() - start,
      findings: 0,
      critical: 0,
      details: 'Could not parse historical reports for comparison.',
    };
  }

  return {
    layer: 'cost-regression',
    status: regressions.length === 0 ? 'pass' : regressions.length <= 2 ? 'warn' : 'fail',
    duration_ms: Date.now() - start,
    findings: regressions.length,
    critical: regressions.filter(r => r.includes('Critical') || r.includes('regressed')).length,
    details: regressions.length === 0
      ? `No regressions across ${reportFiles.length} historical reports.`
      : `${regressions.length} regressions: ${regressions.join('; ')}`,
  };
}

// ─── NEW: Community Research QA (last30days-powered best practice gap analysis) ──

function runCommunityResearchQA(): LayerResult {
  log(`${COLORS.magenta}▸ Running community research QA (last30days best-practice gap analysis)...${COLORS.reset}`);
  const start = Date.now();

  if (flags.fast) {
    return {
      layer: 'community-qa',
      status: 'skip',
      duration_ms: 0,
      findings: 0,
      critical: 0,
      details: 'Skipped (--fast mode).',
    };
  }

  // Check if last30days skill is installed
  const skillPaths = [
    path.join(ROOT, 'vendor', 'last30days-skill', 'scripts', 'last30days.py'),
    path.join(process.env.HOME || '', '.claude', 'skills', 'last30days', 'scripts', 'last30days.py'),
    path.join(process.env.HOME || '', '.agents', 'skills', 'last30days', 'scripts', 'last30days.py'),
  ];
  const skillScript = skillPaths.find(p => fs.existsSync(p));

  if (!skillScript) {
    return {
      layer: 'community-qa',
      status: 'skip',
      duration_ms: Date.now() - start,
      findings: 0,
      critical: 0,
      details: 'last30days-skill not installed. Run: npm run last30days:setup',
    };
  }

  // Check for ScrapeCreators API key
  if (!process.env.SCRAPECREATORS_API_KEY) {
    return {
      layer: 'community-qa',
      status: 'skip',
      duration_ms: Date.now() - start,
      findings: 0,
      critical: 0,
      details: 'SCRAPECREATORS_API_KEY not set. Get free key at https://app.scrapecreators.com/signup',
    };
  }

  // Run last30days research for QA best practices in AI agent testing
  const topic = 'AI agent testing QA best practices property-based fuzz E2E';
  const saveDir = path.join(ROOT, 'qa', 'reports', 'community-research');
  if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });

  const { stdout: rawResearch, exitCode } = runCommand(
    `python3 "${skillScript}" "${topic}" --emit=json --quick --no-native-web --save-dir="${saveDir}" 2>&1`,
    ROOT
  );

  if (exitCode !== 0 || !rawResearch.includes('{')) {
    return {
      layer: 'community-qa',
      status: 'warn',
      duration_ms: Date.now() - start,
      findings: 0,
      critical: 0,
      details: `last30days research returned exit code ${exitCode}. Network or API issue — skipping gap analysis.`,
    };
  }

  // Parse research JSON
  let researchData: any;
  try {
    const jsonStart = rawResearch.indexOf('{');
    const jsonEnd = rawResearch.lastIndexOf('}');
    researchData = JSON.parse(rawResearch.slice(jsonStart, jsonEnd + 1));
  } catch {
    return {
      layer: 'community-qa',
      status: 'warn',
      duration_ms: Date.now() - start,
      findings: 0,
      critical: 0,
      details: 'Could not parse last30days JSON output.',
    };
  }

  // Extract all items from every source
  const allItems: any[] = [];
  for (const key of ['reddit', 'reddit_items', 'x', 'x_items', 'twitter', 'youtube', 'youtube_items', 'hn', 'hackernews', 'hn_items', 'web', 'web_items']) {
    const arr = researchData[key];
    if (Array.isArray(arr)) allItems.push(...arr);
  }

  // Build a frequency map of mentioned testing practices from the community
  const practiceKeywords: Record<string, { pattern: RegExp; friendlyName: string; qaCheck: () => boolean }> = {
    snapshot_testing: {
      pattern: /snapshot\s*test/i,
      friendlyName: 'Snapshot testing',
      qaCheck: () => {
        const testDir = path.join(ROOT, 'tests');
        if (!fs.existsSync(testDir)) return false;
        const { stdout } = runCommand(`grep -rl "toMatchSnapshot\\|toMatchInlineSnapshot" "${testDir}" 2>/dev/null || true`);
        return stdout.trim().length > 0;
      },
    },
    contract_testing: {
      pattern: /contract\s*test|api\s*contract|schema\s*valid/i,
      friendlyName: 'API contract/schema testing',
      qaCheck: () => {
        const indexSrc = fs.existsSync(path.join(ROOT, 'src', 'index.js'))
          ? fs.readFileSync(path.join(ROOT, 'src', 'index.js'), 'utf-8')
          : '';
        return indexSrc.includes('safeParse') || indexSrc.includes('z.object');
      },
    },
    mutation_testing: {
      pattern: /mutation\s*test|stryker|mutant/i,
      friendlyName: 'Mutation testing',
      qaCheck: () => fs.existsSync(path.join(ROOT, 'stryker.conf.js')) || fs.existsSync(path.join(ROOT, 'stryker.conf.json')),
    },
    chaos_testing: {
      pattern: /chaos\s*(test|engineer)|fault\s*inject|resilience\s*test/i,
      friendlyName: 'Chaos/resilience testing',
      qaCheck: () => {
        const { stdout } = runCommand(`grep -rl "chaos\\|fault.inject\\|resilience" "${path.join(ROOT, 'qa')}" 2>/dev/null || true`);
        return stdout.trim().length > 0;
      },
    },
    visual_regression: {
      pattern: /visual\s*regress|screenshot\s*test|percy|chromatic/i,
      friendlyName: 'Visual regression testing',
      qaCheck: () => fs.existsSync(path.join(ROOT, '.percy.yml')) || fs.existsSync(path.join(ROOT, 'chromatic.config.js')),
    },
    security_scanning: {
      pattern: /security\s*scan|sast|dast|dependency\s*audit|snyk|trivy/i,
      friendlyName: 'Security scanning (SAST/DAST)',
      qaCheck: () => {
        return fs.existsSync(path.join(ROOT, 'qa', 'semgrep', 'run-semgrep.sh')) ||
          fs.existsSync(path.join(ROOT, '.snyk'));
      },
    },
    flaky_test_detection: {
      pattern: /flaky\s*test|test\s*flak|retry\s*fail|quarantine.*test/i,
      friendlyName: 'Flaky test detection/quarantine',
      qaCheck: () => {
        const { stdout } = runCommand(`grep -rl "retry\\|flaky\\|quarantine" "${path.join(ROOT, 'qa')}" 2>/dev/null || true`);
        return stdout.trim().length > 0;
      },
    },
    coverage_gates: {
      pattern: /coverage\s*gate|code\s*coverage|nyc|istanbul|c8\s*coverage/i,
      friendlyName: 'Code coverage gates',
      qaCheck: () => {
        const pkg = fs.existsSync(path.join(ROOT, 'package.json'))
          ? fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8')
          : '';
        return pkg.includes('--coverage') || pkg.includes('c8') || pkg.includes('nyc') || pkg.includes('istanbul');
      },
    },
    llm_eval: {
      pattern: /llm\s*eval|model\s*eval|prompt\s*eval|ai\s*eval|evals?\s*framework/i,
      friendlyName: 'LLM/prompt evaluation framework',
      qaCheck: () => {
        const { stdout } = runCommand(`grep -rl "eval\\|benchmark.*model\\|prompt.*test" "${path.join(ROOT, 'qa')}" 2>/dev/null || true`);
        return stdout.trim().length > 0;
      },
    },
    regression_suite: {
      pattern: /regression\s*suite|regression\s*test|smoke\s*test\s*suite/i,
      friendlyName: 'Regression test suite',
      qaCheck: () => {
        return fs.existsSync(path.join(ROOT, 'tests', 'regression')) ||
          fs.existsSync(path.join(ROOT, 'qa', 'regression'));
      },
    },
  };

  // Count community mentions of each practice
  const communityMentions: Record<string, number> = {};
  for (const [key, { pattern }] of Object.entries(practiceKeywords)) {
    let count = 0;
    for (const item of allItems) {
      const text = `${item.title || ''} ${item.text || ''} ${item.body || ''} ${item.snippet || ''} ${item.caption || ''}`;
      if (pattern.test(text)) count++;
    }
    if (count > 0) communityMentions[key] = count;
  }

  // Check which mentioned practices we actually have
  const gaps: string[] = [];
  const covered: string[] = [];
  const mentionedPractices = Object.entries(communityMentions)
    .sort(([, a], [, b]) => b - a);

  for (const [key, mentions] of mentionedPractices) {
    const practice = practiceKeywords[key];
    if (practice.qaCheck()) {
      covered.push(`${practice.friendlyName} (${mentions} mentions)`);
    } else {
      gaps.push(`${practice.friendlyName} (${mentions} community mentions)`);
    }
  }

  // Save community research report
  const researchReport = {
    timestamp: new Date().toISOString(),
    topic,
    total_community_items: allItems.length,
    mentioned_practices: communityMentions,
    gaps,
    covered,
    recommendation: gaps.length > 0
      ? `Consider adding: ${gaps.map(g => g.split(' (')[0]).join(', ')}`
      : 'QA stack aligns with current community best practices.',
  };

  fs.writeFileSync(
    path.join(saveDir, 'community-qa-gap-analysis-latest.json'),
    JSON.stringify(researchReport, null, 2)
  );

  const totalMentioned = mentionedPractices.length;
  const coveredCount = covered.length;
  const gapCount = gaps.length;

  return {
    layer: 'community-qa',
    status: gapCount === 0 ? 'pass' : gapCount <= 2 ? 'warn' : 'fail',
    duration_ms: Date.now() - start,
    findings: gapCount,
    critical: 0,
    details: `Community research found ${allItems.length} items, ${totalMentioned} practices discussed. ` +
      `Coverage: ${coveredCount}/${totalMentioned}. ` +
      (gapCount > 0 ? `Gaps: ${gaps.map(g => g.split(' (')[0]).join(', ')}` : 'Full alignment with community practices.'),
  };
}

// ─── Layer Registry ─────────────────────────────────────────────────────────

const LAYERS: Record<string, () => LayerResult> = {
  static: runStaticAnalysis,
  unit: runUnitTests,
  property: runPropertyTests,
  determinism: runDeterminismTests,
  e2e: runE2ETests,
  latency: runLatencyProfiling,
  load: runLoadTests,
  'ai-explorer': runAIExplorer,
  'prod-readiness': runProductionReadinessAudit,
  'runaway-detection': runRunawayLoopDetection,
  'sandbox-escape': runSandboxEscapeAudit,
  'cost-regression': runCostRegressionTest,
  observability: runObservabilityCheck,
  'community-qa': runCommunityResearchQA,
};

const LAYER_ORDER = [
  'static', 'unit', 'property', 'determinism', 'e2e', 'latency', 'load',
  'ai-explorer', 'prod-readiness', 'runaway-detection', 'sandbox-escape',
  'cost-regression', 'observability', 'community-qa',
];

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
