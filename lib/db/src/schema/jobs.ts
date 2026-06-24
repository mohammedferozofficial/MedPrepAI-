import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { pdfsTable } from "./pdfs";

export const jobStatusEnum = pgEnum("job_status", ["PENDING", "RUNNING", "SUCCEEDED", "FAILED"]);
export const jobTypeEnum = pgEnum("job_type", [
  "PDF_ANALYSIS",
  "NOTES_GENERATION",
  "SUMMARY_GENERATION",
  "FLASHCARD_GENERATION",
  "QUIZ_GENERATION",
  "REVISION_PDF",
]);

export const processingJobsTable = pgTable("processing_jobs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  pdfId: text("pdf_id").references(() => pdfsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: jobTypeEnum("type").notNull(),
  status: jobStatusEnum("status").notNull().default("PENDING"),
  progress: integer("progress").notNull().default(0),
  resultRef: text("result_ref"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJobSchema = createInsertSchema(processingJobsTable).omit({ id: true, status: true, progress: true, createdAt: true, startedAt: true, completedAt: true, errorMessage: true, resultRef: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type ProcessingJob = typeof processingJobsTable.$inferSelect;
