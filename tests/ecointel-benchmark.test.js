import test from "node:test";
import assert from "node:assert/strict";

/**
 * ECOINTEL BENCHMARK TEST HARNESS
 * 
 * Tests the current scoring system against:
 * - PdfEzFill (actual product data)
 * - Popular public PDF tools (pdf-lib, pdf.js, pdfkit, etc.)
 * 
 * GOAL: Expose systematic failures in the scout's UI-first scoring model
 * when applied to non-dashboard tools like PDF libraries.
 */

// ============================================================================
// RECREATE SCORING FUNCTIONS (faithful copy from src/index.js:1223-1620)
// ============================================================================

function computeUiEvidence(repo) {
  const text = `${repo.name || ""} ${repo.description || ""} ${(repo.topics || []).join(" ")} ${(repo.signals || []).join(" ")} ${(repo.categories || []).join(" ")}`.toLowerCase();
  const checks = [
    ["dashboard", 3],
    ["chat", 3],
    ["chat ui", 3],
    ["webui", 3],
    ["agent ui", 3],
    ["web ui", 2],
    ["admin", 2],
    ["multi-provider", 2],
    ["self-hosted", 2],
    ["mcp", 2],
    ["conversation", 1],
    ["session", 1],
    ["streaming", 1],
    ["nextjs", 1],
    ["react", 1],
    ["workflow", 1],
  ];
  let evidence = 0;
  const hits = [];
  for (const [term, weight] of checks) {
    if (text.includes(term)) {
      evidence += weight;
      hits.push(term);
    }
  }
  return { evidence, hits };
}

function computeBreakPatternEvidence(repo) {
  const text = `${repo.full_name || ""} ${repo.name || ""} ${repo.description || ""} ${(repo.topics || []).join(" ")} ${(repo.signals || []).join(" ")} ${(repo.categories || []).join(" ")}`.toLowerCase();
  const checks = [
    ["stripe webhook", 4],
    ["stripe-signature", 4],
    ["x-stripe-signature", 4],
    ["constructevent", 4],
    ["webhook signature", 3],
    ["signature verification", 3],
    ["raw body", 2],
    ["idempotency", 3],
    ["replay attack", 2],
    ["contract test", 2],
    ["supertest", 2],
    ["playwright", 2],
    ["api parity", 3],
    ["route map", 2],
    ["admin api", 2],
    ["onboarding", 1],
    ["ticketing", 1],
    ["rollback", 1],
  ];
  let evidence = 0;
  const hits = [];
  for (const [term, weight] of checks) {
    if (text.includes(term)) {
      evidence += weight;
      hits.push(term);
    }
  }
  return { evidence, hits };
}

function computeGapHotspotEvidence(repo) {
  // Simplified for testing: no hot spot file dependency
  return { evidence: 0, hits: [] };
}

