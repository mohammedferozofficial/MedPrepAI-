import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { pdfsTable, processingJobsTable } from "@workspace/db";
import { eq, and, count, desc } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "../lib/auth";

const router = Router();

router.get("/pdfs", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const userId = auth.userId!;
  const { status, subjectId, page = "1", limit = "20" } = req.query as Record<string, string>;

  try {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(pdfsTable.userId, userId)];
    if (status) conditions.push(eq(pdfsTable.status, status as any));
    if (subjectId) conditions.push(eq(pdfsTable.subjectId, subjectId));

    const whereClause = and(...conditions);

    const [items, [totalRow]] = await Promise.all([
      db.select().from(pdfsTable).where(whereClause).orderBy(desc(pdfsTable.uploadedAt)).limit(limitNum).offset(offset),
      db.select({ count: count() }).from(pdfsTable).where(whereClause),
    ]);

    res.json({
      items: items.map(serializePdf),
      total: totalRow?.count ?? 0,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error({ err }, "Error listing PDFs");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/pdfs/register", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth.userId!;

  try {
    const claims = auth.sessionClaims as Record<string, unknown> | null;
    const email = (claims?.email as string) ?? "";
    await getOrCreateUser(clerkUserId, email);

    const { fileName, storagePath, fileSizeBytes, subjectId } = req.body;

    if (!fileName || !storagePath || !fileSizeBytes) {
      res.status(400).json({ error: "fileName, storagePath, and fileSizeBytes are required" });
      return;
    }

    const [pdf] = await db.insert(pdfsTable).values({
      userId: clerkUserId,
      fileName,
      storagePath,
      fileSizeBytes: parseInt(fileSizeBytes, 10),
      subjectId: subjectId ?? null,
      status: "QUEUED",
    }).returning();

    await db.insert(processingJobsTable).values({
      pdfId: pdf.id,
      userId: clerkUserId,
      type: "PDF_ANALYSIS",
    });

    res.status(201).json(serializePdf(pdf));
  } catch (err) {
    req.log.error({ err }, "Error registering PDF");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/pdfs/:id", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const userId = auth.userId!;
  const id = req.params.id as string;

  try {
    const [pdf] = await db.select().from(pdfsTable).where(and(eq(pdfsTable.id, id), eq(pdfsTable.userId, userId))).limit(1);
    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }
    res.json(serializePdf(pdf));
  } catch (err) {
    req.log.error({ err }, "Error fetching PDF");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/pdfs/:id/status", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const userId = auth.userId!;
  const id = req.params.id as string;

  try {
    const [pdf] = await db.select().from(pdfsTable).where(and(eq(pdfsTable.id, id), eq(pdfsTable.userId, userId))).limit(1);
    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    const [job] = await db.select().from(processingJobsTable)
      .where(and(eq(processingJobsTable.pdfId, id), eq(processingJobsTable.type, "PDF_ANALYSIS")))
      .orderBy(desc(processingJobsTable.createdAt))
      .limit(1);

    res.json({
      id: pdf.id,
      status: pdf.status,
      progress: job?.progress ?? 0,
      errorMessage: pdf.errorMessage,
      processedAt: pdf.processedAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching PDF status");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/pdfs/:id", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const userId = auth.userId!;
  const id = req.params.id as string;

  try {
    const [pdf] = await db.select().from(pdfsTable).where(and(eq(pdfsTable.id, id), eq(pdfsTable.userId, userId))).limit(1);
    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    await db.delete(pdfsTable).where(and(eq(pdfsTable.id, id), eq(pdfsTable.userId, userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting PDF");
    res.status(500).json({ error: "Internal server error" });
  }
});

function serializePdf(pdf: any) {
  return {
    id: pdf.id,
    userId: pdf.userId,
    subjectId: pdf.subjectId ?? null,
    fileName: pdf.fileName,
    storagePath: pdf.storagePath,
    fileSizeBytes: pdf.fileSizeBytes,
    pageCount: pdf.pageCount ?? null,
    status: pdf.status,
    errorMessage: pdf.errorMessage ?? null,
    uploadedAt: pdf.uploadedAt.toISOString(),
    processedAt: pdf.processedAt?.toISOString() ?? null,
  };
}

export default router;
