'use server';

import { randomUUID } from 'crypto';
import { eq, desc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireCoach, assertMemberInScope } from '@/lib/authz';
import { logAudit } from '@/lib/audit';
import { PARQ_QUESTIONS } from '@/lib/reference';

/**
 * Readiness screening (blueprint §4.1.10) — "completed with a coach", a
 * referral gate rather than a liability form (§1.4/§1.5). A `true` answer to
 * any question marked `redFlag` in PARQ_QUESTIONS means the member is not
 * cleared: `members.parqCleared` is set false regardless of the other
 * answers, and there is no workaround — a red flag routes to a human
 * (a physician), it does not get cleared from within the product. A clean
 * screening clears the member immediately, staff-attributed, no expiry.
 */
export async function submitParqScreening(memberId: string, answers: Record<string, boolean>, note?: string) {
  const session = await requireCoach();
  await assertMemberInScope(session, memberId);

  const redFlag = PARQ_QUESTIONS.some((q) => q.redFlag && answers[q.key] === true);
  const id = `prq_${randomUUID()}`;

  await db.insert(schema.parqScreenings).values({
    id,
    memberId,
    staffId: session.staffId,
    siteId: session.siteId,
    answers,
    redFlag,
    note: note?.trim() || null,
  });

  await db
    .update(schema.members)
    .set({ parqCleared: !redFlag, parqAt: redFlag ? null : new Date() })
    .where(eq(schema.members.id, memberId));

  await logAudit(session.staffId, 'readiness_changed', 'member', memberId);
  return { id, redFlag };
}

/** Most recent screening for a member, if any — used to show the referral
 *  note and who last screened them, not just the boolean status. */
export async function getLatestParqScreening(memberId: string) {
  const session = await requireCoach();
  await assertMemberInScope(session, memberId);
  const [latest] = await db
    .select()
    .from(schema.parqScreenings)
    .where(eq(schema.parqScreenings.memberId, memberId))
    .orderBy(desc(schema.parqScreenings.createdAt))
    .limit(1);
  return latest ?? null;
}
