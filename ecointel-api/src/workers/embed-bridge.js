const { Worker } = require("bullmq");
const axios = require("axios");
const { getConnection } = require("../db/index.js");

const logger = require("pino")();

const EMBED_SERVICE_URL = process.env.EMBED_SERVICE_URL || "http://localhost:4054";

// HTTP client for embed service
const embedClient = axios.create({
  baseURL: EMBED_SERVICE_URL,
  timeout: 300000, // 5 minute timeout for long embeds
});

// Main job handler
const worker = new Worker(
  "embed-queue",
  async (job) => {
    const { repo_id, readme_content } = job.data;
    const jobId = job.id;

    logger.info(
      { jobId, repo_id },
      "Starting embed bridge job"
    );

    const db = getConnection();

    try {
      // Health check embed service
      await embedClient.get("/health");
      logger.debug({ repo_id }, "Embed service health check passed");

      // Call embed service
      const response = await embedClient.post("/embed-repo", {
        repo_id: String(repo_id),
        readme: readme_content,
      });

      const { chunk_count, embedding_ids } = response.data;
      logger.info(
        { jobId, repo_id, chunk_count, embedding_ids: embedding_ids.length },
        "Embed service response received"
      );

      // Update repos table with embedding_id (first chunk)
      if (embedding_ids.length > 0) {
        await db.query(
          "UPDATE repos SET embedding_id = $1, embedding_chunks = $2, updated_at = NOW() WHERE id = $3",
          [embedding_ids[0], chunk_count, repo_id]
        );
        logger.info(
          { jobId, repo_id, embedding_id: embedding_ids[0] },
          "Updated repos with embedding_id"
        );
      }

      return { success: true, chunk_count, embedding_count: embedding_ids.length };
    } catch (error) {
      if (error.code === "ECONNREFUSED") {
        logger.error(
          { jobId, repo_id, url: EMBED_SERVICE_URL },
          "Embed service unavailable"
        );
        throw new Error(`Embed service not available at ${EMBED_SERVICE_URL}`);
      }

      logger.error({ jobId, repo_id, error }, "Embed bridge job failed");
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
    },
    concurrency: 2,
  }
);

worker.on("completed", (job, result) => {
  logger.debug({ jobId: job.id }, "Embed job completed");
});

worker.on("failed", (job, error) => {
  logger.error({ jobId: job.id, error }, "Embed job failed");
});

worker.on("error", (error) => {
  logger.error({ error }, "Worker error");
});

module.exports = worker;
