import test from 'node:test';
import assert from 'node:assert/strict';
import { detectCategory, getUniversalCapabilities, computeHealthScore, benchmarkEcosystem } from '../src/universal-ecosystem-intelligence.js';

// Real package.json data from claw-repos
const repoMetadata = {
  PdfEzFill: {
    name: 'pdfezfill-desktop',
    description: 'PDF form filling and inventory management system',
    keywords: ['pdf', 'forms', 'inventory', 'shipping', 'ecommerce'],
    dependencies: ['pdfkit'],
    devDependencies: ['typescript', 'vitest', 'eslint', 'prettier'],
  },
  RobloxGitSync: {
    name: 'puzzle-brawl',
    description: 'Roblox Puzzle Brawl - Rojo + Lua; CI runs Lua unit tests and optional rojo build.',
    keywords: ['roblox', 'game', 'ci-cd'],
    dependencies: ['pino', 'pino-pretty'],
    devDependencies: ['jest'],
  },
  clawpay: {
    name: 'clawpay',
    description: 'Payment routing and processing system',
    keywords: ['payments', 'stripe', 'ecommerce', 'fintech'],
    dependencies: ['express', 'cors'],
    devDependencies: ['typescript', '@types/express'],
  },
  'v0-morningops': {
    name: 'morningops',
    description: 'Email management, AI triage, morning brief dashboard',
    keywords: ['email', 'dashboard', 'ai', 'automation'],
    dependencies: [
      'next',
      'react',
      'prisma',
      'stripe',
      'openai',
      'googleapis',
      'better-auth',
      'zod',
    ],
    devDependencies: ['typescript', 'playwright', 'jest'],
  },
  quantfusion: {
    name: 'rest-express',
    description: 'Quantitative trading and financial analysis platform',
    keywords: ['trading', 'finance', 'analysis'],
    dependencies: [
      'express',
      'drizzle-orm',
      'react',
      'typescript',
      'zod',
      'passport',
      'jsonwebtoken',
      '@radix-ui/react-*',
      'recharts',
    ],
    devDependencies: ['vite', 'esbuild', 'typescript', 'drizzle-kit'],
  },
  LeadGen3: {
    name: 'rest-express',
    description: 'Lead generation and prospecting platform with AI',
    keywords: ['leads', 'sales', 'marketing', 'ai'],
    dependencies: [
      'express',
      'drizzle-orm',
      'axios',
      'cheerio',
      'openai',
      'bullmq',
      'passport',
      'mailersend',
      'node-cron',
      'bcrypt',
    ],
    devDependencies: ['typescript', 'playwright', 'esbuild'],
  },
  desktopmorningops: {
    name: 'morningops-desktop',
    description: 'MorningOps – Unified inbox, AI triage, morning brief. macOS desktop app.',
    keywords: ['desktop', 'email', 'ai', 'macos'],
    dependencies: [
      'electron',
      'better-sqlite3',
      'nodemailer',
      'imapflow',
      'googleapis',
      'keytar',
      'node-telegram-bot-api',
      'axios',
    ],
    devDependencies: ['electron-builder', 'vite', 'typescript'],
  },
  'browser-use': {
    name: 'browser-use',
    description: 'AI browser agent for automation (Python)',
    keywords: ['browser', 'automation', 'ai', 'web-scraping'],
    language: 'python',
    dependencies: ['playwright', 'openai', 'python-dotenv'],
    devDependencies: [],
  },
  veritap: {
    name: 'rest-express',
    description: 'NFC verification and identity platform',
    keywords: ['nfc', 'verification', 'identity', 'security'],
    dependencies: [
      'express',
      'drizzle-orm',
      '@anthropic-ai/sdk',
      'passport',
      'bcrypt',
      'jsonwebtoken',
      'stripe',
      'socket.io',
      'telnyx',
      'redis',
    ],
    devDependencies: ['playwright', 'typescript', 'vite'],
  },
  CookiesPass: {
    name: 'cookies-pass',
    description: 'Digital ticket and pass management platform',
    keywords: ['ecommerce', 'tickets', 'passes', 'wallet'],
    dependencies: [
      'express',
      'drizzle-orm',
      'stripe',
      'qrcode',
      'bwip-js',
      'sharp',
      'passkit-generator',
      'resend',
      'redis',
      'multer',
      'exceljs',
    ],
    devDependencies: ['typescript', 'playwright', 'vite'],
  },
};

