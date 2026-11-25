require("dotenv").config();
const express = require("express");
const cors = require("cors");
const generateRoute = require("./routes/generate");
const leaderboardRoute = require("./routes/leaderboard");
const chatRoute = require("./routes/chat");
const { checkDatabase } = require("./config/db");
const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '128kb' }));

// ✅ Add both routes
app.use("/api", generateRoute);
app.use("/api", chatRoute);

app.use("/api/leaderboard", leaderboardRoute);
// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${server.address().port}`);
  checkDatabase()
    .then(() => console.log("PostgreSQL connected"))
    .catch(() => console.warn("Leaderboard database unavailable; chat and generation remain online"));
});
