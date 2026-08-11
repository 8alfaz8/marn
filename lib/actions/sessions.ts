'use server';

import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireCoach, assertMemberInScope } from '@/lib/authz';
import { logAudit } from '@/lib/audit';

/**
 * Blueprint §4.2.4 also lists "decrements credits, advances streak,
 * recomputes scores" — all out of scope for this staff-side slice (no
 * credits/payments table per docs/adr/0007, no member-facing progress
 * surface yet per docs/adr/0008's staff-only scope). This closes the
 * booking and writes the session; the rest is member-app territory for a
 * later phase.
 */
export async function logSession(input: {
  memberId: string;
  bookingId?: string;
  completedAt: string;
  mins: number;
  modalities: string[];
  rpe: number;
  painBefore: number;
  painAfter: number;
  coachNotes?: string;
  memberSummary: string;
}) {
  const session = await requireCoach();
  await assertMemberInScope(session, input.memberId);

  const summary = input.memberSummary.trim();
  if (!summary) throw new Error('A member-facing summary is required to log a session.');

  const id = `ses_${randomUUID()}`;
  await db.insert(schema.sessions).values({
    id,
    memberId: input.memberId,
    coachId: session.staffId,
    bookingId: input.bookingId || null,
    completedAt: new Date(input.completedAt),
    mins: input.mins,
    modalities: input.modalities,
    rpe: input.rpe,
    painBefore: input.painBefore,
    painAfter: input.painAfter,
    coachNotes: input.coachNotes || null,
    memberSummary: summary,
  });

  if (input.bookingId) {
    await db.update(schema.bookings).set({ status: 'completed' }).where(eq(schema.bookings.id, input.bookingId));
  }

  await logAudit(session.staffId, 'session_logged', 'session', id);
  return id;
}
