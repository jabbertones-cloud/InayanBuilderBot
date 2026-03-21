/**
 * Redis client module
 * Provides connection to Redis for caching, queues, and rate limiting
 */

const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('[redis] Connected');
});

redis.on('ready', () => {
  console.log('[redis] Ready');
});

redis.on('error', (err) => {
  console.error('[redis] Error:', err.message);
});

redis.on('reconnecting', () => {
  console.log('[redis] Reconnecting...');
});

module.exports = {
  redis,
};
