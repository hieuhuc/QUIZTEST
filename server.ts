import express, { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import mammoth from "mammoth";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API: AI Question Generation
  app.post("/api/ai/generate-questions", async (req: Request, res: Response) => {
    const { topic, count } = req.body;
    if (!topic || !count) {
      return res.status(400).json({ error: "Topic and count are required." });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

      const prompt = `Generate ${count} multiple-choice questions about "${topic}" for university students.
      Each question must have 4 options (A, B, C, D) and exactly one correct answer.
      Return the result as a JSON array of objects with the following structure:
      [
        {
          "text": "Question text here?",
          "options": { "A": "Option 1", "B": "Option 2", "C": "Option 3", "D": "Option 4" },
          "correctAnswer": "A"
        }
      ]
      Only return the JSON array, no other text.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      
      const text = response.text;
      
      // Extract JSON from the response (sometimes Gemini adds markdown blocks)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Failed to parse AI response as JSON.");
      }
      
      const questions = JSON.parse(jsonMatch[0]);
      res.json(questions);
    } catch (error) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: "Failed to generate questions." });
    }
  });

  // API: Word File Parsing
  app.post("/api/parse-docx", upload.single("file"), async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    try {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      const text = result.value;

      // Simple parsing logic for Word files
      // Expected format:
      // 1. Question text?
      // A. Option 1
      // B. Option 2
      // C. Option 3
      // D. Option 4
      // Answer: A
      
      const questions: any[] = [];
      const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      
      let currentQuestion: any = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Match question (starts with number or just text)
        if (line.match(/^\d+[\.\)]/) || (!line.startsWith("A.") && !line.startsWith("B.") && !line.startsWith("C.") && !line.startsWith("D.") && !line.toLowerCase().startsWith("answer:"))) {
          if (currentQuestion && currentQuestion.text && currentQuestion.options.A) {
            questions.push(currentQuestion);
          }
          currentQuestion = {
            text: line.replace(/^\d+[\.\)]\s*/, ""),
            options: { A: "", B: "", C: "", D: "" },
            correctAnswer: "A"
          };
        } else if (line.match(/^[A-D][\.\)]/)) {
          const key = line[0] as "A" | "B" | "C" | "D";
          if (currentQuestion) {
            currentQuestion.options[key] = line.replace(/^[A-D][\.\)]\s*/, "");
          }
        } else if (line.toLowerCase().startsWith("answer:")) {
          const ans = line.split(":")[1].trim().toUpperCase();
          if (currentQuestion && ["A", "B", "C", "D"].includes(ans)) {
            currentQuestion.correctAnswer = ans;
          }
        }
      }
      
      if (currentQuestion && currentQuestion.text && currentQuestion.options.A) {
        questions.push(currentQuestion);
      }

      res.json(questions);
    } catch (error) {
      console.error("Docx Parsing Error:", error);
      res.status(500).json({ error: "Failed to parse document." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
