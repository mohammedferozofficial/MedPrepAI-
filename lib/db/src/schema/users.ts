import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const membershipTierEnum = pgEnum("membership_tier", ["free", "pro"]);

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("student"),
  membershipTier: membershipTierEnum("membership_tier").notNull().default("free"),
  membershipExpiresAt: timestamp("membership_expires_at", { withTimezone: true }),
  razorpayCustomerId: text("razorpay_customer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const profilesTable = pgTable("profiles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  collegeName: text("college_name"),
  yearOfStudy: integer("year_of_study"),
  examTarget: text("exam_target"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true, updatedAt: true });
export const updateUserSchema = createInsertSchema(usersTable).pick({ fullName: true, avatarUrl: true }).partial();
export const updateProfileSchema = createInsertSchema(profilesTable).pick({ collegeName: true, yearOfStudy: true, examTarget: true }).partial();

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type Profile = typeof profilesTable.$inferSelect;
