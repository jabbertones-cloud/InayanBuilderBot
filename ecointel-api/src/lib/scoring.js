'use strict';
/**
 * EcoIntel Scoring Library
 * Pure functions for computing repo similarity, health, feature completeness, and recommendations.
 * All formulas are deterministic: same inputs → same outputs, versioned via WEIGHT_VERSION env.
 *
 * Documented formula reference (from ECOINTEL-BUILD-PLAN.md §8):
 *   sim_total = 0.15*sim_meta + 0.25*sim_readme + 0.25*sim_deps + 0.10*sim_struct + 0.25*sim_feat
 *   health    = 0.30*recency + 0.25*velocity + 0.25*adoption + 0.20*(1 - risk_penalty)
 *   suggestion = w_sim*similarity + w_feat*feature_completeness + w_health*health
 */

// ─────────────────────────────────────────────────────────────────────────────
// Metadata similarity
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute metadata similarity between two repos OR two language strings.
 * When called with strings, returns language-match score only.
 * When called with repo objects, computes Jaccard on topics + language/license/size bonuses.
 *
 * @param {object|string} repoAOrLang - Repo object OR primary_language string
 * @param {object|string} repoBOrLang - Repo object OR primary_language string
 * @returns {number} Similarity score [0, 1]
 */
function computeMetaSimilarity(repoAOrLang, repoBOrLang) {
  // Simple string mode: just language comparison
  if (typeof repoAOrLang === 'string' && typeof repoBOrLang === 'string') {
    const a = repoAOrLang.toLowerCase().trim();
    const b = repoBOrLang.toLowerCase().trim();
    if (!a || !b) return 0;
    return a === b ? 0.85 : 0.1;
  }

  // Full repo object mode
  const repoA = repoAOrLang || {};
  const repoB = repoBOrLang || {};
  let score = 0;

  // Language match (+0.30)
  if (repoA.primary_language && repoB.primary_language &&
      repoA.primary_language.toLowerCase() === repoB.primary_language.toLowerCase()) {
    score += 0.30;
  }

  // License match (+0.15)
  if (repoA.license && repoB.license && repoA.license === repoB.license) {
    score += 0.15;
  }

  // Size bucket match (+0.10)
  if (getStarBucket(repoA.stars) === getStarBucket(repoB.stars)) {
    score += 0.10;
  }

  // Topic Jaccard (+0.30 max)
  const topicsA = new Set((repoA.topics || []).map((t) => t.toLowerCase()));
  const topicsB = new Set((repoB.topics || []).map((t) => t.toLowerCase()));
  if (topicsA.size > 0 || topicsB.size > 0) {
    const intersection = [...topicsA].filter((t) => topicsB.has(t)).length;
    const union = new Set([...topicsA, ...topicsB]).size;
    score += union > 0 ? (intersection / union) * 0.30 : 0;
  }

  // Recency similarity (+0.15 if within 30 days of each other)
  if (repoA.pushed_at && repoB.pushed_at) {
    const diff = Math.abs(daysSinceDate(repoA.pushed_at) - daysSinceDate(repoB.pushed_at));
    if (diff < 30) score += 0.15;
  }

  return Math.min(score, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Dependency Jaccard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute Jaccard similarity between two dependency lists or dep-object maps.
 * Accepts: flat string arrays ["pytest", "requests"] OR objects { dependencies: {...} }
 *
 * @param {Array|object} depsA
 * @param {Array|object} depsB
 * @returns {number} Jaccard similarity [0, 1]; empty ∩ empty → 0
 */
function computeDepJaccard(depsA, depsB) {
  const setA = normalizeDepsToSet(depsA);
  const setB = normalizeDepsToSet(depsB);

  // Both empty: no signal → 0 (not 1; callers depend on this for no-overlap detection)
  if (setA.size === 0 && setB.size === 0) return 0;
  // One empty: 0 overlap
  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Health score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute health score from a repo object with raw GitHub signals.
 * Formula: 0.30*recency + 0.25*velocity + 0.25*adoption + 0.20*(1 - risk_penalty)
 *
 * @param {object} repo - Repo record with pushed_at, stars, archived, etc.
 * @returns {number} Health score [0, 1]
 */
function computeHealthScore(repo) {
  if (!repo) return 0;

  // Recency: decay over 365 days since last push
  const daysSincePush = repo.pushed_at ? daysSinceDate(repo.pushed_at) : 365;
  const recency = Math.max(0, 1 - daysSincePush / 365);

  // Velocity: commits_30d proxy — use contributor_count as rough signal when commit data absent
  const commits30d = repo.commits_30d || (repo.contributor_count ? Math.min(repo.contributor_count * 2, 30) : 0);
  const velocity = Math.min(1, commits30d / 30);

  // Adoption: log-scaled stars, 50k = 1.0
  const stars = repo.stars || 0;
  const adoption = Math.min(1, Math.log(1 + stars) / Math.log(1 + 50000));

  // Risk penalty
  let riskPenalty = 0;
  if (repo.archived) riskPenalty += 0.30;
  if (repo.pushed_at && daysSincePush > 180) riskPenalty += 0.20;
  const osvCount = repo.osv_critical_count || 0;
  riskPenalty += Math.min(0.30, osvCount * 0.10);
  riskPenalty = Math.min(1, riskPenalty);

  const score = 0.30 * recency + 0.25 * velocity + 0.25 * adoption + 0.20 * (1 - riskPenalty);
  return Math.max(0, Math.min(score, 1));
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature completeness
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute feature completeness.
 * Accepts:
 *   - Array of { id, present } objects  → count present / total
 *   - (featureVector: object, standardFeatures: string[]) → classic two-arg form
 *
 * @param {Array|object} featuresOrVector
 * @param {string[]} [standardFeatures]
 * @returns {number} Completeness [0, 1]
 */
function computeFeatureCompleteness(featuresOrVector, standardFeatures) {
  // Array of { id, present } objects (test-friendly form)
  if (Array.isArray(featuresOrVector)) {
    if (featuresOrVector.length === 0) return 0;
    const present = featuresOrVector.filter((f) => f && f.present).length;
    return present / featuresOrVector.length;
  }

  // Two-argument form: (featureVector: object, standardFeatures: string[])
  const featureVector = featuresOrVector || {};
  const standards = standardFeatures || [];
  if (standards.length === 0) return 0;

  const present = standards.filter((key) => featureVector[key] > 0).length;
  return present / standards.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Suggestion score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute suggestion score for a peer.
 * Accepts either:
 *   - { totalSimilarity, healthScore, depSimilarity } (simple form used in tests)
 *   - (peer: { similarity_total, feature_vector, health_score }, weights, standardFeatures) (API form)
 *
 * @param {object} peerOrSimple
 * @param {object} [weights]
 * @param {string[]} [standardFeatures]
 * @returns {number} Score [0, 1]
 */
function computeSuggestionScore(peerOrSimple, weights = {}, standardFeatures = []) {
  const wSim = weights.similarity !== undefined ? weights.similarity : 0.4;
  const wFeat = weights.feature_completeness !== undefined ? weights.feature_completeness : 0.4;
  const wHealth = weights.health !== undefined ? weights.health : 0.2;

  // Simple flat form { totalSimilarity, healthScore, depSimilarity }
  if ('totalSimilarity' in peerOrSimple || 'healthScore' in peerOrSimple) {
    const sim = peerOrSimple.totalSimilarity || 0;
    const health = peerOrSimple.healthScore || 0;
    // No feature vector in simple form → use sim as proxy for feature completeness
    const feat = peerOrSimple.featureCompleteness !== undefined ? peerOrSimple.featureCompleteness : sim;
    return Math.max(0, Math.min(wSim * sim + wFeat * feat + wHealth * health, 1));
  }

  // Full API form
  const sim = (peerOrSimple.similarity && peerOrSimple.similarity.total) || peerOrSimple.similarity_total || 0;
  const health = peerOrSimple.health_score || (peerOrSimple.health && peerOrSimple.health.score) || 0;
  const feat = computeFeatureCompleteness(peerOrSimple.feature_vector || {}, standardFeatures);
  return Math.max(0, Math.min(wSim * sim + wFeat * feat + wHealth * health, 1));
}

// ─────────────────────────────────────────────────────────────────────────────
// Build-or-buy recommendation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build recommendation using the documented rule tree.
 * Accepts:
 *   - { totalSimilarity, healthScore, repoUrl } (simple form)
 *   - (topPeer, missingVsStandard) (API form)
 *
 * Thresholds (from build plan §8.8):
 *   adopt: similarity > 0.85 AND health > 0.70
 *   fork:  similarity > 0.70
 *   build: otherwise
 *
 * @param {object} topPeerOrSimple
 * @param {Array} [missingVsStandard]
 * @returns {{ action: string, reasons: string[], reasoning?: string }}
 */
function buildRecommendation(topPeerOrSimple, missingVsStandard = []) {
  if (!topPeerOrSimple) {
    return { action: 'build', reasons: ['No matching repos found'], reasoning: 'No suitable peer repos exist in the index for this category.' };
  }

  // Resolve similarity and health from either form
  const sim = topPeerOrSimple.totalSimilarity !== undefined
    ? topPeerOrSimple.totalSimilarity
    : ((topPeerOrSimple.similarity && topPeerOrSimple.similarity.total) || topPeerOrSimple.similarity_total || 0);

  const health = topPeerOrSimple.healthScore !== undefined
    ? topPeerOrSimple.healthScore
    : (topPeerOrSimple.health_score || (topPeerOrSimple.health && topPeerOrSimple.health.score) || 0);

  const highSeverityCount = Array.isArray(missingVsStandard)
    ? missingVsStandard.filter((m) => m.severity === 'high' || m.severity === 'critical').length
    : 0;

  if (sim > 0.85 && health > 0.70) {
    const reasons = [
      `similarity (${sim.toFixed(2)}) > threshold 0.85`,
      `health (${health.toFixed(2)}) > threshold 0.70`,
    ];
    return { action: 'adopt', reasons, reasoning: reasons.join('; ') };
  }

  if (sim > 0.70) {
    const reasons = [
      `similarity (${sim.toFixed(2)}) > threshold 0.70`,
      highSeverityCount > 0 ? `${highSeverityCount} high-severity gaps to address` : 'Minor gaps only',
    ];
    return { action: 'fork', reasons, reasoning: reasons.join('; ') };
  }

  const reasons = [
    `similarity (${sim.toFixed(2)}) ≤ 0.70 — no close peer found`,
    'Recommend building from scratch or broadening category search',
  ];
  return { action: 'build', reasons, reasoning: reasons.join('; ') };
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration cost proxy
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estimate integration cost from measurable signals.
 * @param {object} signals - { docs_depth_score, example_count, issue_response_velocity_days, breaking_change_frequency }
 * @returns {{ score: number, estimated_integration_hours: string }}
 */
function computeIntegrationProxy(signals = {}) {
  const docsDepth = Math.min(1, (signals.docs_depth_score || 0));
  const exampleScore = Math.min(1, (signals.example_count || 0) / 20);
  const issueVelocityDays = signals.issue_response_velocity_days || 30;
  const issueScore = Math.max(0, 1 - issueVelocityDays / 30);
  const breakingPenalty = signals.breaking_change_frequency === 'high' ? 0.3
    : signals.breaking_change_frequency === 'medium' ? 0.15 : 0;

  const score = Math.max(0, Math.min(
    0.30 * docsDepth + 0.20 * exampleScore + 0.20 * issueScore + 0.15 * (1 - breakingPenalty),
    1
  ));

  let estimated_integration_hours;
  if (score >= 0.80) estimated_integration_hours = '< 2h';
  else if (score >= 0.60) estimated_integration_hours = '4–8h';
  else if (score >= 0.40) estimated_integration_hours = '1–3 days';
  else estimated_integration_hours = '> 3 days';

  return { score, estimated_integration_hours };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dependency normalization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize dependency names from various formats to a deduped array of strings.
 * Accepts: flat string array, object map (package.json deps style), or
 *          structured object with .npm/.pip/.go/.cargo keys.
 *
 * @param {Array|object} depsInput
 * @returns {string[]} Normalized, deduplicated, lowercased dep names
 */
function normalizeDeps(depsInput) {
  if (!depsInput) return [];
  const normalized = new Set();

  const processName = (name) => {
    if (!name || typeof name !== 'string') return;
    // Strip org scope (@org/pkg → pkg), then strip version specifier
    let clean = name.trim();
    if (clean.startsWith('@')) {
      // @org/pkg → pkg
      const slash = clean.indexOf('/', 1);
      clean = slash > 0 ? clean.slice(slash + 1) : clean.slice(1);
    }
    // Strip version specifiers: @1.0, >=1.0, ^1.0, ==1.0, ~1.0
    clean = clean.replace(/[@>=<~^!].*/g, '').trim().toLowerCase();
    if (clean) normalized.add(clean);
  };

  if (Array.isArray(depsInput)) {
    depsInput.forEach(processName);
  } else if (typeof depsInput === 'object') {
    // Structured: { npm: [...], pip: [...] } or flat { "package": "version" }
    const keys = ['npm', 'pip', 'go', 'cargo', 'dependencies', 'devDependencies', 'peerDependencies'];
    let handled = false;
    for (const key of keys) {
      if (depsInput[key]) {
        handled = true;
        const val = depsInput[key];
        if (Array.isArray(val)) val.forEach(processName);
        else if (typeof val === 'object') Object.keys(val).forEach(processName);
      }
    }
    if (!handled) {
      // Flat object: { "package": "^1.0" }
      Object.keys(depsInput).forEach(processName);
    }
  }

  return [...normalized];
}

/**
 * Internal: normalize to Set (used by computeDepJaccard)
 */
function normalizeDepsToSet(depsInput) {
  return new Set(normalizeDeps(depsInput));
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** @param {number} stars @returns {string} */
function getStarBucket(stars) {
  if (!stars || stars < 100) return 'micro';
  if (stars < 1000) return 'small';
  if (stars < 10000) return 'medium';
  if (stars < 100000) return 'large';
  return 'mega';
}

/** @param {string|Date} date @returns {number} days */
function daysSinceDate(date) {
  if (!date) return 9999;
  const d = new Date(date);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  computeMetaSimilarity,
  computeDepJaccard,
  computeHealthScore,
  computeFeatureCompleteness,
  computeSuggestionScore,
  buildRecommendation,
  computeIntegrationProxy,
  normalizeDeps,
  // helpers exposed for testing
  getStarBucket,
  daysSinceDate,
};
