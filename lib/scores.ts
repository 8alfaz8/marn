import { eq, desc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { computeScores, priorityAreas as priorityAreasOf } from '@/lib/scoring';

const ADHERENCE_WINDOW_DAYS = 28;

/**
 * Loads the inputs the scoring engine needs and computes a member's current
 * scores. Not a 'use server' action itself — callers (staff actions, the
 * token-gated member portal) do their own authorization first and call this
 * as a plain data helper.
 *
 * `adherence`/`consistency` now read real data from the member's latest
 * `programs` row, if one exists — completions-in-28-days ÷
 * expected-in-28-days, cadence-per-week derived from `moves.length`
 * (the blueprint gives no explicit cadence field; see docs/decisions.md
 * for that judgment call). Still `0` with no program assigned — same
 * honest-placeholder principle as before, just no longer permanently so.
 * `streak` stays `0` (no dedicated streak concept built yet) and
 * `hasWearable` stays `false` (§4.1.9, Phase 3, still unbuilt). `recentRpe`
 * is real: the most recently logged session's reported effort.
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

  const [program] = await db
    .select()
    .from(schema.programs)
    .where(eq(schema.programs.memberId, memberId))
    .orderBy(desc(schema.programs.assignedAt))
    .limit(1);

  const cadencePerWeek = program?.moves.length ?? 0;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ADHERENCE_WINDOW_DAYS);
  const recentCompletions = (program?.completions ?? []).filter((iso) => new Date(iso) >= cutoff);
  const expected = cadencePerWeek * (ADHERENCE_WINDOW_DAYS / 7);
  const adherence = expected > 0 ? Math.min(1, recentCompletions.length / expected) : 0;

  const scores = computeScores({
    measurements,
    adherence,
    hasWearable: false,
    recentRpe: lastSession?.rpe ?? 5,
    streak: 0,
    completions: program?.completions ?? [],
    cadencePerWeek,
  });

  return {
    scores,
    priorityAreas: priorityAreasOf(measurements),
    assessedAt: latestAssessment?.capturedAt ?? null,
    measurements,
  };
}