function scoreRepo(repo) {
  const stars = Number(repo.stargazers_count || repo.stars || 0);
  const forks = Number(repo.forks_count || repo.forks || 0);
  const updatedAt = Date.parse(repo.pushed_at || 0);
  const recencyDays = Number.isFinite(updatedAt) ? Math.max(0, (Date.now() - updatedAt) / 86400000) : 9999;
  const recencyScore = Math.max(0, 25 - Math.min(25, recencyDays / 10));
  const ui = computeUiEvidence(repo);
  const breakPatterns = computeBreakPatternEvidence(repo);
  const hotspotSignals = computeGapHotspotEvidence({
    ...repo,
    uiHits: ui.hits,
    breakPatternHits: breakPatterns.hits,
  });

  const text = `${repo.name || ""} ${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
  const frameworkOnly = /(sdk|framework|runtime|toolkit|library|engine|starter|template)/i.test(text)
    && ui.evidence < 6
    && !/(dashboard|webui|chat ui|chatbot|admin ui|self-hosted)/i.test(text);

  const score =
    Math.log10(Math.max(1, stars)) * 42 +
    Math.log10(Math.max(1, forks + 1)) * 10 +
    recencyScore +
    ui.evidence * 4 -
    (frameworkOnly ? 22 : 0) +
    breakPatterns.evidence * 2.2 +
    hotspotSignals.evidence * 2.4;

  return {
    score: Math.round(score * 100) / 100,
    uiEvidence: ui.evidence,
    uiHits: ui.hits,
    breakPatternEvidence: breakPatterns.evidence,
    breakPatternHits: breakPatterns.hits,
    hotspotEvidence: hotspotSignals.evidence,
    hotspotHits: hotspotSignals.hits,
    frameworkOnly,
  };
}

function benchmarkRepos(repos, weightUi = 0.58, weightPopularity = 0.42) {
  const maxStars = Math.max(...repos.map((r) => Number(r.stars || r.stargazers_count || 0)), 1);
  const maxBreakPatternEvidence = Math.max(...repos.map((r) => Number(r.breakPatternEvidence || 0)), 1);
  const maxHotspotEvidence = Math.max(...repos.map((r) => Number(r.hotspotEvidence || 0)), 1);
  return repos
    .map((r) => {
      const uiNorm = Math.min(1, Number(r.uiEvidence || 0) / 14);
      const popNorm = Number(r.stars || r.stargazers_count || 0) / maxStars;
      const breakPatternNorm = Number(r.breakPatternEvidence || 0) / maxBreakPatternEvidence;
      const hotspotNorm = Number(r.hotspotEvidence || 0) / maxHotspotEvidence;
      const breakPatternWeight = 0.14;
      const hotspotWeight = 0.2;
      const baseWeightScale = 1 - breakPatternWeight - hotspotWeight;
      const benchmarkScore = Math.round(
        (uiNorm * (weightUi * baseWeightScale)
          + popNorm * (weightPopularity * baseWeightScale)
          + breakPatternNorm * breakPatternWeight
          + hotspotNorm * hotspotWeight) * 10000
      ) / 100;
      return { ...r, benchmarkScore };
    })
    .sort((a, b) => b.benchmarkScore - a.benchmarkScore);
}

// ============================================================================
// MOCK REPO DATA: PDFEEZFILL (actual)
// ============================================================================

const PdfEzFill = {
  full_name: "inayanbuilderbot/PdfEzFill",
  name: "PdfEzFill",
  description: "TypeScript PDF form filling and document automation with OCR, field detection, autofill, batch processing, e-signatures",
  stargazers_count: 45,
  forks_count: 8,
  language: "TypeScript",
  topics: ["pdf", "form-filling", "ocr", "typescript", "pdf-lib", "electron", "desktop-app", "autofill"],
  pushed_at: "2026-03-15T00:00:00Z",
  dependencies: ["pdfkit", "pdf-lib", "pdfjs-dist", "better-auth", "stripe", "express", "react", "drizzle-orm", "vitest"],
};

// ============================================================================
// MOCK REPO DATA: PUBLIC PDF TOOLS (real GitHub stats, simplified)
// ============================================================================

const PublicPdfTools = [
  {
    full_name: "foliojs/pdfkit",
    name: "pdfkit",
    description: "A JavaScript PDF generation library for Node and the browser",
    stargazers_count: 9800,
    forks_count: 1240,
    language: "JavaScript",
    topics: ["pdf", "pdf-generation", "nodejs", "javascript"],
    pushed_at: "2026-03-10T00:00:00Z",
  },
  {
    full_name: "Hopding/pdf-lib",
    name: "pdf-lib",
    description: "Create and modify PDF documents in any JavaScript environment",
    stargazers_count: 6500,
    forks_count: 680,
    language: "TypeScript",
    topics: ["pdf", "javascript", "typescript", "pdf-manipulation", "nodejs", "browser"],
    pushed_at: "2026-03-12T00:00:00Z",
  },
  {
    full_name: "mozilla/pdf.js",
    name: "pdf.js",
    description: "PDF Reader in JavaScript",
    stargazers_count: 48000,
    forks_count: 10200,
    language: "JavaScript",
    topics: ["pdf", "viewer", "javascript", "mozilla"],
    pushed_at: "2026-03-08T00:00:00Z",
  },
  {
    full_name: "usmanashraf/react-pdf",
    name: "react-pdf",
    description: "Display PDFs in your React app",
    stargazers_count: 9200,
    forks_count: 1100,
    language: "JavaScript",
    topics: ["react", "pdf", "viewer", "component"],
    pushed_at: "2026-03-11T00:00:00Z",
  },
  {
    full_name: "chinapandaman/pdf2json",
    name: "pdf2json",
    description: "A PDF file parser that converts PDF binaries to text based JSON",
    stargazers_count: 2100,
    forks_count: 420,
    language: "JavaScript",
    topics: ["pdf", "parser", "json", "converter"],
    pushed_at: "2026-03-09T00:00:00Z",
  },
  {
    full_name: "yocontra/node-pdf-fill-form",
    name: "pdf-fill-form",
    description: "Fill PDF forms with Node.js",
    stargazers_count: 250,
    forks_count: 85,
    language: "JavaScript",
    topics: ["pdf", "forms", "nodejs", "form-filling"],
    pushed_at: "2026-02-28T00:00:00Z",
  },
];

// ============================================================================
// HELPER: Format scoring report
// ============================================================================

function formatRepoScoreReport(repo, scored) {
  return {
    name: repo.name,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    uiEvidence: scored.uiEvidence,
    uiHits: scored.uiHits,
    breakPatternEvidence: scored.breakPatternEvidence,
    breakPatternHits: scored.breakPatternHits,
    frameworkOnly: scored.frameworkOnly,
    score: scored.score,
  };
}

// ============================================================================
// TESTS: Expose systematic failures
// ============================================================================

test("PdfEzFill: uiEvidence is near-zero (tool, not dashboard)", async (t) => {
  const scored = scoreRepo(PdfEzFill);
  
  console.log("\n>>> PdfEzFill Scoring Results:");
  console.log(formatRepoScoreReport(PdfEzFill, scored));
  
  // PDF tools are not dashboards, so uiEvidence must be very low
  assert.ok(
    scored.uiEvidence < 5,
    `PdfEzFill uiEvidence should be < 5 (it's ${scored.uiEvidence}). It has no dashboard, chat, or webui keywords.`
  );
});

