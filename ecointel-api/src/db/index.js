/**
 * PostgreSQL connection pool module
 * Manages database connections and query execution
 */

const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost/ecointel';

const pool = new Pool({
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('[db] New connection created');
});

pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client:', err.message);
});

/**
 * Execute a query with optional parameters
 * @param {string} text - SQL query
 * @param {any[]} params - Query parameters
 * @returns {Promise<any>} Query result
 */
async function query(text, params) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    console.error('[db] Query error:', err.message);
    throw err;
  }
}

/**
 * Get a dedicated client from the pool
 * Caller is responsible for releasing the client
 * @returns {Promise<Client>} PostgreSQL client
 */
async function getClient() {
  return await pool.connect();
}

module.exports = {
  query,
  getClient,
  pool,
};
