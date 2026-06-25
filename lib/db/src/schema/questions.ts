import { pgTable, text, integer, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { pdfsTable } from "./pdfs";

export const difficultyEnum = pgEnum("difficulty", ["EASY", "MEDIUM", "HARD"]);
export const questionTypeEnum = pgEnum("question_type", ["MCQ", "SHORT", "LONG", "PYQ"]);

export const questionsTable = pgTable("questions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  pdfId: text("pdf_id").notNull().references(() => pdfsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  questionType: questionTypeEnum("question_type").notNull().default("MCQ"),
  questionText: text("question_text").notNull(),
  options: jsonb("options").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  correctAnswer: integer("correct_answer"),
  explanation: text("explanation"),
  topic: text("topic"),
  difficulty: difficultyEnum("difficulty"),
  pageNumber: integer("page_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Question = typeof questionsTable.$inferSelect;