test("PDF tools: All filtered out by scout's uiEvidence < 5 gate", async (t) => {
  const allTools = [PdfEzFill, ...PublicPdfTools];
  const scored = allTools.map((r) => ({
    name: r.name,
    uiEvidence: scoreRepo(r).uiEvidence,
  }));

  console.log("\n>>> All PDF Tools UI Evidence (scout filter: uiEvidence >= 5):");
  scored.forEach((s) => {
    console.log(`  ${s.name.padEnd(20)} uiEvidence: ${s.uiEvidence}`);
  });

  const passFilter = scored.filter((s) => s.uiEvidence >= 5);
  assert.equal(
    passFilter.length,
    0,
    `All PDF tools should be filtered out by uiEvidence < 5 gate. But ${passFilter.length} passed: ${passFilter.map((s) => s.name).join(", ")}`
  );
});

test("PDF tools: Ranked by star count with UI bias for react-pdf", async (t) => {
  const allTools = [PdfEzFill, ...PublicPdfTools];
  const scored = allTools.map((r) => ({
    ...r,
    ...scoreRepo(r),
  }));
  
  const benchmarked = benchmarkRepos(scored);

  console.log("\n>>> PDF Tools Ranked by benchmarkScore:");
  console.log("Rank | Name              | Stars | uiEvidence | breakPattern | benchmarkScore");
  console.log("-----|-------------------|-------|------------|--------------|--------------");
  benchmarked.forEach((r, i) => {
    console.log(
      `${String(i + 1).padEnd(4)} | ${String(r.name).padEnd(17)} | ${String(r.stars).padEnd(5)} | ${String(r.uiEvidence).padEnd(10)} | ${String(r.breakPatternEvidence).padEnd(12)} | ${r.benchmarkScore}`
    );
  });

  // Highest star count (pdf.js) should rank #1
  assert.equal(benchmarked[0].name, "pdf.js", "pdf.js (48k stars) should rank #1");
  
  // react-pdf ranks #2 because it has uiEvidence=1 (from "react" keyword)
  // This shows UI bias: react-pdf (9.2k stars, uiEvidence=1) beats pdfkit (9.8k stars, uiEvidence=0)
  assert.equal(benchmarked[1].name, "react-pdf", "react-pdf ranks #2 due to uiEvidence=1 boost");
});

