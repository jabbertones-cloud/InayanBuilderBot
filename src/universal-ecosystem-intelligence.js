/**
 * Universal Ecosystem Intelligence Module
 *
 * Provides cross-repo benchmarking with real dependency analysis
 * for the claw-repos ecosystem.
 */

// Category detection signal map
const CATEGORY_SIGNALS = {
  'pdf-tools': ['pdfkit', 'pdf-lib', 'pdfdoc', 'pdf', 'form'],
  'game-development': ['roblox', 'unity', 'unreal', 'godot', 'pygame', 'phaser'],
  'devops-ci-cd': ['jenkins', 'github-actions', 'gitlab-ci', 'circleci', 'jest', 'mocha'],
  'e-commerce': ['stripe', 'shopify', 'woocommerce', 'magento', 'cart', 'checkout', 'paypal', 'qrcode', 'passkit', 'exceljs', 'barcode'],
  'fintech-trading': ['trading', 'stock', 'crypto', 'exchange', 'quantfusion', 'portfolio', 'drizzle-orm', 'recharts'],
  'email-marketing': ['nodemailer', 'mailgun', 'sendgrid', 'resend', 'mailersend', 'email', 'better-auth', 'next', 'stripe', 'openai'],
  'dashboard-chat': ['dashboard', 'real-time', 'socket.io', 'websocket', 'chat', 'messaging', 'next', 'prisma', 'openai'],
  'lead-generation': ['lead', 'prospect', 'scraping', 'crawler', 'bullmq', 'mailersend'],
  'desktop-app': ['electron', 'tauri', 'nwjs', 'desktop', 'macos', 'windows'],
  'browser-automation': ['playwright', 'puppeteer', 'selenium', 'browser', 'automation'],
  'nfc-verification': ['nfc', 'verification', 'identity', 'qrcode', 'barcode'],
  'auth-security': ['passport', 'bcrypt', 'jsonwebtoken', 'keytar', 'auth'],
  'web-scraping': ['cheerio', 'axios', 'scraping', 'crawler', 'jsdom'],
  'task-queue': ['bullmq', 'bull', 'agenda', 'node-schedule', 'cron'],
};

const TECH_CAPABILITIES = {
  'passport': 'authentication',
  'better-auth': 'authentication',
  'next-auth': 'authentication',
  'jsonwebtoken': 'jwt_tokens',
  'bcrypt': 'password_hashing',
  'prisma': 'database_orm',
  'drizzle-orm': 'database_orm',
  'postgres': 'postgresql',
  'pg': 'postgresql',
  'express': 'http_server',
  'fastify': 'http_server',
  'next': 'nextjs_framework',
  'react': 'react_ui',
  'vue': 'vue_ui',
  'stripe': 'stripe_payments',
  '@stripe/stripe-js': 'stripe_payments',
  'openai': 'openai_api',
  '@anthropic-ai/sdk': 'anthropic_api',
  'nodemailer': 'email_sending',
  'mailersend': 'email_sending',
  'resend': 'email_sending',
  'pino': 'logging',
  'winston': 'logging',
  'playwright': 'browser_testing',
  'jest': 'unit_testing',
  'vitest': 'unit_testing',
  'redis': 'caching',
  'ioredis': 'caching',
  'tailwindcss': 'tailwind_css',
  'zod': 'validation',
  'axios': 'http_client',
  'cheerio': 'web_scraping',
  'puppeteer': 'browser_automation',
  'socket.io': 'real_time',
  'ws': 'websockets',
  'bullmq': 'job_queue',
  'bcryptjs': 'password_hashing',
  'electron': 'electron_desktop',
  'recharts': 'charting',
  'googleapis': 'google_apis',
  'telnyx': 'communications_api',
  'qrcode': 'qr_code_gen',
  'bwip-js': 'barcode_gen',
  'passkit-generator': 'wallet_passes',
  'sharp': 'image_processing',
  'multer': 'file_upload',
  'exceljs': 'excel_export',
  'imapflow': 'imap_client',
  'mailparser': 'email_parsing',
};

/**
 * Detect category for a repo based on dependencies and keywords
 */
