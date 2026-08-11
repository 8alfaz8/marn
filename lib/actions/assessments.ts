'use server';

import { randomUUID } from 'crypto';
import { db, schema } from '@/db';
import { requireCoach, assertMemberInScope } from '@/lib/authz';
import { fromManualEntry } from '@/lib/integrations/bodymap';
import { logAudit } from '@/lib/audit';

export async function createManualAssessment(memberId: string, raw: { key: string; value: number }[]) {
  const session = await requireCoach();
  await assertMemberInScope(session, memberId);

  const normalised = fromManualEntry(raw);
  const assessmentId = `asm_${randomUUID()}`;
  const now = new Date();

  await db.insert(schema.assessments).values({
    id: assessmentId,
    memberId,
    staffId: session.staffId,
    siteId: session.siteId,
    capturedAt: now,
  });

  if (normalised.measurements.length > 0) {
    await db.insert(schema.measurements).values(
      normalised.measurements.map((m) => ({
        assessmentId,
        memberId,
        muscleKey: m.muscleKey,
        degrees: m.degrees,
        target: m.target,
        source: normalised.source,
        instrument: normalised.instrument,
        protocolVersion: normalised.protocolVersion,
        measuredAt: now,
        measuredBy: session.staffId,
      })),
    );
  }

  await logAudit(session.staffId, 'assessment_created', 'assessment', assessmentId);
  return assessmentId;
}