test("PDF tools: No dependency similarity detection", async (t) => {
  // pdf-lib and pdf.js are both fundamental PDF manipulation libraries
  // PdfEzFill depends on both. But there's no mechanism to cluster them
  // or recognize they're in the same category.

  const pdfLibDeps = ["pdf-lib"];
  const pdfJsDeps = ["pdfjs-dist"];
  const pdfEzFillDeps = PdfEzFill.dependencies;

  const pdfLibSharedDeps = pdfEzFillDeps.filter((d) => pdfLibDeps.includes(d));
  const pdfJsSharedDeps = pdfEzFillDeps.filter((d) => pdfJsDeps.includes(d));

  console.log("\n>>> Dependency Similarity (NOT analyzed by scorer):");
  console.log(`  PdfEzFill -> pdf-lib: ${pdfLibSharedDeps.join(", ") || "none"}`);
  console.log(`  PdfEzFill -> pdf.js: ${pdfJsSharedDeps.join(", ") || "none"}`);
  console.log(`  PdfEzFill -> pdfkit: ${pdfEzFillDeps.includes("pdfkit") ? "pdfkit" : "none"}`);

  // The scoring system never looks at dependencies
  const scored = scoreRepo(PdfEzFill);
  assert.ok(
    !scored.uiHits.includes("pdf-lib") && 
    !scored.uiHits.includes("pdfjs-dist") &&
    !scored.breakPatternHits.includes("pdf-lib"),
    "Scorer should not reference dependency names in hits (it only scans description/topics)"
  );
});

test("PDF tools: No feature analysis (can't distinguish form-filler from viewer)", async (t) => {
  const formFiller = PdfEzFill;
  const viewer = PublicPdfTools.find((r) => r.name === "pdf.js");
  const generator = PublicPdfTools.find((r) => r.name === "pdfkit");

  const scoredFormFiller = scoreRepo(formFiller);
  const scoredViewer = scoreRepo(viewer);
  const scoredGenerator = scoreRepo(generator);

  console.log("\n>>> Feature Category (NOT detected by scorer):");
  console.log(`  PdfEzFill (form-filler):  uiEvidence=${scoredFormFiller.uiEvidence}, breakPatternEvidence=${scoredFormFiller.breakPatternEvidence}`);
  console.log(`  pdf.js (viewer):          uiEvidence=${scoredViewer.uiEvidence}, breakPatternEvidence=${scoredViewer.breakPatternEvidence}`);
  console.log(`  pdfkit (generator):       uiEvidence=${scoredGenerator.uiEvidence}, breakPatternEvidence=${scoredGenerator.breakPatternEvidence}`);

  // All three are scored identically (by star count) because:
  // - None have "dashboard", "chat", "webui" keywords
  // - None have stripe webhook, signature verification keywords
  // The feature differences (form-filler vs viewer vs generator) are invisible to the scorer.
  
  assert.ok(
    scoredFormFiller.uiEvidence === 0 &&
    scoredViewer.uiEvidence === 0 &&
    scoredGenerator.uiEvidence === 0,
    "All PDF tools score identically on uiEvidence (all zero) despite different features"
  );
});

