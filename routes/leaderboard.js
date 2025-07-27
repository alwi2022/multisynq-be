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
        .select("_id initials score avatarUrl wpm accuracy timestamp");
  
      // Apply same composite scoring as frontend
      const scored = scores.map(entry => ({
        ...entry.toObject(),
        compositeScore: entry.score * 2 + entry.accuracy * 1 + entry.wpm * 1.5,
      }));
  
      // Sort by composite score and limit to 5
      const topScores = scored
        .sort((a, b) => b.compositeScore - a.compositeScore)
        .slice(0, 5);
  
      res.json(topScores);
    } catch (err) {
      console.error("❌ Error fetching leaderboard:", err.message);
      res.status(500).json({ error: "Internal server error" });
    }
  });

router.delete("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await Score.findByIdAndDelete(id);
  
      if (!result) return res.status(404).json({ error: "Score not found" });
      res.json({ message: "Score deleted successfully" });
    } catch (err) {
      console.error("❌ Error deleting score:", err.message);
      res.status(500).json({ error: "Internal server error" });
    }
  });

module.exports = router;
