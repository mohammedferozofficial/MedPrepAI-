import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export async function getOrCreateUser(clerkUserId: string, email: string, fullName?: string | null, avatarUrl?: string | null) {
  const existing = await db.select().from(usersTable).where(eq(usersTable.id, clerkUserId)).limit(1);
  if (existing.length > 0) return existing[0];

  const [user] = await db.insert(usersTable).values({
    id: clerkUserId,
    email,
    fullName: fullName ?? null,
    avatarUrl: avatarUrl ?? null,
    role: "student",
  }).returning();

  await db.insert(profilesTable).values({
    userId: user.id,
  });

  return user;
}
