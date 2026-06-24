import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { processingJobsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/jobs", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const userId = auth.userId!;
  const { status, pdfId, limit = "20" } = req.query as Record<string, string>;

  try {
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const conditions = [eq(processingJobsTable.userId, userId)];
    if (status) conditions.push(eq(processingJobsTable.status, status as any));
    if (pdfId) conditions.push(eq(processingJobsTable.pdfId, pdfId));

    const jobs = await db.select().from(processingJobsTable)
      .where(and(...conditions))
      .orderBy(desc(processingJobsTable.createdAt))
      .limit(limitNum);

    res.json(jobs.map(serializeJob));
  } catch (err) {
    req.log.error({ err }, "Error listing jobs");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/jobs/:id", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const userId = auth.userId!;
  const id = req.params.id as string;

  try {
    const [job] = await db.select().from(processingJobsTable)
      .where(and(eq(processingJobsTable.id, id), eq(processingJobsTable.userId, userId)))
      .limit(1);

    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(serializeJob(job));
  } catch (err) {
    req.log.error({ err }, "Error fetching job");
    res.status(500).json({ error: "Internal server error" });
  }
});

function serializeJob(job: any) {
  return {
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
  };
}

export default router;
