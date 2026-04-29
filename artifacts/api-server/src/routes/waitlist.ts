import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, waitlistSignups } from "@workspace/db";
import { JoinWaitlistBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function badRequest(error: string, message: string) {
  return { error, message };
}

router.post("/waitlist", async (req, res) => {
  const parsed = JoinWaitlistBody.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json(badRequest("invalid_body", parsed.error.issues.map((i) => i.message).join("; ")));
  }

  const email = parsed.data.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length < 3 || email.length > 320) {
    return res
      .status(400)
      .json(badRequest("invalid_email", "Please enter a valid email address."));
  }

  const role = parsed.data.role?.trim() || null;
  const company = parsed.data.company?.trim() || null;
  const referrer = parsed.data.referrer?.trim() || null;

  try {
    const inserted = await db
      .insert(waitlistSignups)
      .values({ email, role, company, referrer })
      .onConflictDoNothing({ target: waitlistSignups.email })
      .returning();

    let row = inserted[0];
    let alreadySignedUp = false;
    if (!row) {
      const existing = await db
        .select()
        .from(waitlistSignups)
        .where(sql`${waitlistSignups.email} = ${email}`)
        .limit(1);
      row = existing[0];
      alreadySignedUp = true;
    }

    if (!row) {
      logger.error({ email }, "waitlist insert returned nothing and no existing row found");
      return res
        .status(500)
        .json(badRequest("server_error", "Could not save your signup. Please try again."));
    }

    const totalRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(waitlistSignups);
    const totalSignups = totalRows[0]?.count ?? 0;

    return res.json({
      id: String(row.id),
      email: row.email,
      position: row.id,
      totalSignups,
      alreadySignedUp,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "waitlist signup failed");
    return res
      .status(500)
      .json(badRequest("server_error", "Could not save your signup. Please try again."));
  }
});

router.get("/waitlist/stats", async (_req, res) => {
  try {
    const rows = await db
      .select({
        count: sql<number>`count(*)::int`,
        last: sql<Date | null>`max(${waitlistSignups.createdAt})`,
      })
      .from(waitlistSignups);
    const totalSignups = rows[0]?.count ?? 0;
    const lastSignupAt = rows[0]?.last ? rows[0].last.toISOString() : "";
    return res.json({ totalSignups, lastSignupAt });
  } catch (err) {
    logger.error({ err }, "waitlist stats failed");
    return res.status(500).json({ totalSignups: 0, lastSignupAt: "" });
  }
});

export default router;
