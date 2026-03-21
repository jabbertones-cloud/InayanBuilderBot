const test = require("node:test");
const assert = require("node:assert");

const {
  computeMetaSimilarity,
  computeDepJaccard,
  computeHealthScore,
  computeFeatureCompleteness,
  computeSuggestionScore,
  buildRecommendation,
  normalizeDeps,
} = require("../src/lib/scoring.js");

test("computeMetaSimilarity", async (t) => {
  await t.test("same language returns high score", () => {
    const score = computeMetaSimilarity("Python", "Python");
    assert.ok(score > 0.7, "Same language should score high");
  });

  await t.test("different languages return lower score", () => {
    const score = computeMetaSimilarity("Python", "JavaScript");
    assert.ok(score < 0.7, "Different languages should score lower");
  });

  await t.test("returns value between 0 and 1", () => {
    const score = computeMetaSimilarity("Go", "TypeScript");
    assert.ok(score >= 0 && score <= 1, "Score should be between 0 and 1");
  });

  await t.test("handles unknown languages", () => {
    const score = computeMetaSimilarity("Unknown", "Unknown");
    assert.ok(typeof score === "number", "Should return a number");
  });
});

test("computeDepJaccard", async (t) => {
  await t.test("identical deps returns 1.0", () => {
    const score = computeDepJaccard(["pytest", "requests"], ["pytest", "requests"]);
    assert.strictEqual(score, 1.0);
  });

  await t.test("no overlap returns 0.0", () => {
    const score = computeDepJaccard(["pytest"], ["requests"]);
    assert.strictEqual(score, 0.0);
  });

  await t.test("partial overlap returns between 0 and 1", () => {
    const score = computeDepJaccard(
      ["pytest", "requests", "numpy"],
      ["pytest", "requests", "pandas"]
    );
    assert.ok(score > 0 && score < 1, "Partial overlap should be between 0 and 1");
  });

  await t.test("empty arrays return 0", () => {
    const score = computeDepJaccard([], []);
    assert.strictEqual(score, 0);
  });

  await t.test("one empty array returns 0", () => {
    const score = computeDepJaccard(["pytest"], []);
    assert.strictEqual(score, 0);
  });

  await t.test("duplicates are handled", () => {
    const score = computeDepJaccard(
      ["pytest", "pytest"],
      ["pytest"]
    );
    assert.strictEqual(score, 1.0);
  });
});