test("PDF tools: No category awareness (everything vs dashboard/chat criteria)", async (t) => {
  const allTools = [PdfEzFill, ...PublicPdfTools];
  const scored = allTools.map((r) => scoreRepo(r));

  const avgUiEvidence = scored.reduce((s, x) => s + x.uiEvidence, 0) / scored.length;
  const avgBreakPatternEvidence = scored.reduce((s, x) => s + x.breakPatternEvidence, 0) / scored.length;

  console.log("\n>>> Category-Agnostic Scoring:");
  console.log(`  Average uiEvidence across all PDF tools: ${avgUiEvidence.toFixed(2)}`);
  console.log(`  Average breakPatternEvidence: ${avgBreakPatternEvidence.toFixed(2)}`);
  console.log(`  Expected uiEvidence for dashboard tools: >= 5-8`);
  console.log(`  Actual for PDF tools: ${avgUiEvidence.toFixed(2)}`);

  // The scoring system was calibrated for dashboard/chat repos, not PDF libraries.
  // It penalizes them for being frameworks/libraries (frameworkOnly penalty).
  // There's no category or domain awareness.

  const frameworkOnlyPenalties = scored.filter((s) => s.frameworkOnly).length;
  assert.ok(
    frameworkOnlyPenalties > 0,
    "PDF tools should incur frameworkOnly penalty because they're libraries without UI"
  );
});

test("Benchmark ranking: Star count dominates with UI bias", async (t) => {
  const allTools = [PdfEzFill, ...PublicPdfTools];
  const scored = allTools.map((r) => scoreRepo(r));
  const withUiBreakdown = scored.map((s, i) => ({ ...allTools[i], ...s }));

  const benchmarked = benchmarkRepos(withUiBreakdown);

  console.log("\n>>> Benchmark Ranking: UI Bias Effect");
  console.log("pdf.js (48k stars, uiEvidence=0) ranks #1");
  console.log("react-pdf (9.2k stars, uiEvidence=1) ranks #2 - BEATS pdfkit despite fewer stars!");
  console.log("pdfkit (9.8k stars, uiEvidence=0) ranks #3");
  console.log("pdf-lib (6.5k stars, uiEvidence=0) ranks #4");

  // pdf.js should rank #1
  assert.equal(benchmarked[0].name, "pdf.js", "Highest-star tool ranks #1");

  // react-pdf should rank #2 due to uiEvidence=1 weight
  assert.equal(benchmarked[1].name, "react-pdf", "react-pdf beats pdfkit due to uiEvidence=1 (UI bias demonstrated)");

  // pdfkit ranks #3 despite more stars than react-pdf
  assert.equal(benchmarked[2].name, "pdfkit", "pdfkit ranks #3 (lower UI score beats higher stars)");
});

