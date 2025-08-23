// routes/chat.js (CommonJS, selaras dengan kode kamu)
const express = require("express");
const router = express.Router();
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function toGeminiContents(messages = []) {
  return messages
    .filter((m) => m && m.content)
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

router.post("/chat", async (req, res) => {
  try {
    const { system, messages = [], lang = "en" } = req.body || {};
    if (!system || !messages.length) {
      return res.status(400).json({ error: "system and messages are required" });
    }

    const guard =
      lang === "id"
        ? "Jika pertanyaan tidak terkait Alwi, arahkan kembali dengan sopan."
        : "If the question is unrelated to Alwi, politely steer back.";

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // cepat & ekonomis; bisa diganti kapan saja
      systemInstruction: `${system}\n\n${guard}`,
    });

    const result = await model.generateContent({
      contents: toGeminiContents(messages),
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ],
      generationConfig: {
        temperature: 0.2, // lebih stabil utk jawaban HR
        // NOTE: jangan pakai responseMimeType: "application/json" kalau kamu tidak butuh output JSON khusus
      },
    });

    const reply =
      (result && result.response && typeof result.response.text === "function"
        ? result.response.text()
        : "") || "";

    return res.json({ reply });
  } catch (err) {
    console.error("Gemini Chat Error:", err?.message || err);
    return res.status(500).json({ error: "Failed to generate content" });
  }
});

module.exports = router;
