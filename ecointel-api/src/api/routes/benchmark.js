/**
 * POST /v1/ecosystem/benchmark
 * Main endpoint: find similar repos with ecosystem intelligence (Phase 1 MVP)
 * Phase 1: meta similarity + readme embedding + dep Jaccard (5-component fusion in Phase 2)
 */

const db = require('../../db');
const qdrant = require('../../lib/qdrant');
const scoring = require('../../lib/scoring');
const { ingestQueue } = require('../../lib/queues');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /v1/ecosystem/benchmark handler
 */
module.exports = async (req, res) => {
  try {
    const {
      repo_url,
      category_hint,
      constraints = {},
      objective,
      k = 10,
      include_narrative = false,
    } = req.body;

    // Validate input
    if (!repo_url) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'repo_url is required',
        },
      });
    }

    if (k > 25) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'k must be <= 25',
        },
      });
    }

    // Normalize URL
    const normalizedUrl = normalizeGitHubUrl(repo_url);
    if (!normalizedUrl) {
      return res.status(400).json({
        error: {
          code: 'INVALID_URL',
          message: 'repo_url must be a valid GitHub URL',
        },
      });
    }

    const match = normalizedUrl.match(/github\.com\/([^/]+)\/(.+)/);
    const fullName = `${match[1]}/${match[2]}`;

    // Look up target repo
    const targetResult = await db.query(
      `SELECT id, full_name, feature_vector, deps_json, health_signals, health_score,
              integration_proxy, supply_chain, category_id, primary_language, license, archived
       FROM repos WHERE full_name = $1`,
      [fullName],
    );

    let targetRepo;

    if (targetResult.rows.length === 0) {
      // Repo not indexed: trigger ingest
      const jobId = uuidv4();
      await db.query(
        `INSERT INTO ingest_jobs (id, repo_url, status, priority, requested_by_key)
         VALUES ($1, $2, $3, $4, $5)`,
        [jobId, normalizedUrl, 'queued', 2, req.apiKey.id],
      );

      await ingestQueue.add(
        'ingest-repo',
        {
          repo_url: normalizedUrl,
          full_name: fullName,
          api_key_id: req.apiKey.id,
          job_id: jobId,
        },
        { jobId, priority: 2 },
      );

      return res.status(202).json({
        error: {
          code: 'REPO_NOT_INDEXED',
          message: 'Repository not yet indexed, ingestion started',
        },
        job_id: jobId,
        status_url: `/v1/jobs/${jobId}`,
      });
    }

    targetRepo = targetResult.rows[0];

    // Determine category: use hint if provided, else use repo's category
    let categoryId = category_hint;
    if (!categoryId && targetRepo.category_id) {
      categoryId = targetRepo.category_id;
    }

    // Fetch category and standard features if known
    let categoryRecord = null;
    let standardFeatures = [];

    if (categoryId) {
      const catResult = await db.query(
        `SELECT id, slug, name, feature_keys, weight_config FROM taxonomy_categories WHERE id = $1`,
        [categoryId],
      );

      if (catResult.rows.length > 0) {
        categoryRecord = catResult.rows[0];
        standardFeatures = categoryRecord.feature_keys || [];
      }
    }

    // Query Qdrant for similar repos
    let qdrantCandidates = [];
    try {
      const repoEmbedding = await qdrant.getRepoEmbedding(targetRepo.id);
      if (repoEmbedding) {
        qdrantCandidates = await qdrant.searchReadmeChunks(
          repoEmbedding,
          categoryId,
          50,
        );
      }
    } catch (err) {
      console.warn('[benchmark] Qdrant search warning:', err.message);
      qdrantCandidates = [];
    }

    // Extract candidate repo IDs from Qdrant results
    const candidateRepoIds = [];
    const qdrantScoreMap = {};

    for (const hit of qdrantCandidates) {
      const repoId = hit.payload?.repo_id;
      if (repoId && repoId !== targetRepo.id) {
        candidateRepoIds.push(repoId);
        qdrantScoreMap[repoId] = hit.score || 0;
      }
    }

    // Fetch candidate repos from DB
    let candidateRepos = [];
    if (candidateRepoIds.length > 0) {
      const placeholders = candidateRepoIds.map((_, i) => `$${i + 1}`).join(',');
      const candidateResult = await db.query(
        `SELECT id, full_name, description, primary_language, license, stars, archived,
                feature_vector, deps_json, health_signals, health_score, integration_proxy, supply_chain
         FROM repos WHERE id IN (${placeholders})`,
        candidateRepoIds,
      );
      candidateRepos = candidateResult.rows;
    }

    // Compute similarity breakdown for each candidate (Phase 1 MVP)
    const peers = [];

    for (const candidate of candidateRepos) {
      // Meta similarity
      const metaSim = scoring.computeMetaSimilarity(targetRepo, candidate);

      // Readme similarity from Qdrant
      const readmeSim = qdrantScoreMap[candidate.id] || 0;

      // Dependency Jaccard
      const depJaccard = scoring.computeDepJaccard(
        targetRepo.deps_json,
        candidate.deps_json,
      );

      // Feature completeness
      const featureCompleteness = scoring.computeFeatureCompleteness(
        candidate.feature_vector,
        standardFeatures,
      );

      // Health score from DB
      const healthScore = candidate.health_score || 0;

      // Total similarity (Phase 1: simple average)
      const similarityTotal = (metaSim + readmeSim + depJaccard) / 3;

      // Build peer object
      const peer = {
        repo_id: candidate.id,
        full_name: candidate.full_name,
        url: `https://github.com/${candidate.full_name}`,
        description: candidate.description,
        primary_language: candidate.primary_language,
        license: candidate.license,
        stars: candidate.stars,
        archived: candidate.archived,
        similarity_total: parseFloat(similarityTotal.toFixed(4)),
        similarity_breakdown: {
          meta: parseFloat(metaSim.toFixed(4)),
          readme: parseFloat(readmeSim.toFixed(4)),
          deps: parseFloat(depJaccard.toFixed(4)),
          features: parseFloat(featureCompleteness.toFixed(4)),
          health: parseFloat(healthScore.toFixed(4)),
        },
        feature_vector: candidate.feature_vector || {},
        health_score: parseFloat(healthScore.toFixed(4)),
        health_signals: candidate.health_signals || {},
        integration_proxy: candidate.integration_proxy || {},
        supply_chain: candidate.supply_chain || {},
        suggestion_score: 0, // Will be computed below
      };

      peers.push(peer);
    }

    // Apply constraints filtering
    const appliedConstraints = [];
    let filteredPeers = peers;

    if (constraints.license) {
      appliedConstraints.push(`license:${constraints.license}`);
      filteredPeers = filteredPeers.filter(
        (p) => p.license === constraints.license,
      );
    }

    if (constraints.primary_language) {
      appliedConstraints.push(`language:${constraints.primary_language}`);
      filteredPeers = filteredPeers.filter(
        (p) => p.primary_language === constraints.primary_language,
      );
    }

    if (constraints.exclude_archived !== false) {
      appliedConstraints.push('exclude_archived:true');
      filteredPeers = filteredPeers.filter((p) => !p.archived);
    }

    if (constraints.min_health_score !== undefined) {
      appliedConstraints.push(`min_health_score:${constraints.min_health_score}`);
      filteredPeers = filteredPeers.filter(
        (p) => p.health_score >= constraints.min_health_score,
      );
    }

    if (constraints.must_have_features && Array.isArray(constraints.must_have_features)) {
      appliedConstraints.push(`must_have_features:${constraints.must_have_features.join(',')}`);
      filteredPeers = filteredPeers.filter((p) => {
        for (const feature of constraints.must_have_features) {
          if (!p.feature_vector[feature]) {
            return false;
          }
        }
        return true;
      });
    }

    // Compute suggestion scores and rank
    const weights = categoryRecord?.weight_config || {
      similarity: 0.4,
      features: 0.4,
      health: 0.2,
    };

    for (const peer of filteredPeers) {
      peer.suggestion_score = parseFloat(
        scoring.computeSuggestionScore(peer, weights, standardFeatures).toFixed(4),
      );
    }

    filteredPeers.sort((a, b) => b.suggestion_score - a.suggestion_score);
    const topK = filteredPeers.slice(0, k);

    // Compute missing features vs standard
    const targetFeatures = new Set(
      Object.entries(targetRepo.feature_vector || {})
        .filter(([, v]) => v)
        .map(([k]) => k),
    );
    const standardSet = new Set(standardFeatures);
    const missingVsStandard = Array.from(standardSet).filter(
      (f) => !targetFeatures.has(f),
    );

    // Infeasibility reasons
    const infeasibilityReasons = [];
    if (topK.length === 0) {
      if (filteredPeers.length === 0 && peers.length > 0) {
        infeasibilityReasons.push('No peers match all constraints');
      } else if (peers.length === 0) {
        infeasibilityReasons.push('No similar peers found in index');
      }
    }

    // Find best peer
    const suggestedBestPeerIndex = topK.length > 0 ? 0 : -1;

    // Build recommendation
    let recommendation = null;
    if (topK.length > 0) {
      recommendation = scoring.buildRecommendation(topK[0], missingVsStandard);
    }

    // Peer aggregate stats
    const peerStats = {
      count: topK.length,
      avg_health_score: topK.length > 0
        ? parseFloat((topK.reduce((sum, p) => sum + p.health_score, 0) / topK.length).toFixed(3))
        : 0,
      avg_similarity: topK.length > 0
        ? parseFloat((topK.reduce((sum, p) => sum + p.similarity_total, 0) / topK.length).toFixed(3))
        : 0,
      median_stars: topK.length > 0
        ? topK.map(p => p.stars).sort((a, b) => a - b)[Math.floor(topK.length / 2)]
        : 0,
    };

    // Build response
    const response = {
      target_repo: {
        id: targetRepo.id,
        full_name: targetRepo.full_name,
        url: `https://github.com/${targetRepo.full_name}`,
      },
      category_id: categoryId,
      category: categoryRecord
        ? {
          id: categoryRecord.id,
          slug: categoryRecord.slug,
          name: categoryRecord.name,
        }
        : null,
      target_feature_vector: targetRepo.feature_vector || {},
      standard_features: standardFeatures,
      missing_vs_standard: missingVsStandard,
      peer_aggregate: peerStats,
      constraints_applied: appliedConstraints,
      infeasibility_reasons: infeasibilityReasons,
      peers: topK,
      suggested_best_peer_index: suggestedBestPeerIndex,
      recommendation,
      suggestion_formula:
        'suggestion_score = 0.4*similarity + 0.4*features + 0.2*health (Phase 1)',
      meta: {
        k_requested: k,
        k_returned: topK.length,
        total_candidates: peers.length,
        phase: 1,
        similarity_components: ['meta', 'readme_embedding', 'deps_jaccard'],
      },
    };

    if (include_narrative && topK.length > 0) {
      response.narrative = buildNarrative(topK[0], missingVsStandard, recommendation);
    }

    // Log usage event
    const endTime = Date.now();
    await db.query(
      `INSERT INTO usage_events (api_key_id, endpoint, repo_url, cache_hit, latency_ms)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.apiKey.id, 'POST /v1/ecosystem/benchmark', normalizedUrl, false, endTime - req.startTime],
    );

    res.status(200).json(response);
  } catch (err) {
    console.error('[benchmark] Error:', err.message);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message,
      },
    });
  }
};

/**
 * Helper: Normalize GitHub URL
 */
function normalizeGitHubUrl(input) {
  if (!input) return null;

  let url = input.trim();
  if (url.startsWith('https://')) url = url.slice(8);
  if (url.startsWith('http://')) url = url.slice(7);
  if (url.startsWith('github.com/')) url = url.slice(11);

  const parts = url.split('/');
  if (parts.length < 2) return null;

  const owner = parts[0];
  const repo = parts[1].replace('.git', '');

  if (!owner || !repo) return null;

  return `https://github.com/${owner}/${repo}`;
}

/**
 * Build human-readable narrative
 */
function buildNarrative(bestPeer, missingFeatures, recommendation) {
  const lines = [];

  lines.push(
    `Best match: ${bestPeer.full_name} (${bestPeer.stars} stars)`,
  );
  lines.push(
    `Similarity: ${(bestPeer.similarity_total * 100).toFixed(0)}%`,
  );
  lines.push(
    `Recommendation: ${recommendation.action.toUpperCase()}`,
  );

  if (missingFeatures.length > 0) {
    lines.push(
      `Missing features: ${missingFeatures.join(', ')}`,
    );
  }

  lines.push('');
  for (const reason of recommendation.reasons) {
    lines.push(`• ${reason}`);
  }

  return lines.join('\n');
}