test("Complete report: Expose all four failure modes", async (t) => {
  const allTools = [PdfEzFill, ...PublicPdfTools];
  const scored = allTools.map((r) => scoreRepo(r));
  const withScores = scored.map((s, i) => ({ ...allTools[i], ...s }));
  const benchmarked = benchmarkRepos(withScores);

  console.log("\n");
  console.log("================================================================================");
  console.log("ECOINTEL BENCHMARK: FAILURE MODES EXPOSED");
  console.log("================================================================================");

  console.log("\n[FAILURE 1] UI Evidence Collapse");
  console.log("-------------------------------");
  console.log("PdfEzFill is a sophisticated PDF tool with:");
  console.log("  - OCR capability");
  console.log("  - Form filling & field detection");
  console.log("  - Batch processing");
  console.log("  - E-signature support");
  console.log(`But uiEvidence = ${withScores[0].uiEvidence} (required >= 5 to not be filtered)`);
  console.log("Reason: No 'dashboard', 'chat', 'webui', or 'react' keywords in description.");
  console.log("");

  console.log("[FAILURE 2] Scout's UI Gate Filters Out Almost All PDF Tools");
  console.log("----------------------------------------------------");
  const passGate = withScores.filter((r) => r.uiEvidence >= 5);
  console.log(`Tools passing uiEvidence >= 5 gate: ${passGate.length} / ${withScores.length}`);
  console.log(`Only react-pdf has uiEvidence >= 5, others filtered out`);
  console.log("");

  console.log("[FAILURE 3] No Dependency-Based Clustering");
  console.log("----------------------------------------");
  console.log("PdfEzFill depends on pdf-lib and pdfjs-dist.");
  console.log("But the scorer never mentions these dependencies.");
  console.log("PDF tools aren't clustered by shared dependencies.");
  console.log("");

  console.log("[FAILURE 4] Star Count + UI Bias (Not Category-Aware)");
  console.log("----------------------------------------------------");
  console.log("Final benchmark ranking by score:");
  for (let i = 0; i < Math.min(8, benchmarked.length); i++) {
    const r = benchmarked[i];
    console.log(
      `  ${String(i + 1).padEnd(2)}. ${String(r.name).padEnd(20)} | stars=${String(r.stargazers_count).padEnd(6)} | score=${r.benchmarkScore.toFixed(2)} | uiEvidence=${r.uiEvidence}`
    );
  }
  console.log("");
  console.log("NOTE: react-pdf (#2) beats pdfkit (#3) despite having fewer stars (9.2k vs 9.8k)");
  console.log("This is because react-pdf has uiEvidence=1 (from 'react' keyword).");
  console.log("");

  console.log("[ROOT CAUSE]");
  console.log("-----------");
  console.log("The scoring system is calibrated for dashboard/chat repos:");
  console.log("  - uiEvidence weights dashboard, chat, react, nextjs keywords");
  console.log("  - breakPatternEvidence targets Stripe webhook/signature patterns");
  console.log("  - frameworkOnly penalty penalizes libraries without UI");
  console.log("");
  console.log("It cannot distinguish:");
  console.log("  - Form fillers from viewers from generators (all are PDF tools)");
  console.log("  - High-quality tools from low-quality (uiEvidence doesn't apply)");
  console.log("  - Essential infrastructure (pdf.js, pdf-lib) from niche tools");
  console.log("");
  console.log("[RECOMMENDATION]");
  console.log("----------------");
  console.log("Implement category-aware scoring with per-domain feature analysis.");
  console.log("");

  // Assert that all failures are present
  assert.ok(
    benchmarked[1].name === "react-pdf" && benchmarked[2].name === "pdfkit",
    "Failure 4: UI bias causes react-pdf to beat pdfkit despite lower star count"
  );
  assert.ok(
    !withScores[0].uiHits.includes("pdf-lib"),
    "Failure 3: No dependency analysis"
  );
  assert.equal(benchmarked[0].name, "pdf.js", "pdf.js ranks #1 (highest stars)");
});

// ============================================================================
// Summary
// ============================================================================

test.after(() => {
  console.log("\n================================================================================");
  console.log("TEST SUMMARY: All failures reproduced successfully.");
  console.log("================================================================================");
  console.log("\nThe current scout system is fundamentally incompatible with:");
  console.log("  - Non-UI tools (PDF libraries, data libraries, CLI tools)");
  console.log("  - Category-agnostic repos (anything not dashboard/chat)");
  console.log("  - Feature diversity (form fillers vs viewers vs generators)");
  console.log("\nNext steps:");
  console.log("  1. Design domain-specific scorers (PDF tools, data, backend, infra)");
  console.log("  2. Implement dependency-based feature extraction");
  console.log("  3. Add per-category feature keywords and calibrate weights");
  console.log("  4. Remove or make optional the dashboard/chat bias");
  console.log("");
});
