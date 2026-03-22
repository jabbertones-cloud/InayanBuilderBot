/**
 * Redis client module
 * Provides connection to Redis for caching, queues, and rate limiting
 */

const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    // Stop retrying after 20 attempts (prevents infinite storm in dev/test)
    if (times > 20) return null;
    return Math.min(times * 50, 2000);
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
