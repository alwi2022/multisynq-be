const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const express = require('express');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

async function withRouter(repository, run) {
  const module = { exports: {} };
  vm.compileFunction(readFileSync(join(__dirname, '../routes/leaderboard.js'), 'utf8'), ['require', 'module', 'console'])(
    name => name === 'express' ? express : repository, module, { error() {} },
  );
  const app = express();
  app.use(express.json()); app.use('/api/leaderboard', module.exports);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('leaderboard validates writes and IDs, preserves API responses, and handles unavailable storage', async () => {
  let saved;
  let unavailable = false;
  const repository = {
    async createScore(data) { saved = data; },
    async getTopScores() {
      if (unavailable) throw Object.assign(new Error('offline'), { code: 'ECONNREFUSED' });
      return [{ _id: 'old-id', initials: 'AL', compositeScore: 250 }];
    },
    async deleteScore(id) { return id === 'a'.repeat(24); },
  };
  await withRouter(repository, async base => {
    const post = body => fetch(`${base}/api/leaderboard`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    assert.equal((await post({ initials: ' AL ', score: 100, wpm: 50, accuracy: 90 })).status, 201);
    assert.equal(saved.initials, 'AL');
    for (const body of [{initials:'',score:1}, {initials:'AL',score:-1}, {initials:'AL',score:'1'}, {initials:'AL',score:1,accuracy:101}]) assert.equal((await post(body)).status, 400);
    const rows = await (await fetch(`${base}/api/leaderboard`)).json();
    assert.equal(rows[0].compositeScore, 250);
    assert.equal((await fetch(`${base}/api/leaderboard/bad-id`, { method: 'DELETE' })).status, 400);
    assert.equal((await fetch(`${base}/api/leaderboard/${'a'.repeat(24)}`, { method: 'DELETE' })).status, 200);
    assert.equal((await fetch(`${base}/api/leaderboard/${'b'.repeat(24)}`, { method: 'DELETE' })).status, 404);
    unavailable = true;
    assert.equal((await fetch(`${base}/api/leaderboard`)).status, 503);
  });
});

test('API starts and mounts chat without DATABASE_URL', async () => {
  const child = spawn(process.execPath, ['index.js'], { cwd: join(__dirname, '..'), env: { ...process.env, DATABASE_URL: '', PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const ready = new Promise((resolve, reject) => {
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; const match = output.match(/localhost:(\d+)/); if (match) resolve(Number(match[1])); });
    child.once('exit', code => reject(new Error(`Server exited before startup: ${code}`)));
  });
  let timer;
  try {
    const port = await Promise.race([ready, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Startup timeout')), 10000); })]);
    const base = `http://127.0.0.1:${port}`;
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal((await fetch(`${base}/api/leaderboard`)).status, 503);
    // Empty chat input exercises the live handler without making a Gemini request.
    assert.equal((await fetch(`${base}/api/chat`, { method: 'POST', headers: {'Content-Type':'application/json'}, body:'{}' })).status, 400);
    assert.equal((await fetch(`${base}/health`)).status, 200);
  } finally {
    clearTimeout(timer);
    if (child.exitCode === null) { child.kill(); await once(child, 'exit'); }
  }
});

test('PostgreSQL migration and score CRUD', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  const { getPool, closeDatabase } = require('../config/db');
  const pool = getPool();
  let created = false;
  try {
    const existing = await pool.query("SELECT 1 FROM pg_namespace WHERE nspname = 'multisynq'");
    assert.equal(existing.rowCount, 0, 'TEST_DATABASE_URL must use a disposable database without the multisynq schema');
    const sql = readFileSync(join(__dirname, '../migrations/001_scores.sql'), 'utf8');
    await pool.query(sql); created = true;
    await pool.query(sql);
    const { createScore, getTopScores, deleteScore } = require('../models/score');
    for (let score = 1; score <= 7; score++) await createScore({initials:'AL',score,wpm:10,accuracy:90});
    await createScore({initials:"O'", score:0});
    const top = await getTopScores();
    assert.equal(top.length, 5);
    assert.equal(top[0].score, 7);
    assert.equal(top[0].compositeScore, 119);
    assert.equal(typeof top[0]._id, 'string');
    assert.equal(await deleteScore(top[0]._id), true);
    assert.equal(await deleteScore(top[0]._id), false);
    await assert.rejects(pool.query("INSERT INTO multisynq.scores (id,initials,score) VALUES ('invalid','AL',-1)"), {code:'23514'});
  } finally {
    if (created) await pool.query('DROP SCHEMA multisynq CASCADE');
    await closeDatabase();
  }
});
