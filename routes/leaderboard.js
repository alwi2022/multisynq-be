const express = require('express');
const { createScore, getTopScores, deleteScore } = require('../models/score');
const router = express.Router();
const unavailableCodes = new Set(['DATABASE_UNAVAILABLE', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH', '28P01', '3D000', '3F000', '42P01', '53300', '57P01', '08006', '08001']);

function databaseError(res, error) {
  console.error('Leaderboard database error:', error.code || 'UNKNOWN');
  const unavailable = unavailableCodes.has(error.code) || /timeout|connection terminated/i.test(error.message || '');
  return res.status(unavailable ? 503 : 500).json({ error: unavailable ? 'Leaderboard database unavailable' : 'Internal server error' });
}

router.post('/', async (req, res) => {
  const { initials, score, avatarUrl, wpm, accuracy } = req.body || {};
  if (typeof initials !== 'string' || !initials.trim() || initials.trim().length > 32 ||
      typeof score !== 'number' || !Number.isFinite(score) || score < 0 ||
      (avatarUrl != null && (typeof avatarUrl !== 'string' || avatarUrl.length > 2048)) ||
      (wpm != null && (typeof wpm !== 'number' || !Number.isFinite(wpm) || wpm < 0)) ||
      (accuracy != null && (typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100))) {
    return res.status(400).json({ error: 'Invalid score data' });
  }
  try {
    await createScore({ initials: initials.trim(), score, avatarUrl, wpm, accuracy });
    return res.status(201).json({ message: 'Score saved!' });
  } catch (error) { return databaseError(res, error); }
});

router.get('/', async (req, res) => {
  try { return res.json(await getTopScores()); }
  catch (error) { return databaseError(res, error); }
});

router.delete('/:id', async (req, res) => {
  // Preserve compatibility with MongoDB IDs in imported scores.
  if (!/^(?:[a-f0-9]{24}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid score ID' });
  }
  try {
    if (!await deleteScore(req.params.id)) return res.status(404).json({ error: 'Score not found' });
    return res.json({ message: 'Score deleted successfully' });
  } catch (error) { return databaseError(res, error); }
});

module.exports = router;
