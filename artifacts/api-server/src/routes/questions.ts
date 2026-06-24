import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { questionsTable, pdfsTable } from "@workspace/db";
import { eq, and, count, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/questions", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const userId = auth.userId!;
  const { pdfId, topic, limit = "50", page = "1" } = req.query as Record<string, string>;

  try {
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(questionsTable.userId, userId)];
    if (pdfId) conditions.push(eq(questionsTable.pdfId, pdfId));
    if (topic) conditions.push(eq(questionsTable.topic, topic));

    const whereClause = and(...conditions);

    const [items, [totalRow]] = await Promise.all([
      db.select().from(questionsTable).where(whereClause)
        .orderBy(desc(questionsTable.createdAt))
        .limit(limitNum).offset(offset),
      db.select({ count: count() }).from(questionsTable).where(whereClause),
    ]);

    res.json({
      items,
      total: totalRow?.count ?? 0,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error({ err }, "Error listing questions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/questions/:id", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const userId = auth.userId!;
  const id = req.params.id as string;

  try {
    const [q] = await db.select().from(questionsTable)
      .where(and(eq(questionsTable.id, id), eq(questionsTable.userId, userId)))
      .limit(1);

    if (!q) {
      res.status(404).json({ error: "Question not found" });
      return;
    }
    res.json(q);
  } catch (err) {
    req.log.error({ err }, "Error fetching question");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
