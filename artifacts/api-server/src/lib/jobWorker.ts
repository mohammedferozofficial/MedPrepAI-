import { db } from "@workspace/db";
import { pdfsTable, processingJobsTable, questionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { objectStorageClient } from "./objectStorage";
import { analyzeWithGemini } from "./geminiAnalyzer";
import { logger } from "./logger";

const POLL_INTERVAL_MS = 30_000;
const MAX_PDF_SIZE_MB = 20;

function parseBucketObject(storagePath: string): { bucketName: string; objectName: string } | null {
  try {
    if (storagePath.startsWith("https://storage.googleapis.com/")) {
      const url = new URL(storagePath);
      const parts = url.pathname.slice(1).split("/");
      return { bucketName: parts[0], objectName: parts.slice(1).join("/") };
    }
    const privateDir = process.env.PRIVATE_OBJECT_DIR ?? "";
    if (!privateDir) return null;

    if (storagePath.startsWith("/objects/")) {
      const entityId = storagePath.slice("/objects/".length);
      const dir = privateDir.endsWith("/") ? privateDir : privateDir + "/";
      const fullPath = dir + entityId;
      const parts = fullPath.split("/");
      return { bucketName: parts[0], objectName: parts.slice(1).join("/") };
    }
  } catch {
    // fall through
  }
  return null;
}

async function downloadPdf(storagePath: string): Promise<Buffer> {
  const parsed = parseBucketObject(storagePath);
  if (!parsed) {
    throw new Error(`Cannot parse storage path: ${storagePath}`);
  }

  const { bucketName, objectName } = parsed;
  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  const [exists] = await file.exists();
  if (!exists) throw new Error(`PDF not found in storage: ${storagePath}`);

  const [buffer] = await file.download();

  if (buffer.length > MAX_PDF_SIZE_MB * 1024 * 1024) {
    throw new Error(`PDF too large for analysis: ${Math.round(buffer.length / (1024 * 1024))}MB (max ${MAX_PDF_SIZE_MB}MB)`);
  }

  return buffer as Buffer;
}

async function processJob(jobId: string, pdfId: string, userId: string) {
  const jobLog = logger.child({ jobId, pdfId });
  jobLog.info("Processing job started");

  await db.update(processingJobsTable).set({
    status: "RUNNING",
    startedAt: new Date(),
    progress: 5,
  }).where(eq(processingJobsTable.id, jobId));

  await db.update(pdfsTable).set({ status: "PROCESSING" }).where(eq(pdfsTable.id, pdfId));

  const [pdf] = await db.select().from(pdfsTable).where(eq(pdfsTable.id, pdfId)).limit(1);
  if (!pdf) throw new Error("PDF record not found");

  await db.update(processingJobsTable).set({ progress: 15 }).where(eq(processingJobsTable.id, jobId));

  const pdfBytes = await downloadPdf(pdf.storagePath);
  jobLog.info({ sizeKb: Math.round(pdfBytes.length / 1024) }, "PDF downloaded");

  await db.update(processingJobsTable).set({ progress: 30 }).where(eq(processingJobsTable.id, jobId));

  const questions = await analyzeWithGemini(pdfBytes, pdf.fileName);

  await db.update(processingJobsTable).set({ progress: 80 }).where(eq(processingJobsTable.id, jobId));

  if (questions.length > 0) {
    const rows = questions.map((q) => ({
      pdfId,
      userId,
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation ?? null,
      topic: q.topic ?? null,
      difficulty: q.difficulty,
      pageNumber: q.pageNumber ?? null,
    }));

    await db.insert(questionsTable).values(rows);
    jobLog.info({ count: questions.length }, "Questions inserted");
  }

  const now = new Date();

  await db.update(processingJobsTable).set({
    status: "SUCCEEDED",
    progress: 100,
    completedAt: now,
  }).where(eq(processingJobsTable.id, jobId));

  await db.update(pdfsTable).set({
    status: "COMPLETED",
    processedAt: now,
  }).where(eq(pdfsTable.id, pdfId));

  jobLog.info({ questionsExtracted: questions.length }, "Job completed");
}

async function pollAndProcess() {
  try {
    const pendingJobs = await db.select().from(processingJobsTable)
      .where(and(
        eq(processingJobsTable.status, "PENDING"),
        eq(processingJobsTable.type, "PDF_ANALYSIS"),
      ))
      .limit(3);

    for (const job of pendingJobs) {
      if (!job.pdfId) continue;

      try {
        await processJob(job.id, job.pdfId, job.userId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        logger.error({ jobId: job.id, pdfId: job.pdfId, err }, "Job failed");

        await db.update(processingJobsTable).set({
          status: "FAILED",
          errorMessage: msg,
          completedAt: new Date(),
        }).where(eq(processingJobsTable.id, job.id));

        if (job.pdfId) {
          await db.update(pdfsTable).set({
            status: "FAILED",
            errorMessage: msg,
          }).where(eq(pdfsTable.id, job.pdfId));
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Poll cycle error");
  }
}

export function startJobWorker() {
  logger.info("Job worker started — polling every 30s");
  pollAndProcess();
  setInterval(pollAndProcess, POLL_INTERVAL_MS);
}
