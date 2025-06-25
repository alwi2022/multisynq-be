require("dotenv").config();
const express = require("express");
const cors = require("cors");
const generateRoute = require("./routes/generate");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api", generateRoute);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
