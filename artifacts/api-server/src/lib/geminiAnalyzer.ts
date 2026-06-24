import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";

const EXTRACTION_PROMPT = `You are a medical exam question extractor. Analyze the provided PDF and extract all multiple-choice questions (MCQs).

For each MCQ found, extract:
- The question text (complete question stem)
- All answer options (A, B, C, D — sometimes E)
- The correct answer index (0-based: 0=A, 1=B, 2=C, 3=D)
- A brief explanation if provided in the text
- The medical topic/subject area
- Difficulty estimate (EASY, MEDIUM, or HARD)
- Page number if determinable

Return ONLY a JSON array with this exact structure:
[
  {
    "questionText": "string",
    "options": ["option A text", "option B text", "option C text", "option D text"],
    "correctAnswer": 0,
    "explanation": "string or null",
    "topic": "string or null",
    "difficulty": "EASY" | "MEDIUM" | "HARD",
    "pageNumber": number or null
  }
]

Important rules:
- Include ONLY actual exam-style MCQs with 4+ answer options
- Do NOT include fill-in-the-blank, true/false, or essay questions
- If no MCQs are found, return an empty array []
- Return valid JSON only — no markdown, no explanation text outside the JSON`;

export interface ExtractedQuestion {
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string | null;
  topic: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  pageNumber: number | null;
}

export async function analyzeWithGemini(
  pdfBytes: Buffer,
  pdfName: string,
): Promise<ExtractedQuestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const genai = new GoogleGenerativeAI(apiKey);
  const model = genai.getGenerativeModel({ model: "gemini-1.5-flash" });

  const base64Data = pdfBytes.toString("base64");

  logger.info({ pdfName, sizeKb: Math.round(pdfBytes.length / 1024) }, "Sending PDF to Gemini");

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "application/pdf",
        data: base64Data,
      },
    },
    EXTRACTION_PROMPT,
  ]);

  const text = result.response.text().trim();

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    logger.warn({ text: text.slice(0, 200) }, "Gemini returned no JSON array");
    return [];
  }

  const parsed = JSON.parse(jsonMatch[0]) as unknown[];
  const questions: ExtractedQuestion[] = [];

  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const q = item as Record<string, unknown>;

    if (
      typeof q.questionText !== "string" ||
      !Array.isArray(q.options) ||
      typeof q.correctAnswer !== "number"
    ) {
      continue;
    }

    const diff = String(q.difficulty ?? "MEDIUM").toUpperCase();
    questions.push({
      questionText: q.questionText,
      options: (q.options as unknown[]).map(String),
      correctAnswer: Math.max(0, Math.min(q.options.length - 1, q.correctAnswer)),
      explanation: typeof q.explanation === "string" ? q.explanation : null,
      topic: typeof q.topic === "string" ? q.topic : null,
      difficulty: (["EASY", "MEDIUM", "HARD"].includes(diff) ? diff : "MEDIUM") as ExtractedQuestion["difficulty"],
      pageNumber: typeof q.pageNumber === "number" ? q.pageNumber : null,
    });
  }

  logger.info({ pdfName, extracted: questions.length }, "Gemini extraction complete");
  return questions;
}
