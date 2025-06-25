const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/generate", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 1,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("🧠 Raw Gemini Output:\n", text);

  let sentence = "";
    try {
      const parsed = JSON.parse(text); // coba parse JSON
      if (typeof parsed.sentence === "string") {
    sentence = parsed.sentence;
  }
    } catch {
  sentence = text
    .replace(/["'\n]/g, "")
    .replace(/[^a-zA-Z0-9\s.,!?]/g, "")
    .trim();
    }

  res.json({ sentence });
  } catch (err) {
    console.error("Gemini Error:", err.message);
    res.status(500).json({ error: "Failed to generate content" });
  }
});

module.exports = router;
