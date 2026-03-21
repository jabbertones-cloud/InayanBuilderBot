#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { getConnection } = require("../src/db/index.js");
const { ingestQueue } = require("../src/lib/queues.js");

const logger = require("pino")();

// Parse CLI arguments
const dryRun = process.argv.includes("--dry-run");

async function loadSeedRepos() {
  const seedPath = path.join(__dirname, "seed-repos.json");

  if (!fs.existsSync(seedPath)) {
    logger.error({ seedPath }, "Seed file not found");
    process.exit(1);
  }

  const seedData = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
  logger.info({ repoCount: seedData.length }, "Loaded seed repos");

  if (dryRun) {
    logger.info("DRY RUN MODE - no writes will be performed");
  }

  const db = getConnection();

  for (let i = 0; i < seedData.length; i++) {
    const repo = seedData[i];
    const { full_name, url, stars, category, primary_language, license } = repo;

    logger.info(
      { index: i + 1, total: seedData.length, full_name },
      "Processing repo"
    );

    try {
      if (!dryRun) {
        // Insert placeholder repo row
        await db.query(
          `
          INSERT INTO repos (
            full_name, url, category, primary_language, license,
            stars, language, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (full_name) DO UPDATE SET
            stars = $6,
            updated_at = NOW()
          RETURNING id
          `,
          [full_name, url, category, primary_language, license, stars, primary_language]
        );

        // Enqueue ingest job
        const [owner, repoName] = full_name.split("/");
        const jobId = `ingest_${full_name.replace("/", "_")}_${Date.now()}`;

        const ingestJob = await ingestQueue.add(
          "ingest_repo",
          {
            owner,
            repo: repoName,
            full_name,
            url,
          },
          {
            jobId,
            priority: 1, // Background priority
          }
        );

        // Insert ingest_job record
        await db.query(
          `
          INSERT INTO ingest_jobs (id, full_name, status, created_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (id) DO NOTHING
          `,
          [jobId, full_name, "queued"]
        );

        logger.info(
          { full_name, jobId },
          "Enqueued ingest job"
        );
      } else {
        logger.info(
          { full_name },
          "[DRY RUN] Would enqueue ingest job"
        );
      }
    } catch (error) {
      logger.error(
        { full_name, error },
        "Failed to process repo"
      );
    }
  }

  logger.info({ dryRun, total: seedData.length }, "Seed loading complete");
  process.exit(0);
}

loadSeedRepos().catch((error) => {
  logger.error({ error }, "Fatal error in seed loader");
  process.exit(1);
});