export function detectCategory(repo) {
  const allDeps = [...(repo.dependencies || []), ...(repo.devDependencies || [])];
  const keywords = repo.keywords || [];
  const description = (repo.description || '').toLowerCase();

  let bestCategory = 'general-purpose';
  let bestScore = 0;

  for (const [category, signals] of Object.entries(CATEGORY_SIGNALS)) {
    let score = 0;

    for (const signal of signals) {
      const lowerSignal = signal.toLowerCase();
      if (allDeps.some(d => d.toLowerCase().includes(lowerSignal))) score += 3;
      if (keywords.some(k => k.toLowerCase().includes(lowerSignal))) score += 2;
      if (description.includes(lowerSignal)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return {
    categoryId: bestCategory,
    confidence: Math.min(bestScore / 10, 1),
    signals: bestScore,
  };
}

/**
 * Get universal capabilities for a repo
 */
export function getUniversalCapabilities(repo) {
  const allDeps = [...(repo.dependencies || []), ...(repo.devDependencies || [])];
  const capabilities = new Set();

  for (const dep of allDeps) {
    const depName = dep.toLowerCase();
    if (TECH_CAPABILITIES[depName]) {
      capabilities.add(TECH_CAPABILITIES[depName]);
    }
  }

  // Add capability inferences
  if (allDeps.some(d => d.toLowerCase().includes('react'))) {
    capabilities.add('frontend-framework');
  }
  if (allDeps.some(d => d.toLowerCase().includes('express') || d.toLowerCase().includes('fastify'))) {
    capabilities.add('backend-api');
  }
  if (allDeps.some(d => d.toLowerCase().includes('electron'))) {
    capabilities.add('desktop-application');
  }
  if (allDeps.some(d => d.toLowerCase().includes('stripe') || d.toLowerCase().includes('paypal'))) {
    capabilities.add('payment-processing');
  }
  if (allDeps.some(d => d.toLowerCase().includes('playwright') || d.toLowerCase().includes('puppeteer'))) {
    capabilities.add('browser-automation');
  }
  if (allDeps.some(d => d.toLowerCase().includes('postgres') || d.toLowerCase().includes('mongodb'))) {
    capabilities.add('database');
  }
  if (allDeps.some(d => d.toLowerCase().includes('openai') || d.toLowerCase().includes('anthropic'))) {
    capabilities.add('ai-integration');
  }
  if (allDeps.some(d => d.toLowerCase().includes('nodemailer') || d.toLowerCase().includes('mailersend'))) {
    capabilities.add('email-delivery');
  }
  if (allDeps.some(d => d.toLowerCase().includes('redis') || d.toLowerCase().includes('memcache'))) {
    capabilities.add('caching');
  }
  if (allDeps.some(d => d.toLowerCase().includes('websocket') || d.toLowerCase().includes('socket.io'))) {
    capabilities.add('real-time-comms');
  }
  if (allDeps.some(d => d.toLowerCase().includes('bullmq') || d.toLowerCase().includes('bull'))) {
    capabilities.add('job-queue');
  }
  if (allDeps.some(d => d.toLowerCase().includes('cheerio') || d.toLowerCase().includes('jsdom'))) {
    capabilities.add('web-scraping');
  }

  return Array.from(capabilities);
}

/**
 * Compute health score for a repo
 */
export function computeHealthScore(repo) {
  let score = 50; // Base score

  const allDeps = [...(repo.dependencies || []), ...(repo.devDependencies || [])];

  // Dependency health
  const depCount = allDeps.length;
  if (depCount > 5) score += 10;
  if (depCount > 20) score += 10;
  if (depCount > 50) score += 5; // Diminishing returns on too many deps

  // Testing coverage indicator
  const hasTests = allDeps.some(d => 
    d.toLowerCase().includes('jest') || 
    d.toLowerCase().includes('vitest') || 
    d.toLowerCase().includes('playwright')
  );
  if (hasTests) score += 15;

  // Type safety
  const hasTypeScript = allDeps.some(d => d.toLowerCase().includes('typescript'));
  if (hasTypeScript) score += 10;

  // Linting
  const hasLinting = allDeps.some(d => 
    d.toLowerCase().includes('eslint') || 
    d.toLowerCase().includes('prettier')
  );
  if (hasLinting) score += 5;

  // Security
  const hasSecurityDeps = allDeps.some(d => 
    d.toLowerCase().includes('bcrypt') || 
    d.toLowerCase().includes('helmet')
  );
  if (hasSecurityDeps) score += 5;

  // Modern tooling
  const hasModernTools = allDeps.some(d => 
    d.toLowerCase().includes('vite') || 
    d.toLowerCase().includes('esbuild')
  );
  if (hasModernTools) score += 5;

  // Logging
  const hasLogging = allDeps.some(d => 
    d.toLowerCase().includes('pino') || 
    d.toLowerCase().includes('winston')
  );
  if (hasLogging) score += 3;

  // Cap at 100
  return Math.min(Math.max(score, 0), 100);
}

/**
 * Benchmark ecosystem - compare multiple repos
 */
export function benchmarkEcosystem(repos) {
  const rankings = repos
    .map(repo => ({
      id: repo.id || repo.name,
      name: repo.name,
      category: detectCategory(repo).categoryId,
      capabilities: getUniversalCapabilities(repo).length,
      score: computeHealthScore(repo),
      dependencyCount: (repo.dependencies || []).length + (repo.devDependencies || []).length,
    }))
    .sort((a, b) => b.score - a.score);

  // Build comparison matrix
  const comparisonMatrix = rankings.map((repo, i) => 
    rankings.map((other, j) => {
      if (i === j) return 1.0; // Perfect match with self
      const categoryMatch = repo.category === other.category ? 0.3 : 0;
      const capDiff = Math.abs(repo.capabilities - other.capabilities) / 20;
      const scoreDiff = Math.abs(repo.score - other.score) / 100;
      return Math.max(0, 1 - (capDiff + scoreDiff) / 2 + categoryMatch);
    })
  );

  // Generate narrative
  const topRepo = rankings[0];
  const categories = [...new Set(rankings.map(r => r.category))];
  const avgScore = Math.round(rankings.reduce((s, r) => s + r.score, 0) / rankings.length);
  const topCap = Math.max(...rankings.map(r => r.capabilities));

  const narrative = `
Ecosystem Benchmark Report (${repos.length} repos analyzed):

Top Performer: ${topRepo.name} (${topRepo.category}, score: ${topRepo.score}/100)
  - Capabilities: ${topRepo.capabilities}
  - Dependencies: ${topRepo.dependencyCount}

Overall Ecosystem Health: ${avgScore}/100
- Categories detected: ${categories.join(', ')}
- Capability range: 1-${topCap} per project
- Strong specialization across ecosystem

Key Insights:
- Projects show clear specialization patterns
- Multi-layer ecosystem with complementary capabilities
- Health scores reflect modern tooling adoption
- Dependencies reflect business requirements per category
  `.trim();

  return {
    rankings,
    comparisonMatrix,
    narrative,
    avgHealthScore: avgScore,
    categoriesDetected: categories,
  };
}
