import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";

const EXTRACTION_PROMPT = `You are a medical exam question extractor for Indian medical students (NEET PG, USMLE, University Finals). Analyze the provided PDF and extract ALL question types.

Extract FOUR categories of questions:

1. **MCQ** - Multiple choice questions with 4 or 5 options and a single correct answer
2. **PYQ** - Previous Year Questions (any question that is from a past exam / marked as PYQ, repeated question, or dated exam question — can be MCQ format or short answer)
3. **SHORT** - Short answer questions (2–5 marks) that require a brief written answer (no options)
4. **LONG** - Long answer / essay questions (10+ marks, structured answers required — no options)

For EACH question found, return:
- questionType: "MCQ" | "PYQ" | "SHORT" | "LONG"
- questionText: the complete question stem
- options: array of option strings for MCQ/PYQ (e.g. ["Metformin", "Insulin", "Glipizide", "Pioglitazone"]) — use [] for SHORT and LONG
- correctAnswer: 0-based index of correct option for MCQ/PYQ — use null for SHORT and LONG
- explanation: model answer, key points, or explanation text (null if none given)
- topic: medical subject/system (e.g. "Pharmacology", "Anatomy", "Pathology", "Medicine")
- difficulty: "EASY" | "MEDIUM" | "HARD"
- pageNumber: page number or null

Return ONLY a valid JSON array — no markdown, no text outside the JSON:
[
  {
    "questionType": "MCQ",
    "questionText": "Drug of choice for type 2 diabetes mellitus is?",
    "options": ["Metformin", "Insulin glargine", "Glipizide", "Pioglitazone"],
    "correctAnswer": 0,
    "explanation": "Metformin is the first-line drug for T2DM due to its efficacy, safety profile, and cardiovascular benefits.",
    "topic": "Pharmacology",
    "difficulty": "EASY",
    "pageNumber": 12
  },
  {
    "questionType": "SHORT",
    "questionText": "Enumerate the causes of secondary hypertension.",
    "options": [],
    "correctAnswer": null,
    "explanation": "Renal: CKD, RAS. Endocrine: Cushing, Conn, Pheo, Hyperthyroidism. Vascular: Coarctation of aorta. Drugs: OCP, steroids, NSAIDs.",
    "topic": "Medicine",
    "difficulty": "MEDIUM",
    "pageNumber": 34
  }
]

Rules:
- Include ALL question types found — do not skip SHORT or LONG questions
- For PYQ: mark questionType as "PYQ" if the question is explicitly from a past exam year (e.g. "AIIMS 2019", "PGI Nov 2020", etc.)
- If no questions found, return []`;

export type QuestionType = "MCQ" | "SHORT" | "LONG" | "PYQ";

export interface ExtractedQuestion {
  questionType: QuestionType;
  questionText: string;
  options: string[];
  correctAnswer: number | null;
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

  const VALID_TYPES = new Set<QuestionType>(["MCQ", "SHORT", "LONG", "PYQ"]);

  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const q = item as Record<string, unknown>;

    if (typeof q.questionText !== "string") continue;

    const rawType = String(q.questionType ?? "MCQ").toUpperCase();
    const questionType: QuestionType = VALID_TYPES.has(rawType as QuestionType)
      ? (rawType as QuestionType)
      : "MCQ";

    const isMcqStyle = questionType === "MCQ" || questionType === "PYQ";
    const options = Array.isArray(q.options) ? (q.options as unknown[]).map(String) : [];
    const correctAnswer =
      isMcqStyle && typeof q.correctAnswer === "number"
        ? Math.max(0, Math.min(Math.max(options.length - 1, 0), q.correctAnswer))
        : null;

    const diff = String(q.difficulty ?? "MEDIUM").toUpperCase();
    questions.push({
      questionType,
      questionText: q.questionText,
      options,
      correctAnswer,
      explanation: typeof q.explanation === "string" ? q.explanation : null,
      topic: typeof q.topic === "string" ? q.topic : null,
      difficulty: (["EASY", "MEDIUM", "HARD"].includes(diff) ? diff : "MEDIUM") as ExtractedQuestion["difficulty"],
      pageNumber: typeof q.pageNumber === "number" ? q.pageNumber : null,
    });
  }

  logger.info(
    {
      pdfName,
      total: questions.length,
      mcq: questions.filter((q) => q.questionType === "MCQ").length,
      pyq: questions.filter((q) => q.questionType === "PYQ").length,
      short: questions.filter((q) => q.questionType === "SHORT").length,
      long: questions.filter((q) => q.questionType === "LONG").length,
    },
    "Gemini extraction complete",
  );
  return questions;
}
