require('dotenv').config();
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { getPool, closeDatabase } = require('../config/db');

async function migrate() {
  try {
    const sql = await readFile(join(__dirname, '../migrations/001_scores.sql'), 'utf8');
    await getPool().query(sql);
    console.log('PostgreSQL scores migration complete');
  } catch (error) {
    console.error('Migration failed:', error.code || 'UNKNOWN');
    process.exitCode = 1;
  } finally { await closeDatabase(); }
}
migrate();
