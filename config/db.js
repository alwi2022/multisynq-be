const { Pool } = require('pg');
let pool;

function getPool() {
  if (!process.env.DATABASE_URL) {
    const error = new Error('DATABASE_URL is not configured');
    error.code = 'DATABASE_UNAVAILABLE';
    throw error;
  }
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5,
      connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 10000 });
    pool.on('error', () => console.error('PostgreSQL idle connection failed'));
  }
  return pool;
}

async function checkDatabase() {
  await getPool().query('SELECT 1 FROM multisynq.scores LIMIT 1');
}

async function closeDatabase() {
  if (pool) { await pool.end(); pool = undefined; }
}

module.exports = { getPool, checkDatabase, closeDatabase };
