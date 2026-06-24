import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { pdfsTable, processingJobsTable } from "@workspace/db";
import { eq, and, count, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/dashboard/stats", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const userId = auth.userId!;

  try {
    const [
      [totalPdfsRow],
      [processingRow],
      [completedRow],
      [failedRow],
      recentJobs,
    ] = await Promise.all([
      db.select({ count: count() }).from(pdfsTable).where(eq(pdfsTable.userId, userId)),
      db.select({ count: count() }).from(pdfsTable).where(and(eq(pdfsTable.userId, userId), eq(pdfsTable.status, "PROCESSING"))),
      db.select({ count: count() }).from(pdfsTable).where(and(eq(pdfsTable.userId, userId), eq(pdfsTable.status, "COMPLETED"))),
      db.select({ count: count() }).from(pdfsTable).where(and(eq(pdfsTable.userId, userId), eq(pdfsTable.status, "FAILED"))),
      db.select().from(processingJobsTable).where(eq(processingJobsTable.userId, userId)).orderBy(desc(processingJobsTable.createdAt)).limit(5),
    ]);

    res.json({
      totalPdfs: totalPdfsRow?.count ?? 0,
      processingPdfs: processingRow?.count ?? 0,
      completedPdfs: completedRow?.count ?? 0,
      failedPdfs: failedRow?.count ?? 0,
      totalQuestions: 0,
      recentJobs: recentJobs.map((job) => ({
        id: job.id,
        pdfId: job.pdfId ?? null,
        userId: job.userId,
        type: job.type,
        status: job.status,
        progress: job.progress,
        errorMessage: job.errorMessage ?? null,
        startedAt: job.startedAt?.toISOString() ?? null,
        completedAt: job.completedAt?.toISOString() ?? null,
        createdAt: job.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching dashboard stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
