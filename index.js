require("dotenv").config();
const express = require("express");
const cors = require("cors");
const generateRoute = require("./routes/generate");
const connectDB = require("./config/db");
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ✅ Add both routes
app.use("/api", generateRoute);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  connectDB()
    .then(() => console.log("✅ Database connected"))
    .catch((err) =>
      console.error("❌ Database connection error:", err.message)
    );
});
