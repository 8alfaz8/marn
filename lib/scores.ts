import { eq, desc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { computeScores, priorityAreas as priorityAreasOf } from '@/lib/scoring';

/**
 * Loads the inputs the scoring engine needs and computes a member's current
 * scores. Not a 'use server' action itself — callers (staff actions, the
 * token-gated member portal) do their own authorization first and call this
 * as a plain data helper.
 *
 * `adherence` and `streak` are both home-programme-fed inputs (blueprint
 * §4.1.6, §5.4) and home programmes aren't built at root yet (Phase 2) — both
 * default to 0 rather than being estimated from session attendance, so the
 * number stays honest about what it's actually measuring until that data
 * exists. Same for `hasWearable` (§4.1.9, Phase 3). `recentRpe` is real: the
 * most recently logged session's reported effort.
 */
export async function getMemberScores(memberId: string) {
  const [latestAssessment] = await db
    .select()
    .from(schema.assessments)
    .where(eq(schema.assessments.memberId, memberId))
    .orderBy(desc(schema.assessments.capturedAt))
    .limit(1);

  const measurements = latestAssessment
    ? await db.select().from(schema.measurements).where(eq(schema.measurements.assessmentId, latestAssessment.id))
    : [];

  const [lastSession] = await db
    .select({ rpe: schema.sessions.rpe })
    .from(schema.sessions)
    .where(eq(schema.sessions.memberId, memberId))
    .orderBy(desc(schema.sessions.completedAt))
    .limit(1);

  const scores = computeScores({
    measurements,
    adherence: 0,
    hasWearable: false,
    recentRpe: lastSession?.rpe ?? 5,
    streak: 0,
  });

  return {
    scores,
    priorityAreas: priorityAreasOf(measurements),
    assessedAt: latestAssessment?.capturedAt ?? null,
    measurements,
  };
}
