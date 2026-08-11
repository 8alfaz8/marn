'use server';

import { randomUUID } from 'crypto';
import { eq, and, or, desc, inArray, isNull } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireStaff, requireStudioManager, assertMemberInScope } from '@/lib/authz';
import { logAudit } from '@/lib/audit';

/** Roster scoped to the coach: members with a booking or session tied to
 *  them, plus any not-yet-screened member at their site — never phone/email
 *  (docs/adr/0008). The unscreened branch exists because readiness
 *  screening is "completed with a coach at first visit" (blueprint
 *  §4.1.10), and a first-timer has no booking/session yet by definition —
 *  without it, no coach could ever find a new member to screen, and no
 *  member could ever get their first booking (`createBooking` refuses an
 *  unscreened member). Once cleared, ordinary booking/session scoping takes
 *  over. Each row carries `hasOpenFlag` so a coach can see who needs
 *  attention before tapping in (product owner, 2026-08-11: list-level flag
 *  visibility). */
export async function getCoachMembers() {
  const session = await requireStaff();
  if (session.role !== 'coach') return getManagerMembers();

  const [bookingRows, sessionRows] = await Promise.all([
    db
      .selectDistinct({ id: schema.bookings.memberId })
      .from(schema.bookings)
      .where(and(eq(schema.bookings.coachId, session.staffId), eq(schema.bookings.siteId, session.siteId))),
    db
      .selectDistinct({ id: schema.sessions.memberId })
      .from(schema.sessions)
      .where(eq(schema.sessions.coachId, session.staffId)),
  ]);
  const assignedIds = [...new Set([...bookingRows.map((r) => r.id), ...sessionRows.map((r) => r.id)])];

  const members = await db
    .select({ id: schema.members.id, name: schema.members.name, parqCleared: schema.members.parqCleared })
    .from(schema.members)
    .where(
      and(
        eq(schema.members.siteId, session.siteId),
        or(
          assignedIds.length > 0 ? inArray(schema.members.id, assignedIds) : undefined,
          eq(schema.members.parqCleared, false),
        ),
      ),
    );
  if (members.length === 0) return [];

  const ids = members.map((m) => m.id);
  const openFlags = await db
    .selectDistinct({ memberId: schema.flags.memberId })
    .from(schema.flags)
    .where(and(inArray(schema.flags.memberId, ids), isNull(schema.flags.clearedAt)));
  const flagged = new Set(openFlags.map((f) => f.memberId));
  return members.map((m) => ({ ...m, hasOpenFlag: flagged.has(m.id) }));
}

/** Full roster at the manager's site, contact fields included. */
export async function getManagerMembers() {
  const session = await requireStudioManager();
  return db.select().from(schema.members).where(eq(schema.members.siteId, session.siteId)).orderBy(schema.members.name);
}

export async function createMember(input: { name: string; phone: string; email?: string }) {
  const session = await requireStudioManager();
  const id = `mem_${randomUUID()}`;
  await db.insert(schema.members).values({
    id,
    name: input.name,
    phone: input.phone,
    email: input.email || null,
    siteId: session.siteId,
    addedByStaffId: session.staffId,
  });
  return id;
}

export async function setMemberParqCleared(memberId: string, cleared: boolean) {
  const session = await requireStudioManager();
  await assertMemberInScope(session, memberId);
  await db
    .update(schema.members)
    .set({ parqCleared: cleared, parqAt: cleared ? new Date() : null })
    .where(eq(schema.members.id, memberId));
  await logAudit(session.staffId, 'readiness_changed', 'member', memberId);
}

/** Everything a coach needs before a member walks in, in one call: recent
 *  check-ins, session history, latest measurements, and open flags. Member
 *  identity is stripped to name-only for a coach (docs/adr/0008); a studio
 *  manager gets the full row including contact fields. */
export async function getMemberContext(memberId: string) {
  const session = await requireStaff();
  const member = await assertMemberInScope(session, memberId);

  const [checkins, pastSessions, assessments, flags, parqScreenings] = await Promise.all([
    db.select().from(schema.checkins).where(eq(schema.checkins.memberId, memberId)).orderBy(desc(schema.checkins.at)).limit(5),
    db.select().from(schema.sessions).where(eq(schema.sessions.memberId, memberId)).orderBy(desc(schema.sessions.completedAt)).limit(10),
    db.select().from(schema.assessments).where(eq(schema.assessments.memberId, memberId)).orderBy(desc(schema.assessments.capturedAt)).limit(5),
    db.select().from(schema.flags).where(and(eq(schema.flags.memberId, memberId), isNull(schema.flags.clearedAt))),
    db.select().from(schema.parqScreenings).where(eq(schema.parqScreenings.memberId, memberId)).orderBy(desc(schema.parqScreenings.createdAt)).limit(1),
  ]);
  const measurements = assessments.length
    ? await db.select().from(schema.measurements).where(inArray(schema.measurements.assessmentId, assessments.map((a) => a.id)))
    : [];

  const identity =
    session.role === 'studio_manager'
      ? { id: member.id, name: member.name, phone: member.phone, email: member.email }
      : { id: member.id, name: member.name };

  return {
    member: identity,
    parqCleared: member.parqCleared,
    latestParqScreening: parqScreenings[0] ?? null,
    checkins,
    sessions: pastSessions,
    assessments,
    measurements,
    flags,
  };
}
