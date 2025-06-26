// File: index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const generateRoute = require("./routes/generate");
const roomsRoute = require("./routes/rooms");
const connectDB = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", generateRoute);
app.use("/api/rooms", roomsRoute);

// Health Check
app.get("/health", (req, res) => {
  res.json({ status: "Server is running", timestamp: new Date().toISOString() });
});

// Connect to MongoDB and start server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
      console.log("📡 Available endpoints:");
      console.log("- POST   /api/generate           → AI text generation");
      console.log("- POST   /api/rooms/create       → Create room");
      console.log("- POST   /api/rooms/join         → Join room");
      console.log("- GET    /api/rooms/active       → List active rooms");
      console.log("- GET    /api/rooms/validate/:code → Validate room");
      console.log("- PATCH  /api/rooms/status       → Update room status");
      console.log("- POST   /api/rooms/leave        → Leave room");
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB:", err.message);
    process.exit(1); // stop server if DB not connected
  });
