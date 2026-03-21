/**
 * POST /v1/similar
 * Fast path: search Qdrant directly, return similar repos with scores
 * Latency target: <100ms from cache
 */

const db = require('../../db');
const qdrant = require('../../lib/qdrant');

/**
 * POST /v1/similar handler
 */
module.exports = async (req, res) => {
  try {
    const { repo_url, k = 10 } = req.body;

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

    // Look up repo and get embedding
    const repoResult = await db.query(
      `SELECT id, full_name FROM repos WHERE full_name = $1`,
      [fullName],
    );

    if (repoResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'REPO_NOT_INDEXED',
          message: 'Repository not indexed',
        },
      });
    }

    const repo = repoResult.rows[0];

    // Get embedding from Qdrant
    const embedding = await qdrant.getRepoEmbedding(repo.id);

    if (!embedding) {
      return res.status(404).json({
        error: {
          code: 'NO_EMBEDDING',
          message: 'Repository has no embedding',
        },
      });
    }

    // Search similar repos
    const results = await qdrant.searchReadmeChunks(embedding, null, k + 1);

    // Filter out the query repo itself and take top k
    const similar = [];
    for (const hit of results) {
      if (hit.payload?.repo_id !== repo.id && similar.length < k) {
        similar.push({
          repo_id: hit.payload?.repo_id,
          similarity_score: parseFloat((hit.score || 0).toFixed(4)),
          full_name: hit.payload?.full_name,
          chunk_index: hit.payload?.chunk_index,
        });
      }
    }

    // Fetch full repo data for results
    if (similar.length > 0) {
      const repoIds = [...new Set(similar.map(s => s.repo_id))];
      const placeholders = repoIds.map((_, i) => `$${i + 1}`).join(',');
      const fullRepoResult = await db.query(
        `SELECT id, full_name, description, primary_language, license, stars, health_score
         FROM repos WHERE id IN (${placeholders})`,
        repoIds,
      );

      const repoMap = new Map(fullRepoResult.rows.map(r => [r.id, r]));

      for (const item of similar) {
        const fullRepo = repoMap.get(item.repo_id);
        if (fullRepo) {
          item.full_name = fullRepo.full_name;
          item.url = `https://github.com/${fullRepo.full_name}`;
          item.description = fullRepo.description;
          item.primary_language = fullRepo.primary_language;
          item.license = fullRepo.license;
          item.stars = fullRepo.stars;
          item.health_score = fullRepo.health_score;
        }
      }
    }

    // Log usage event
    await db.query(
      `INSERT INTO usage_events (api_key_id, endpoint, repo_url, cache_hit)
       VALUES ($1, $2, $3, $4)`,
      [req.apiKey.id, 'POST /v1/similar', normalizedUrl, false],
    );

    res.status(200).json({
      target_repo: {
        id: repo.id,
        full_name: repo.full_name,
      },
      similar: similar,
      meta: {
        k_requested: k,
        k_returned: similar.length,
      },
    });
  } catch (err) {
    console.error('[similar] Error:', err.message);
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