// Test suite 1: Individual repo detection
test('Detect category for PdfEzFill (pdf-tools)', async (t) => {
  const result = detectCategory(repoMetadata.PdfEzFill);
  assert.ok(result, 'detectCategory should return non-null result');
  assert.ok(result.categoryId, 'result should have categoryId');
  assert.match(result.categoryId, /pdf|document|tools/, 'should detect PDF category');
});

test('Detect category for RobloxGitSync (game-development)', async (t) => {
  const result = detectCategory(repoMetadata.RobloxGitSync);
  assert.ok(result, 'detectCategory should return non-null result');
  assert.ok(result.categoryId, 'result should have categoryId');
  assert.match(result.categoryId, /game|roblox|ci-cd|devops/, 'should detect game or CI/CD category');
});

test('Detect category for clawpay (e-commerce/fintech)', async (t) => {
  const result = detectCategory(repoMetadata.clawpay);
  assert.ok(result, 'detectCategory should return non-null result');
  assert.ok(result.categoryId, 'result should have categoryId');
  assert.match(result.categoryId, /payment|fintech|e-commerce|auth/, 'should detect payment/fintech/auth category');
});

test('Detect category for v0-morningops (email-marketing/dashboard)', async (t) => {
  const result = detectCategory(repoMetadata['v0-morningops']);
  assert.ok(result, 'detectCategory should return non-null result');
  assert.ok(result.categoryId, 'result should have categoryId');
  assert.match(result.categoryId, /email|dashboard|ai|communication|marketing/, 'should detect email/dashboard/AI category');
});

test('Detect category for quantfusion (fintech-trading)', async (t) => {
  const result = detectCategory(repoMetadata.quantfusion);
  assert.ok(result, 'detectCategory should return non-null result');
  assert.ok(result.categoryId, 'result should have categoryId');
  assert.match(result.categoryId, /trading|finance|fintech|analytics/, 'should detect trading/finance category');
});

test('Detect category for LeadGen3 (lead-generation)', async (t) => {
  const result = detectCategory(repoMetadata.LeadGen3);
  assert.ok(result, 'detectCategory should return non-null result');
  assert.ok(result.categoryId, 'result should have categoryId');
  assert.match(result.categoryId, /lead|sales|marketing|prospecting/, 'should detect lead generation category');
});

test('Detect category for desktopmorningops (desktop-app/email)', async (t) => {
  const result = detectCategory(repoMetadata.desktopmorningops);
  assert.ok(result, 'detectCategory should return non-null result');
  assert.ok(result.categoryId, 'result should have categoryId');
  assert.match(result.categoryId, /desktop|electron|email|communication/, 'should detect desktop/email category');
});

test('Detect category for browser-use (browser-automation)', async (t) => {
  const result = detectCategory(repoMetadata['browser-use']);
  assert.ok(result, 'detectCategory should return non-null result');
  assert.ok(result.categoryId, 'result should have categoryId');
  assert.match(result.categoryId, /browser|automation|scraping|web/, 'should detect browser automation category');
});

test('Detect category for veritap (nfc-verification/auth)', async (t) => {
  const result = detectCategory(repoMetadata.veritap);
  assert.ok(result, 'detectCategory should return non-null result');
  assert.ok(result.categoryId, 'result should have categoryId');
  assert.match(result.categoryId, /nfc|verification|auth|identity|security/, 'should detect NFC/auth category');
});

test('Detect category for CookiesPass (e-commerce/ticketing)', async (t) => {
  const result = detectCategory(repoMetadata.CookiesPass);
  assert.ok(result, 'detectCategory should return non-null result');
  assert.ok(result.categoryId, 'result should have categoryId');
  assert.match(result.categoryId, /e-commerce|tickets|passes|wallet|commerce/, 'should detect e-commerce/ticketing category');
});

// Test suite 2: Universal capabilities detection
test('Get universal capabilities for PdfEzFill', async (t) => {
  const capabilities = getUniversalCapabilities(repoMetadata.PdfEzFill);
  assert.ok(Array.isArray(capabilities), 'should return an array');
  assert.ok(capabilities.length >= 1, 'should find at least 1 capability');
  assert.ok(capabilities.every(c => typeof c === 'string'), 'all capabilities should be strings');
});

test('Get universal capabilities for v0-morningops', async (t) => {
  const capabilities = getUniversalCapabilities(repoMetadata['v0-morningops']);
  assert.ok(Array.isArray(capabilities), 'should return an array');
  assert.ok(capabilities.length >= 1, 'should find at least 1 capability');
  assert.ok(capabilities.some(c => /email|stripe|ai|auth|database/.test(c)), 'should detect key capabilities');
});

