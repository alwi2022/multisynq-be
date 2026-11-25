const { randomUUID } = require('node:crypto');
const { getPool } = require('../config/db');

async function createScore({ initials, score, avatarUrl, wpm, accuracy }) {
  await getPool().query(
    `INSERT INTO multisynq.scores (id, initials, score, avatar_url, wpm, accuracy)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [randomUUID(), initials, score, avatarUrl ?? null, wpm ?? null, accuracy ?? null],
  );
}

async function getTopScores() {
  const result = await getPool().query(
    `SELECT id AS "_id", initials, score, avatar_url AS "avatarUrl", wpm, accuracy, timestamp,
            score * 2 + COALESCE(accuracy, 0) + COALESCE(wpm, 0) * 1.5 AS "compositeScore"
     FROM multisynq.scores ORDER BY "compositeScore" DESC, timestamp ASC, id ASC LIMIT 5`,
  );
  return result.rows;
}

async function deleteScore(id) {
  const result = await getPool().query('DELETE FROM multisynq.scores WHERE id = $1', [id]);
  return result.rowCount > 0;
}

module.exports = { createScore, getTopScores, deleteScore };
