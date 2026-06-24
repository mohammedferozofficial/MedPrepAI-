import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

const PLANS = {
  monthly: { amount: 29900, currency: "INR", days: 30, label: "MedPrep Pro - Monthly" },
  annual: { amount: 249900, currency: "INR", days: 365, label: "MedPrep Pro - Annual" },
} as const;

type PlanKey = keyof typeof PLANS;

router.post("/create-order", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const plan = req.body.plan as PlanKey;
  if (!plan || !PLANS[plan]) {
    return res.status(400).json({ error: "Invalid plan. Must be 'monthly' or 'annual'." });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(503).json({ error: "Payment gateway not configured. Please contact support." });
  }

  let razorpay: Razorpay;
  try {
    razorpay = getRazorpay();
  } catch (err: any) {
    return res.status(503).json({ error: err.message });
  }

  const planConfig = PLANS[plan];

  const order = await razorpay.orders.create({
    amount: planConfig.amount,
    currency: planConfig.currency,
    notes: { userId, plan },
  });

  res.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId,
    plan,
  });
});

router.post("/verify", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { orderId, paymentId, signature, plan } = req.body as {
    orderId: string;
    paymentId: string;
    signature: string;
    plan: PlanKey;
  };

  if (!orderId || !paymentId || !signature || !plan || !PLANS[plan]) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return res.status(503).json({ error: "Payment gateway not configured" });
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (expectedSignature !== signature) {
    return res.status(400).json({ error: "Invalid payment signature" });
  }

  const planConfig = PLANS[plan];
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + planConfig.days);

  await db
    .update(usersTable)
    .set({
      membershipTier: "pro",
      membershipExpiresAt: expiresAt,
    })
    .where(eq(usersTable.id, userId));

  res.json({ success: true, membershipTier: "pro", expiresAt });
});

router.get("/status", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db
    .select({
      membershipTier: usersTable.membershipTier,
      membershipExpiresAt: usersTable.membershipExpiresAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) return res.status(404).json({ error: "User not found" });

  const now = new Date();
  const isActive =
    user.membershipTier === "pro" &&
    (!user.membershipExpiresAt || user.membershipExpiresAt > now);

  res.json({
    tier: isActive ? "pro" : "free",
    expiresAt: user.membershipExpiresAt,
  });
});

export default router;