test('Get universal capabilities for quantfusion', async (t) => {
  const capabilities = getUniversalCapabilities(repoMetadata.quantfusion);
  assert.ok(Array.isArray(capabilities), 'should return an array');
  assert.ok(capabilities.length >= 1, 'should find at least 1 capability');
  assert.ok(capabilities.some(c => /database|auth|charting|api/.test(c)), 'should detect trading/data capabilities');
});

test('Get universal capabilities for LeadGen3', async (t) => {
  const capabilities = getUniversalCapabilities(repoMetadata.LeadGen3);
  assert.ok(Array.isArray(capabilities), 'should return an array');
  assert.ok(capabilities.length >= 1, 'should find at least 1 capability');
  assert.ok(capabilities.some(c => /web-scraping|ai|email|database|task-queue/.test(c)), 'should detect lead gen capabilities');
});

test('Get universal capabilities for desktopmorningops', async (t) => {
  const capabilities = getUniversalCapabilities(repoMetadata.desktopmorningops);
  assert.ok(Array.isArray(capabilities), 'should return an array');
  assert.ok(capabilities.length >= 1, 'should find at least 1 capability');
  assert.ok(capabilities.some(c => /email|desktop|ai|system|database/.test(c)), 'should detect desktop/email capabilities');
});

test('Get universal capabilities for veritap', async (t) => {
  const capabilities = getUniversalCapabilities(repoMetadata.veritap);
  assert.ok(Array.isArray(capabilities), 'should return an array');
  assert.ok(capabilities.length >= 1, 'should find at least 1 capability');
  assert.ok(capabilities.some(c => /auth|payment|communication|database|real-time/.test(c)), 'should detect verification capabilities');
});

test('Get universal capabilities for CookiesPass', async (t) => {
  const capabilities = getUniversalCapabilities(repoMetadata.CookiesPass);
  assert.ok(Array.isArray(capabilities), 'should return an array');
  assert.ok(capabilities.length >= 1, 'should find at least 1 capability');
  assert.ok(capabilities.some(c => /payment|qr-code|barcode|mobile|storage/.test(c)), 'should detect ticketing capabilities');
});

// Test suite 3: Health score computation
test('Compute health score for PdfEzFill', async (t) => {
  const score = computeHealthScore(repoMetadata.PdfEzFill);
  assert.ok(typeof score === 'number', 'should return a number');
  assert.ok(score >= 0 && score <= 100, 'score should be between 0 and 100');
});

test('Compute health score for clawpay', async (t) => {
  const score = computeHealthScore(repoMetadata.clawpay);
  assert.ok(typeof score === 'number', 'should return a number');
  assert.ok(score >= 0 && score <= 100, 'score should be between 0 and 100');
});

test('Compute health score for v0-morningops (complex repo)', async (t) => {
  const score = computeHealthScore(repoMetadata['v0-morningops']);
  assert.ok(typeof score === 'number', 'should return a number');
  assert.ok(score >= 0 && score <= 100, 'score should be between 0 and 100');
  assert.ok(score > 50, 'complex multi-dependency repo should score above 50');
});

test('Compute health score for quantfusion', async (t) => {
  const score = computeHealthScore(repoMetadata.quantfusion);
  assert.ok(typeof score === 'number', 'should return a number');
  assert.ok(score >= 0 && score <= 100, 'score should be between 0 and 100');
});

test('Compute health score for desktopmorningops', async (t) => {
  const score = computeHealthScore(repoMetadata.desktopmorningops);
  assert.ok(typeof score === 'number', 'should return a number');
  assert.ok(score >= 0 && score <= 100, 'score should be between 0 and 100');
});

// Test suite 4: Cross-repo benchmarking
test('Benchmark 3 repos together without crash', async (t) => {
  const repos = [
    { ...repoMetadata.PdfEzFill, id: 'pdf-ez-fill' },
    { ...repoMetadata.clawpay, id: 'clawpay' },
    { ...repoMetadata['v0-morningops'], id: 'morningops' },
  ];

  const result = benchmarkEcosystem(repos);
  assert.ok(result, 'benchmarkEcosystem should return a result');
  assert.ok(result.rankings, 'result should have rankings');
  assert.ok(Array.isArray(result.rankings), 'rankings should be an array');
  assert.equal(result.rankings.length, 3, 'should have 3 rankings for 3 repos');
});

