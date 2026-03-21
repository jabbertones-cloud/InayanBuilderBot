/**
 * GET /v1/jobs/:id
 * Retrieve status and progress of an ingest job
 */

const db = require('../../db');

/**
 * Map status to progress percentage
 * @param {string} status - Job status
 * @returns {number} Progress percentage
 */
function mapStatusToProgress(status) {
  switch (status) {
    case 'queued':
      return 5;
    case 'processing':
      return 50;
    case 'done':
      return 100;
    case 'failed':
      return 0;
    default:
      return 0;
  }
}

/**
 * GET /v1/jobs/:id handler
 */
module.exports = async (req, res) => {
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
      `SELECT id, repo_url, status, attempts, last_error, created_at, completed_at
       FROM ingest_jobs
       WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'JOB_NOT_FOUND',
          message: `Job ${id} not found`,
        },
      });
    }

    const job = result.rows[0];
    const progressPct = mapStatusToProgress(job.status);

    const response = {
      id: job.id,
      status: job.status,
      progress_pct: progressPct,
      repo_url: job.repo_url,
      attempts: job.attempts,
      created_at: job.created_at.toISOString(),
    };

    if (job.completed_at) {
      response.completed_at = job.completed_at.toISOString();
    }

    if (job.last_error) {
      response.error = job.last_error;
    }

    // Log usage event
    await db.query(
      `INSERT INTO usage_events (api_key_id, endpoint, job_id)
       VALUES ($1, $2, $3)`,
      [req.apiKey.id, 'GET /v1/jobs/:id', job.id],
    );

    res.status(200).json(response);
  } catch (err) {
    console.error('[jobs] Error:', err.message);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message,
      },
    });
  }
};
