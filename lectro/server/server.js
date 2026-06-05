import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import OpenAI from "openai";

dotenv.config();
const app = express();
const upload = multer({ dest: "uploads/" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => res.send("Lectro API running ✅"));

// Whisper fallback route
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const file = fs.createReadStream(req.file.path);
    const result = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });
    res.json({ text: result.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Transcription failed" });
  }
});

// ✅ ONLY ONE /api/summarize endpoint
app.post("/api/summarize", async (req, res) => {
  const { transcript } = req.body;
  
  console.log("📝 Received summarize request, transcript length:", transcript?.length || 0);
  
  if (!transcript || transcript.trim().length < 20) {
    console.log("⚠️ Transcript too short, skipping");
    return res.json({ notes: "Waiting for more content..." });
  }
  
  try {
    const prompt = `Create a brief summary of this lecture transcript in 2-3 concise bullet points.
    Focus only on the main ideas and key takeaways.
    Do NOT include flashcards, questions, or additional sections.
    Format as simple bullet points.
    Transcript: ${transcript}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    
    const content = response.choices[0].message.content;
    console.log("✅ AI Response received:", content);
    
    res.json({ notes: content });
  } catch (err) {
    console.error("❌ Summary error:", err);
    res.status(500).json({ error: "Summary failed" });
  }
});

// Generate Quiz Route
app.post("/api/generate-quiz", async (req, res) => {
  const { content } = req.body;
  
  console.log("🧠 Received quiz request, content length:", content?.length || 0);
  
  if (!content || content.trim().length < 20) {
    return res.status(400).json({ error: "Not enough content to generate a quiz." });
  }
  
  try {
    const prompt = `Based on the following lecture notes, generate a 3-question multiple-choice quiz to test the student's understanding. 
    You MUST return ONLY a valid JSON object with a single key called "questions". 
    The value of "questions" should be an array of objects, where each object has exactly these keys:
    - "question": The question text.
    - "options": An array of 4 possible answer strings.
    - "correctAnswer": The exact string of the correct option.
    - "explanation": A brief 1-sentence explanation of why the answer is correct.

    Lecture Notes:
    ${content}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }, // Forces ChatGPT to return clean JSON
    });
    
    // Parse the JSON string from OpenAI into a real JavaScript object
    const quizData = JSON.parse(response.choices[0].message.content);
    console.log("✅ Quiz generated successfully!");
    
    res.json(quizData);
  } catch (err) {
    console.error("❌ Quiz generation error:", err);
    res.status(500).json({ error: "Failed to generate quiz" });
  }
});

// Define term (optional - add back if needed)
app.post("/api/define", async (req, res) => {
  const { term } = req.body;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Give a 2-sentence definition and one example for: ${term}`,
      }],
    });
    res.json({ result: response.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Definition failed" });
  }
});

app.listen(3001, () => console.log("🚀 Lectro API running on http://localhost:3001"));