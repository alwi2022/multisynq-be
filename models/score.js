const mongoose = require("mongoose");

const ScoreSchema = new mongoose.Schema({
  initials: { type: String, required: true },
  score: { type: Number, required: true },
  avatarUrl: { type: String },
  wpm: { type: Number },
  accuracy: { type: Number },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Score", ScoreSchema);