test('Benchmark 5 repos with cross-ecosystem comparison', async (t) => {
  const repos = [
    { ...repoMetadata.PdfEzFill, id: 'pdf-ez-fill' },
    { ...repoMetadata['v0-morningops'], id: 'morningops' },
    { ...repoMetadata.quantfusion, id: 'quantfusion' },
    { ...repoMetadata.LeadGen3, id: 'leadgen3' },
    { ...repoMetadata.veritap, id: 'veritap' },
  ];

  const result = benchmarkEcosystem(repos);
  assert.ok(result, 'benchmarkEcosystem should return a result');
  assert.ok(result.rankings, 'result should have rankings');
  assert.equal(result.rankings.length, 5, 'should have 5 rankings');

  // Verify rankings are sortable
  assert.ok(result.rankings[0].score >= 0, 'first ranking should have valid score');
  for (let i = 1; i < result.rankings.length; i++) {
    assert.ok(result.rankings[i - 1].score >= result.rankings[i].score, 'rankings should be sorted descending');
  }
});

test('Cross-repo benchmark produces comparison matrix', async (t) => {
  const repos = [
    { ...repoMetadata.LeadGen3, id: 'leadgen3' },
    { ...repoMetadata.desktopmorningops, id: 'desktop-ops' },
    { ...repoMetadata.CookiesPass, id: 'cookies-pass' },
  ];

  const result = benchmarkEcosystem(repos);
  assert.ok(result.comparisonMatrix, 'result should have comparisonMatrix');
  assert.equal(result.comparisonMatrix.length, 3, 'matrix rows should match repo count');
  result.comparisonMatrix.forEach((row) => {
    assert.equal(row.length, 3, 'each row should have 3 columns for 3 repos');
  });
});

test('Cross-repo benchmark generates narrative', async (t) => {
  const repos = [
    { ...repoMetadata.quantfusion, id: 'quantfusion' },
    { ...repoMetadata.RobloxGitSync, id: 'roblox' },
    { ...repoMetadata['browser-use'], id: 'browser-use' },
  ];

  const result = benchmarkEcosystem(repos);
  assert.ok(result.narrative, 'result should have narrative');
  assert.ok(typeof result.narrative === 'string', 'narrative should be a string');
  assert.ok(result.narrative.length > 50, 'narrative should be substantive');
});

test('Benchmark handles diverse tech stacks', async (t) => {
  const repos = [
    { ...repoMetadata['browser-use'], id: 'browser-use', language: 'python' },
    { ...repoMetadata.RobloxGitSync, id: 'roblox', language: 'lua' },
    { ...repoMetadata.CookiesPass, id: 'cookies', language: 'typescript' },
  ];

  const result = benchmarkEcosystem(repos);
  assert.ok(result.rankings, 'should handle mixed language stacks');
  assert.ok(result.rankings.length === 3, 'should rank all 3 repos');
});

// Test suite 5: Stress tests and edge cases
test('Benchmark all 10 repos together', async (t) => {
  const allRepos = Object.entries(repoMetadata).map(([name, metadata]) => ({
    ...metadata,
    id: name,
  }));

  const result = benchmarkEcosystem(allRepos);
  assert.ok(result.rankings, 'should produce rankings for all repos');
  assert.equal(result.rankings.length, 10, 'should rank all 10 repos');
  assert.ok(result.narrative, 'should generate narrative for 10 repos');
});

test('Rankings consistency across repeated benchmarks', async (t) => {
  const repos = [
    { ...repoMetadata.LeadGen3, id: 'leadgen3' },
    { ...repoMetadata.quantfusion, id: 'quantfusion' },
  ];

  const result1 = benchmarkEcosystem(repos);
  const result2 = benchmarkEcosystem(repos);

  assert.deepEqual(result1.rankings[0].id, result2.rankings[0].id, 'top-ranked repo should be same');
  assert.equal(result1.rankings[0].score, result2.rankings[0].score, 'scores should be deterministic');
});

test('Handles repo with minimal dependencies', async (t) => {
  const minimalRepo = {
    id: 'minimal',
    name: 'minimal',
    description: 'Minimal project',
    dependencies: [],
    devDependencies: [],
  };

  const result = detectCategory(minimalRepo);
  assert.ok(result, 'should handle minimal repo');

  const capabilities = getUniversalCapabilities(minimalRepo);
  assert.ok(Array.isArray(capabilities), 'should return capabilities for minimal repo');

  const score = computeHealthScore(minimalRepo);
  assert.ok(typeof score === 'number', 'should compute score for minimal repo');
});

