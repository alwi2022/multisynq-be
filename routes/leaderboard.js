const express = require("express");
const router = express.Router();
const Score = require("../models/score");

// POST /api/leaderboard
router.post("/", async (req, res) => {
  try {
    const { initials, score, avatarUrl, wpm, accuracy } = req.body;

    const newScore = new Score({
      initials,
      score,
      avatarUrl,
      wpm,
      accuracy,
    });

    await newScore.save();
    res.status(201).json({ message: "Score saved!" });
  } catch (err) {
    console.error("❌ Error saving score:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/leaderboard
router.get("/", async (req, res) => {
  try {
    const scores = await Score.find()
      .sort({ score: -1, accuracy: -1, wpm: -1 })
      .limit(5);

    res.json(scores);
  } catch (err) {
    console.error("❌ Error fetching leaderboard:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
