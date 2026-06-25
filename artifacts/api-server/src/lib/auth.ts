import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable, profilesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export async function getOrCreateUser(
  clerkUserId: string,
  email: string,
  fullName?: string | null,
  avatarUrl?: string | null,
) {
  // Use upsert to avoid race conditions when concurrent requests both attempt to create the same user.
  // ON CONFLICT on the primary key (id) — update metadata if user already exists.
  const [user] = await db
    .insert(usersTable)
    .values({
      id: clerkUserId,
      email: email || "",
      fullName: fullName ?? null,
      avatarUrl: avatarUrl ?? null,
      role: "student",
    })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        // Only overwrite with non-empty values to avoid clobbering existing data
        email: sql`CASE WHEN ${usersTable.email} = '' OR ${usersTable.email} IS NULL THEN EXCLUDED.email ELSE ${usersTable.email} END`,
        fullName: sql`COALESCE(EXCLUDED.full_name, ${usersTable.fullName})`,
        avatarUrl: sql`COALESCE(EXCLUDED.avatar_url, ${usersTable.avatarUrl})`,
        updatedAt: new Date(),
      },
    })
    .returning();

  // Create profile record if it doesn't exist yet (idempotent)
  await db
    .insert(profilesTable)
    .values({ userId: user.id })
    .onConflictDoNothing();

  return user;
}
