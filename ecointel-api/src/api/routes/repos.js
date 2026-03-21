/**
 * GET /v1/repos/:id - Fetch repo details
 * GET /v1/repos/:id/peers - Fetch similar peers from cache
 */

const db = require('../../db');

/**
 * GET /v1/repos/:id handler
 */
async function getRepo(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'id parameter required',
        },
      });
    }

    const result = await db.query(
      `SELECT id, github_id, full_name, url, description, primary_language, languages_json,
              license, stars, forks, open_issues, default_branch, created_at, pushed_at, archived,
              category_id, category_confidence, feature_vector, health_score, health_signals,
              deps_json, integration_proxy, supply_chain, last_indexed_at, index_version
       FROM repos WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'REPO_NOT_FOUND',
          message: `Repo ${id} not found`,
        },
      });
    }

    const repo = result.rows[0];

    const response = {
      id: repo.id,
      github_id: repo.github_id,
      full_name: repo.full_name,
      url: repo.url,
      description: repo.description,
      primary_language: repo.primary_language,
      languages: repo.languages_json || {},
      license: repo.license,
      stars: repo.stars,
      forks: repo.forks,
      open_issues: repo.open_issues,
      default_branch: repo.default_branch,
      created_at: repo.created_at.toISOString(),
      pushed_at: repo.pushed_at?.toISOString(),
      archived: repo.archived,
      category_id: repo.category_id,
      category_confidence: repo.category_confidence,
      feature_vector: repo.feature_vector || {},
      health_score: repo.health_score,
      health_signals: repo.health_signals || {},
      dependencies: repo.deps_json || {},
      integration_proxy: repo.integration_proxy || {},
      supply_chain: repo.supply_chain || {},
      last_indexed_at: repo.last_indexed_at?.toISOString(),
      index_version: repo.index_version,
    };

    // Log usage event
    await db.query(
      `INSERT INTO usage_events (api_key_id, endpoint, repo_url)
       VALUES ($1, $2, $3)`,
      [req.apiKey.id, 'GET /v1/repos/:id', repo.url],
    );

    res.status(200).json(response);
  } catch (err) {
    console.error('[repos] getRepo error:', err.message);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message,
      },
    });
  }
}

/**
 * GET /v1/repos/:id/peers handler
 */
async function getPeers(req, res) {
  try {
    const { id } = req.params;
    const k = parseInt(req.query.k || '10', 10);

    if (!id) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'id parameter required',
        },
      });
    }

    if (k > 100) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'k must be <= 100',
        },
      });
    }

    // Check repo exists
    const repoResult = await db.query(
      `SELECT id, full_name FROM repos WHERE id = $1`,
      [id],
    );

    if (repoResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'REPO_NOT_FOUND',
          message: `Repo ${id} not found`,
        },
      });
    }

    const repo = repoResult.rows[0];

    // Fetch similar repos from cache
    const cacheResult = await db.query(
      `SELECT similarity_cache.similarity_total, similarity_cache.similarity_breakdown,
              similarity_cache.computed_at,
              repos.id, repos.full_name, repos.url, repos.primary_language, repos.license,
              repos.stars, repos.health_score
       FROM similarity_cache
       JOIN repos ON similarity_cache.target_repo_id = repos.id
       WHERE similarity_cache.source_repo_id = $1
       ORDER BY similarity_cache.similarity_total DESC
       LIMIT $2`,
      [id, k],
    );

    const peers = cacheResult.rows.map((row) => ({
      repo_id: row.id,
      full_name: row.full_name,
      url: row.url,
      primary_language: row.primary_language,
      license: row.license,
      stars: row.stars,
      health_score: parseFloat(row.health_score || 0),
      similarity_total: parseFloat(row.similarity_total),
      similarity_breakdown: row.similarity_breakdown || {},
      computed_at: row.computed_at?.toISOString(),
    }));

    // Log usage event
    await db.query(
      `INSERT INTO usage_events (api_key_id, endpoint, repo_url)
       VALUES ($1, $2, $3)`,
      [req.apiKey.id, 'GET /v1/repos/:id/peers', repo.full_name],
    );

    res.status(200).json({
      source_repo: {
        id: repo.id,
        full_name: repo.full_name,
      },
      peers,
      meta: {
        k_requested: k,
        k_returned: peers.length,
      },
    });
  } catch (err) {
    console.error('[repos] getPeers error:', err.message);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message,
      },
    });
  }
}

module.exports = {
  getRepo,
  getPeers,
};
