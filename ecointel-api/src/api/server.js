/**
 * EcoIntel API — Express server with middleware and route handlers
 */

require('dotenv').config();

const express = require('express');
const crypto = require('crypto');
const { redis } = require('../lib/redis');
const db = require('../db');
const bcrypt = require('bcrypt');

const app = express();
const PORT = parseInt(process.env.PORT || '4052', 10);

// Middleware

app.use(express.json({ limit: '10mb' }));

/**
 * Request logging middleware
 */
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - start;
    console.log(
      `[${req.method}] ${req.path} → ${res.statusCode} (${duration}ms)`,
    );
    originalSend.call(this, data);
  };

  next();
});

/**
 * API key authentication middleware
 * Reads X-API-Key header, validates against api_keys table
 */
app.use(async (req, res, next) => {
  // Skip auth for health check
  if (req.path === '/health') {
    return next();
  }

  const apiKeyHeader = req.headers['x-api-key'];

  if (!apiKeyHeader) {
    return res.status(401).json({
      error: {
        code: 'MISSING_API_KEY',
        message: 'X-API-Key header required',
      },
    });
  }

  try {
    // Fast O(1) lookup via SHA-256 hash, then single bcrypt verify on the match.
    // key_lookup_hash = SHA-256(raw_key) stored at key-creation time.
    const lookupHash = crypto
      .createHash('sha256')
      .update(apiKeyHeader)
      .digest('hex');

    const result = await db.query(
      `SELECT id, key_hash, label, tier, quota_monthly, quota_used, quota_reset_at, revoked_at
       FROM api_keys
       WHERE key_lookup_hash = $1
         AND revoked_at IS NULL
       LIMIT 1`,
      [lookupHash],
    );

    let matchedKey = null;

    if (result.rows.length > 0) {
      const row = result.rows[0];
      try {
        const isMatch = await bcrypt.compare(apiKeyHeader, row.key_hash);
        if (isMatch) matchedKey = row;
      } catch (err) {
        console.error('[auth] Bcrypt compare error:', err.message);
      }
    }

    if (!matchedKey) {
      return res.status(401).json({
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid or revoked API key',
        },
      });
    }

    req.apiKey = matchedKey;
    next();
  } catch (err) {
    console.error('[auth] Error:', err.message);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication error',
      },
    });
  }
});

/**
 * Rate limiting middleware
 */
app.use(async (req, res, next) => {
  if (req.path === '/health') {
    return next();
  }

  try {
    const keyId = req.apiKey.id;
    const now = new Date();
    const minute = Math.floor(now.getTime() / 60000);
    const bucketKey = `ratelimit:${keyId}:${minute}`;

    const tierLimits = {
      free: 10,
      developer: 60,
      usage: 300,
      enterprise: Number.MAX_SAFE_INTEGER,
    };

    const limit = tierLimits[req.apiKey.tier] || 10;
    const current = await redis.incr(bucketKey);

    if (current === 1) {
      await redis.expire(bucketKey, 60);
    }

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current));
    res.setHeader('X-RateLimit-Reset', new Date((minute + 1) * 60000).toISOString());

    if (current > limit) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit of ${limit} requests/minute exceeded`,
        },
      });
    }

    next();
  } catch (err) {
    console.error('[ratelimit] Error:', err.message);
    next();
  }
});

// Routes

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

/**
 * Ingest route
 */
const ingestRoute = require('./routes/ingest');
app.post('/v1/ingest', ingestRoute);

/**
 * Jobs route
 */
const jobsRoute = require('./routes/jobs');
app.get('/v1/jobs/:id', jobsRoute);

/**
 * Benchmark route (main ecosystem intelligence endpoint)
 */
const benchmarkRoute = require('./routes/benchmark');
app.post('/v1/ecosystem/benchmark', benchmarkRoute);

/**
 * Similar repos route
 */
const similarRoute = require('./routes/similar');
app.post('/v1/similar', similarRoute);

/**
 * Repo details routes
 */
const reposRoute = require('./routes/repos');
app.get('/v1/repos/:id', reposRoute.getRepo);
app.get('/v1/repos/:id/peers', reposRoute.getPeers);

/**
 * Categories routes
 */
const categoriesRoute = require('./routes/categories');
app.get('/v1/categories', categoriesRoute.listCategories);
app.get('/v1/categories/:slug/features', categoriesRoute.getFeatures);

/**
 * Error handler middleware
 */
app.use((err, req, res, next) => {
  console.error('[error] Unhandled error:', err.message);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message,
    },
  });
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
});

// Start server

const server = app.listen(PORT, () => {
  console.log(`[server] EcoIntel API listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received, shutting down...');
  server.close(() => {
    console.log('[server] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[server] SIGINT received, shutting down...');
  server.close(() => {
    console.log('[server] Server closed');
    process.exit(0);
  });
});

module.exports = app;