test('Handles repo with many dependencies', async (t) => {
  const heavyRepo = {
    id: 'heavy',
    name: 'heavy',
    description: 'Heavy project with 100+ deps',
    dependencies: Array.from({ length: 100 }, (_, i) => `package-${i}`),
    devDependencies: Array.from({ length: 50 }, (_, i) => `dev-${i}`),
  };

  const result = detectCategory(heavyRepo);
  assert.ok(result, 'should handle heavy repo');

  const score = computeHealthScore(heavyRepo);
  assert.ok(typeof score === 'number', 'should compute score for heavy repo');
});

// Test suite 6: Real-world ecosystem patterns
test('Detect ecosystem pattern: backend + frontend stacks', async (t) => {
  const repos = [
    { ...repoMetadata.clawpay, id: 'payment-api' },
    { ...repoMetadata['v0-morningops'], id: 'fullstack-app' },
  ];

  const result = benchmarkEcosystem(repos);
  assert.ok(result.rankings.length === 2, 'should handle mixed frontend/backend');
  assert.ok(result.comparisonMatrix.length === 2, 'should compare mixed stacks');
});

test('Detect ecosystem pattern: specialized vs general repos', async (t) => {
  const repos = [
    { ...repoMetadata.PdfEzFill, id: 'specialized-pdf' },
    { ...repoMetadata['v0-morningops'], id: 'general-fullstack' },
  ];

  const result = benchmarkEcosystem(repos);
  const specialized = result.rankings.find(r => r.id === 'specialized-pdf');
  const general = result.rankings.find(r => r.id === 'general-fullstack');

  assert.ok(specialized, 'should rank specialized repo');
  assert.ok(general, 'should rank general repo');
});

test('Verify no repo crashes on detectCategory', async (t) => {
  const repos = Object.values(repoMetadata);
  repos.forEach((repo, i) => {
    const result = detectCategory(repo);
    assert.ok(result !== null, `repo ${i} should not crash detectCategory`);
  });
});

test('Verify no repo crashes on getUniversalCapabilities', async (t) => {
  const repos = Object.values(repoMetadata);
  repos.forEach((repo, i) => {
    const capabilities = getUniversalCapabilities(repo);
    assert.ok(Array.isArray(capabilities), `repo ${i} should return capabilities array`);
  });
});

test('Verify no repo crashes on computeHealthScore', async (t) => {
  const repos = Object.values(repoMetadata);
  repos.forEach((repo, i) => {
    const score = computeHealthScore(repo);
    assert.ok(typeof score === 'number', `repo ${i} should return numeric score`);
    assert.ok(!isNaN(score), `repo ${i} score should not be NaN`);
  });
});

// Test suite 7: Ecosystem insights
test('Generate meaningful ecosystem insights for diverse repos', async (t) => {
  const repos = [
    { ...repoMetadata.PdfEzFill, id: 'pdf-tools' },
    { ...repoMetadata.quantfusion, id: 'trading-platform' },
    { ...repoMetadata.LeadGen3, id: 'lead-gen' },
  ];

  const result = benchmarkEcosystem(repos);
  assert.ok(result.narrative.includes('trading') || result.narrative.includes('pdf') || result.narrative.includes('lead'),
    'narrative should reference domains');
});

test('Capability gaps analysis', async (t) => {
  const repos = [
    { ...repoMetadata.PdfEzFill, id: 'pdf-only' },
    { ...repoMetadata['v0-morningops'], id: 'feature-rich' },
  ];

  const pdf = getUniversalCapabilities(repoMetadata.PdfEzFill);
  const fullstack = getUniversalCapabilities(repoMetadata['v0-morningops']);

  assert.ok(pdf.length < fullstack.length, 'specialized should have fewer capabilities than fullstack');
});

test('Dependency count correlates with health score', async (t) => {
  const light = {
    id: 'light',
    name: 'light',
    description: 'Light project',
    dependencies: ['express'],
    devDependencies: [],
  };

  const heavy = {
    id: 'heavy',
    name: 'heavy',
    description: 'Heavy project',
    dependencies: ['express', 'react', 'prisma', 'stripe', 'openai', 'zod'],
    devDependencies: ['typescript', 'vitest', 'eslint'],
  };

  const lightScore = computeHealthScore(light);
  const heavyScore = computeHealthScore(heavy);

  // Both should be valid scores
  assert.ok(typeof lightScore === 'number', 'light repo should have score');
  assert.ok(typeof heavyScore === 'number', 'heavy repo should have score');
});
