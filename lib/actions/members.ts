'use server';

import { randomUUID } from 'crypto';
import { eq, and, desc, inArray, isNull } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireStaff, requireStudioManager, assertMemberInScope } from '@/lib/authz';
import { logAudit } from '@/lib/audit';

/** Roster scoped to the coach: members with a booking or session tied to
 *  them, at their site — never phone/email (docs/adr/0008). */
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
  const ids = [...new Set([...bookingRows.map((r) => r.id), ...sessionRows.map((r) => r.id)])];
  if (ids.length === 0) return [];

  return db
    .select({ id: schema.members.id, name: schema.members.name, parqCleared: schema.members.parqCleared })
    .from(schema.members)
    .where(and(inArray(schema.members.id, ids), eq(schema.members.siteId, session.siteId)));
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

  const [checkins, pastSessions, assessments, flags] = await Promise.all([
    db.select().from(schema.checkins).where(eq(schema.checkins.memberId, memberId)).orderBy(desc(schema.checkins.at)).limit(5),
    db.select().from(schema.sessions).where(eq(schema.sessions.memberId, memberId)).orderBy(desc(schema.sessions.completedAt)).limit(10),
    db.select().from(schema.assessments).where(eq(schema.assessments.memberId, memberId)).orderBy(desc(schema.assessments.capturedAt)).limit(5),
    db.select().from(schema.flags).where(and(eq(schema.flags.memberId, memberId), isNull(schema.flags.clearedAt))),
  ]);
  const measurements = assessments.length
    ? await db.select().from(schema.measurements).where(inArray(schema.measurements.assessmentId, assessments.map((a) => a.id)))
    : [];

  const identity =
    session.role === 'studio_manager'
      ? { id: member.id, name: member.name, phone: member.phone, email: member.email }
      : { id: member.id, name: member.name };

  return { member: identity, parqCleared: member.parqCleared, checkins, sessions: pastSessions, assessments, measurements, flags };
}
