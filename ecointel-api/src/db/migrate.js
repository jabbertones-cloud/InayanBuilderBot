#!/usr/bin/env node

/**
 * Database migration script
 * Reads schema.sql and applies it idempotently to the configured PostgreSQL database
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const schemaPath = path.join(__dirname, 'schema.sql');
const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost/ecointel';

/**
 * Run migrations
 */
async function migrate() {
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log('[migrate] Reading schema.sql...');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    if (!schema.trim()) {
      throw new Error('schema.sql is empty');
    }

    console.log('[migrate] Connecting to database...');
    const client = await pool.connect();

    try {
      console.log('[migrate] Running schema...');
      await client.query(schema);
      console.log('[migrate] ✓ Schema applied successfully');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[migrate] ✗ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