test("computeHealthScore", async (t) => {
  await t.test("fresh active repo returns high score", () => {
    const now = new Date();
    const repo = {
      stars: 1000,
      forks: 100,
      open_issues_count: 10,
      issue_response_velocity: 0.8,
      contributor_count: 10,
      archived: false,
      pushed_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      created_at: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
    };

    const score = computeHealthScore(repo);
    assert.ok(score > 0.6, "Active fresh repo should have high health score");
  });

  await t.test("archived stale repo returns low score", () => {
    const now = new Date();
    const repo = {
      stars: 10,
      forks: 1,
      open_issues_count: 50,
      issue_response_velocity: 0.2,
      contributor_count: 1,
      archived: true,
      pushed_at: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
      created_at: new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 3 years ago
    };

    const score = computeHealthScore(repo);
    assert.ok(score < 0.4, "Archived stale repo should have low health score");
  });

  await t.test("returns value between 0 and 1", () => {
    const repo = {
      stars: 100,
      forks: 10,
      open_issues_count: 5,
      issue_response_velocity: 0.5,
      contributor_count: 5,
      archived: false,
      pushed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const score = computeHealthScore(repo);
    assert.ok(score >= 0 && score <= 1, "Score should be between 0 and 1");
  });
});

test("computeFeatureCompleteness", async (t) => {
  await t.test("all features present returns 1.0", () => {
    const features = [
      { id: "async_job_queue", present: true },
      { id: "retry_logic", present: true },
      { id: "graceful_shutdown", present: true },
    ];

    const score = computeFeatureCompleteness(features);
    assert.strictEqual(score, 1.0);
  });

  await t.test("no features present returns 0.0", () => {
    const features = [
      { id: "async_job_queue", present: false },
      { id: "retry_logic", present: false },
    ];

    const score = computeFeatureCompleteness(features);
    assert.strictEqual(score, 0.0);
  });

  await t.test("partial features returns between 0 and 1", () => {
    const features = [
      { id: "async_job_queue", present: true },
      { id: "retry_logic", present: false },
      { id: "graceful_shutdown", present: true },
    ];

    const score = computeFeatureCompleteness(features);
    assert.strictEqual(score, 2 / 3);
  });

  await t.test("empty feature list returns 0", () => {
    const score = computeFeatureCompleteness([]);
    assert.strictEqual(score, 0);
  });
});

test("computeSuggestionScore", async (t) => {
  await t.test("high similarity and high health suggests adoption", () => {
    const score = computeSuggestionScore({
      totalSimilarity: 0.9,
      healthScore: 0.85,
      depSimilarity: 0.8,
    });

    assert.ok(score > 0.7, "High similarity and health should score high");
  });

  await t.test("applies weighted formula correctly", () => {
    const score = computeSuggestionScore({
      totalSimilarity: 1.0,
      healthScore: 1.0,
      depSimilarity: 1.0,
    });

    assert.ok(score >= 0.8, "Perfect inputs should yield high score");
  });

  await t.test("returns value between 0 and 1", () => {
    const score = computeSuggestionScore({
      totalSimilarity: 0.5,
      healthScore: 0.5,
      depSimilarity: 0.5,
    });

    assert.ok(score >= 0 && score <= 1, "Score should be between 0 and 1");
  });
});

test("buildRecommendation", async (t) => {
  await t.test("adopt when similarity > 0.85 and health > 0.70", () => {
    const rec = buildRecommendation({
      totalSimilarity: 0.9,
      healthScore: 0.75,
      repoUrl: "https://github.com/example/repo",
    });

    assert.strictEqual(rec.action, "adopt", "High similarity and health should suggest adoption");
  });

  await t.test("fork when similarity > 0.70 but health lower", () => {
    const rec = buildRecommendation({
      totalSimilarity: 0.75,
      healthScore: 0.65,
      repoUrl: "https://github.com/example/repo",
    });

    assert.strictEqual(rec.action, "fork", "Medium similarity should suggest fork");
  });

  await t.test("build when similarity low", () => {
    const rec = buildRecommendation({
      totalSimilarity: 0.6,
      healthScore: 0.5,
      repoUrl: "https://github.com/example/repo",
    });

    assert.strictEqual(rec.action, "build", "Low similarity should suggest building from scratch");
  });

  await t.test("includes reasoning", () => {
    const rec = buildRecommendation({
      totalSimilarity: 0.5,
      healthScore: 0.5,
      repoUrl: "https://github.com/example/repo",
    });

    assert.ok(rec.reasoning, "Recommendation should include reasoning");
  });
});

test("normalizeDeps", async (t) => {
  await t.test("strips versions", () => {
    const normalized = normalizeDeps(["pytest@7.0.0", "requests>=2.28.0"]);
    assert.ok(!normalized[0].includes("@"), "Should strip version specifiers");
  });

  await t.test("strips npm org scope", () => {
    const normalized = normalizeDeps(["@langchain/core", "@types/node"]);
    assert.ok(
      !normalized[0].includes("@"),
      "Should strip npm org scope from beginning"
    );
  });

  await t.test("lowercases names", () => {
    const normalized = normalizeDeps(["Pytest", "REQUESTS"]);
    assert.strictEqual(normalized[0], "pytest");
    assert.strictEqual(normalized[1], "requests");
  });

  await t.test("removes whitespace", () => {
    const normalized = normalizeDeps(["pytest  ", "  requests"]);
    assert.ok(!normalized[0].includes(" "));
    assert.ok(!normalized[1].includes(" "));
  });

  await t.test("deduplicates", () => {
    const normalized = normalizeDeps(["pytest", "pytest", "requests"]);
    assert.strictEqual(normalized.length, 2);
  });

  await t.test("returns empty array for empty input", () => {
    const normalized = normalizeDeps([]);
    assert.strictEqual(normalized.length, 0);
  });
});
