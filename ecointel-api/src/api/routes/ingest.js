/**
 * POST /v1/ingest
 * Trigger repo ingestion or return cached result if recent
 */

const db = require('../../db');
const { ingestQueue } = require('../../lib/queues');
const { v4: uuidv4 } = require('uuid');

/**
 * Normalize GitHub URL to standard format
 * Accepts: https://github.com/owner/repo, owner/repo, github.com/owner/repo
 * @param {string} input - URL or owner/repo
 * @returns {string} Normalized full URL
 */
function normalizeGitHubUrl(input) {
  if (!input) return null;

  let url = input.trim();

  // Remove protocol if present
  if (url.startsWith('https://')) {
    url = url.slice(8);
  }
  if (url.startsWith('http://')) {
    url = url.slice(7);
  }

  // Remove github.com/ prefix if present
  if (url.startsWith('github.com/')) {
    url = url.slice(11);
  }

  // Validate format is owner/repo
  const parts = url.split('/');
  if (parts.length < 2) {
    return null;
  }

  const owner = parts[0];
  const repo = parts[1].replace('.git', '');

  if (!owner || !repo) {
    return null;
  }

  return `https://github.com/${owner}/${repo}`;
}

/**
 * POST /v1/ingest handler
 */
module.exports = async (req, res) => {
  try {
    const { repo_url, priority = 'normal' } = req.body;

    // Validate input
    if (!repo_url) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'repo_url is required',
        },
      });
    }

    const normalizedUrl = normalizeGitHubUrl(repo_url);
    if (!normalizedUrl) {
      return res.status(400).json({
        error: {
          code: 'INVALID_URL',
          message: 'repo_url must be a valid GitHub URL',
        },
      });
    }

    // Extract owner/repo for db query
    const match = normalizedUrl.match(/github\.com\/([^/]+)\/(.+)/);
    const fullName = `${match[1]}/${match[2]}`;

    // Check if repo already indexed recently
    const existingResult = await db.query(
      `SELECT id, last_indexed_at FROM repos WHERE full_name = $1`,
      [fullName],
    );

    if (existingResult.rows.length > 0) {
      const repo = existingResult.rows[0];
      const lastIndexed = new Date(repo.last_indexed_at);
      const daysSince = (Date.now() - lastIndexed.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSince < 7) {
        // Cache hit: repo indexed recently
        console.log(`[ingest] Cache hit for ${fullName} (${daysSince.toFixed(1)} days old)`);

        // Log usage event
        await db.query(
          `INSERT INTO usage_events (api_key_id, endpoint, repo_url, cache_hit)
           VALUES ($1, $2, $3, $4)`,
          [req.apiKey.id, 'POST /v1/ingest', normalizedUrl, true],
        );

        return res.status(200).json({
          repo_id: repo.id,
          status: 'cached',
          last_indexed_at: lastIndexed.toISOString(),
          days_since_refresh: daysSince.toFixed(1),
        });
      }
    }

    // Need to ingest: create job
    const jobId = uuidv4();
    const priorityValue =
      priority === 'high' ? 1 : priority === 'low' ? 3 : 2;

    await db.query(
      `INSERT INTO ingest_jobs (id, repo_url, status, priority, requested_by_key)
       VALUES ($1, $2, $3, $4, $5)`,
      [jobId, normalizedUrl, 'queued', priorityValue, req.apiKey.id],
    );

    // Enqueue BullMQ job
    await ingestQueue.add(
      'ingest-repo',
      {
        repo_url: normalizedUrl,
        full_name: fullName,
        api_key_id: req.apiKey.id,
        job_id: jobId,
      },
      {
        jobId,
        priority: priorityValue,
      },
    );

    // Log usage event
    await db.query(
      `INSERT INTO usage_events (api_key_id, endpoint, repo_url, job_id, cache_hit)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.apiKey.id, 'POST /v1/ingest', normalizedUrl, jobId, false],
    );

    res.status(202).json({
      job_id: jobId,
      status: 'queued',
      estimated_seconds: 45,
      status_url: `/v1/jobs/${jobId}`,
    });
  } catch (err) {
    console.error('[ingest] Error:', err.message);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message,
      },
    });
  }
};
