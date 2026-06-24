import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "../lib/auth";

const router = Router();

router.get("/users/me", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth.userId!;

  try {
    const claims = auth.sessionClaims as Record<string, unknown> | null;
    const email = (claims?.email as string) ?? "";
    const fullName = (claims?.name as string) ?? null;
    const avatarUrl = (claims?.picture as string) ?? null;

    const user = await getOrCreateUser(clerkUserId, email, fullName, avatarUrl);

    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, user.id)).limit(1);

    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      collegeName: profile?.collegeName ?? null,
      yearOfStudy: profile?.yearOfStudy ?? null,
      examTarget: profile?.examTarget ?? null,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching user profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/me", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const clerkUserId = auth.userId!;

  try {
    const { fullName, collegeName, yearOfStudy, examTarget } = req.body;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, clerkUserId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (fullName !== undefined) {
      await db.update(usersTable).set({ fullName }).where(eq(usersTable.id, clerkUserId));
    }

    const profileUpdates: Record<string, unknown> = {};
    if (collegeName !== undefined) profileUpdates.collegeName = collegeName;
    if (yearOfStudy !== undefined) profileUpdates.yearOfStudy = yearOfStudy;
    if (examTarget !== undefined) profileUpdates.examTarget = examTarget;

    if (Object.keys(profileUpdates).length > 0) {
      await db.update(profilesTable).set(profileUpdates).where(eq(profilesTable.userId, clerkUserId));
    }

    const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, clerkUserId)).limit(1);
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, clerkUserId)).limit(1);

    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      avatarUrl: updatedUser.avatarUrl,
      role: updatedUser.role,
      collegeName: profile?.collegeName ?? null,
      yearOfStudy: profile?.yearOfStudy ?? null,
      examTarget: profile?.examTarget ?? null,
      createdAt: updatedUser.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error updating user profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
