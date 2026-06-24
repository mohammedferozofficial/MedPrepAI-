import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const pdfStatusEnum = pgEnum("pdf_status", ["UPLOADED", "QUEUED", "PROCESSING", "COMPLETED", "FAILED"]);

export const pdfsTable = pgTable("pdfs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  subjectId: text("subject_id"),
  fileName: text("file_name").notNull(),
  storagePath: text("storage_path").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  pageCount: integer("page_count"),
  status: pdfStatusEnum("status").notNull().default("UPLOADED"),
  errorMessage: text("error_message"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export const insertPdfSchema = createInsertSchema(pdfsTable).omit({ id: true, status: true, uploadedAt: true, processedAt: true, errorMessage: true, pageCount: true });
export type InsertPdf = z.infer<typeof insertPdfSchema>;
export type Pdf = typeof pdfsTable.$inferSelect;
