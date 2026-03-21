const { Worker } = require("bullmq");
const { getConnection } = require("../db/index.js");
const {
  computeMetaSimilarity,
  computeDepJaccard,
  computeHealthScore,
} = require("../lib/scoring.js");

const logger = require("pino")();

// Main job handler
const worker = new Worker(
  "score-queue",
  async (job) => {
    const { type, repo_id, category } = job.data;
    const jobId = job.id;

    logger.info(
      { jobId, type, repo_id },
      "Starting score job"
    );

    const db = getConnection();

    try {
      if (type === "compute_similarity") {
        return await handleComputeSimilarity(db, jobId, repo_id, category);
      } else if (type === "update_health") {
        return await handleUpdateHealth(db, jobId, repo_id);
      } else {
        throw new Error(`Unknown job type: ${type}`);
      }
    } catch (error) {
      logger.error({ jobId, type, repo_id, error }, "Score job failed");
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
    },
    concurrency: 4,
  }
);

// Compute similarity between source repo and candidates
async function handleComputeSimilarity(db, jobId, sourceRepoId, category) {
  logger.info(
    { jobId, sourceRepoId, category },
    "Computing similarity scores"
  );

  // Fetch source repo
  const sourceResult = await db.query(
    "SELECT id, full_name, language, stars FROM repos WHERE id = $1",
    [sourceRepoId]
  );

  if (sourceResult.rows.length === 0) {
    throw new Error(`Source repo not found: ${sourceRepoId}`);
  }

  const sourceRepo = sourceResult.rows[0];

  // Fetch source dependencies
  const sourceDepsResult = await db.query(
    "SELECT dep_name FROM repo_dependencies WHERE repo_id = $1",
    [sourceRepoId]
  );
  const sourceDeps = new Set(sourceDepsResult.rows.map((r) => r.dep_name));

  // Fetch candidate repos in same category (limit 200)
  const candidatesResult = await db.query(
    `
    SELECT id, full_name, language, stars, health_score
    FROM repos
    WHERE category = $1 AND id != $2 AND NOT archived
    ORDER BY stars DESC
    LIMIT 200
    `,
    [category || "ai-agent-frameworks", sourceRepoId]
  );

  const candidates = candidatesResult.rows;
  logger.info(
    { sourceRepoId, candidateCount: candidates.length },
    "Loaded candidates"
  );

  const similarityResults = [];

  for (const candidate of candidates) {
    // Fetch candidate dependencies
    const candDepsResult = await db.query(
      "SELECT dep_name FROM repo_dependencies WHERE repo_id = $1",
      [candidate.id]
    );
    const candDeps = new Set(candDepsResult.rows.map((r) => r.dep_name));

    // Compute scores
    const metaScore = computeMetaSimilarity(
      sourceRepo.language,
      candidate.language
    );

    const depScore = computeDepJaccard(
      Array.from(sourceDeps),
      Array.from(candDeps)
    );

    // Placeholder scores for Phase 2
    const readmeScore = 0.5;
    const structScore = 0.5;
    const featScore = 0.5;

    // Weighted fusion
    const weights = {
      meta: 0.15,
      readme: 0.25,
      deps: 0.25,
      struct: 0.1,
      feat: 0.25,
    };

    const totalScore =
      weights.meta * metaScore +
      weights.readme * readmeScore +
      weights.deps * depScore +
      weights.struct * structScore +
      weights.feat * featScore;

    similarityResults.push({
      sourceId: sourceRepoId,
      targetId: candidate.id,
      totalScore,
      metaScore,
      depScore,
      readmeScore,
      structScore,
      featScore,
    });
  }

  // Sort by total score and keep top 25
  const topResults = similarityResults
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 25);

  logger.info({ sourceRepoId, topCount: topResults.length }, "Top results");

  // Upsert into similarity_cache
  const weightVersion = process.env.WEIGHT_VERSION || "v1.0";

  for (const result of topResults) {
    await db.query(
      `
      INSERT INTO similarity_cache (
        source_repo_id, target_repo_id, total_score, meta_score, dep_score,
        readme_score, struct_score, feat_score, weight_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (source_repo_id, target_repo_id, weight_version)
      DO UPDATE SET
        total_score = $3,
        meta_score = $4,
        dep_score = $5,
        readme_score = $6,
        struct_score = $7,
        feat_score = $8,
        updated_at = NOW()
      `,
      [
        result.sourceId,
        result.targetId,
        result.totalScore,
        result.metaScore,
        result.depScore,
        result.readmeScore,
        result.structScore,
        result.featScore,
        weightVersion,
      ]
    );
  }

  // Build contrast cache: dep additions and removals
  for (const result of topResults) {
    const sourceResult = await db.query(
      "SELECT dep_name FROM repo_dependencies WHERE repo_id = $1",
      [result.sourceId]
    );
    const targetResult = await db.query(
      "SELECT dep_name FROM repo_dependencies WHERE repo_id = $1",
      [result.targetId]
    );

    const sourceDepsSet = new Set(sourceResult.rows.map((r) => r.dep_name));
    const targetDepsSet = new Set(targetResult.rows.map((r) => r.dep_name));

    const depAdds = Array.from(targetDepsSet).filter((d) => !sourceDepsSet.has(d));
    const depRemoves = Array.from(sourceDepsSet).filter((d) => !targetDepsSet.has(d));

    const featureXor = JSON.stringify({}); // Placeholder for Phase 2

    await db.query(
      `
      INSERT INTO contrast_cache (
        source_repo_id, target_repo_id, dep_adds, dep_removes, feature_xor
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (source_repo_id, target_repo_id)
      DO UPDATE SET
        dep_adds = $3,
        dep_removes = $4,
        feature_xor = $5,
        updated_at = NOW()
      `,
      [
        result.sourceId,
        result.targetId,
        JSON.stringify(depAdds),
        JSON.stringify(depRemoves),
        featureXor,
      ]
    );
  }

  logger.info(
    { jobId, sourceRepoId, cacheCount: topResults.length },
    "Similarity computation complete"
  );

  return { success: true, similarityCount: topResults.length };
}

// Update health score for a repo
async function handleUpdateHealth(db, jobId, repoId) {
  logger.info({ jobId, repoId }, "Updating health score");

  // Fetch repo
  const repoResult = await db.query(
    `
    SELECT
      id, full_name, stars, forks, open_issues_count,
      issue_response_velocity, contributor_count, archived,
      pushed_at, created_at
    FROM repos
    WHERE id = $1
    `,
    [repoId]
  );

  if (repoResult.rows.length === 0) {
    throw new Error(`Repo not found: ${repoId}`);
  }

  const repo = repoResult.rows[0];

  // Compute health score
  const healthScore = computeHealthScore(repo);

  // Update repos table
  await db.query(
    "UPDATE repos SET health_score = $1, updated_at = NOW() WHERE id = $2",
    [healthScore, repoId]
  );

  logger.info(
    { jobId, repoId, healthScore },
    "Health score updated"
  );

  return { success: true, healthScore };
}

worker.on("completed", (job, result) => {
  logger.debug({ jobId: job.id }, "Score job completed");
});

worker.on("failed", (job, error) => {
  logger.error({ jobId: job.id, error }, "Score job failed");
});

worker.on("error", (error) => {
  logger.error({ error }, "Worker error");
});

module.exports = worker;
