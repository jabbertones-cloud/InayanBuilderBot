/**
 * BullMQ Queue instances and configuration
 * Manages job queues for ingest, parse, embed, and score operations
 */

const { Queue } = require('bullmq');
const { redis } = require('./redis');

const defaultJobOptions = {
  removeOnComplete: 100,
  removeOnFail: 200,
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
};

/**
 * Ingest queue: GitHub repo metadata fetching
 */
const ingestQueue = new Queue('ingest', {
  connection: redis,
  defaultJobOptions,
});

/**
 * Parse queue: Extract dependencies and metadata from source
 */
const parseQueue = new Queue('parse', {
  connection: redis,
  defaultJobOptions,
});

/**
 * Embed queue: Generate embeddings for readme chunks and feature summaries
 */
const embedQueue = new Queue('embed', {
  connection: redis,
  defaultJobOptions,
});

/**
 * Score queue: Compute health scores and feature completeness
 */
const scoreQueue = new Queue('score', {
  connection: redis,
  defaultJobOptions,
});

// Graceful shutdown handlers
async function closeQueues() {
  await Promise.all([
    ingestQueue.close(),
    parseQueue.close(),
    embedQueue.close(),
    scoreQueue.close(),
  ]);
}

process.on('SIGTERM', async () => {
  console.log('[queues] SIGTERM received, closing queues...');
  await closeQueues();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[queues] SIGINT received, closing queues...');
  await closeQueues();
  process.exit(0);
});

module.exports = {
  ingestQueue,
  parseQueue,
  embedQueue,
  scoreQueue,
  closeQueues,
};
