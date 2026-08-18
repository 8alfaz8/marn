'use server';

import { randomUUID } from 'crypto';
import { eq, and, desc, inArray, isNull } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireStaff, requireStudioManager, assertMemberInScope } from '@/lib/authz';
import { logAudit } from '@/lib/audit';

/** Roster scoped to the coach: members with a booking or session tied to
 *  them anywhere, any not-yet-screened member at their own site, or a
 *  member this coach most recently PAR-Q screened themselves — never
 *  phone/email (docs/adr/0008).
 *
 *  **Two differently-filtered branches, unioned in JS, not one shared site
 *  filter** (`docs/adr/0018` point 4, 2026-08-19): a member can now book at
 *  any studio, so the booking/session/screened-by-me tie no longer implies
 *  "at this coach's site" — that branch is company-wide. The unscreened
 *  branch stays site-filtered on purpose: screening happens in person, at
 *  a physical location, so "every unscreened member in the company" in
 *  every coach's queue would be noise, not access control — a coach could
 *  already open any of those records directly via `assertMemberInScope`
 *  (open roster, same ADR point 3) if they had a reason to. This is a UX
 *  default for the queue, not a security boundary.
 *
 *  The unscreened branch exists because readiness screening is "completed
 *  with a coach at first visit" (blueprint §4.1.10), and a first-timer has
 *  no booking/session yet by definition — without it, no coach could ever
 *  find a new member to screen, and no member could ever get their first
 *  booking (`createBooking` refuses an unscreened member).
 *
 *  The "most recently screened by me" branch exists because clearing a
 *  member flips them out of the unscreened branch *immediately*, before
 *  any booking/session exists — without it, a coach's own member vanishes
 *  from their roster the instant they finish the screening, mid-visit. A
 *  second bug caught via browser-driven verification (`docs/decisions.md`,
 *  2026-08-12), same mismatch as the first: "cleared" isn't the same
 *  moment as "has an ordinary booking/session tie." `assertMemberInScope`
 *  (`lib/authz.ts`) no longer needs a matching fix of its own — open
 *  roster means it doesn't narrow by coach at all any more — but this
 *  roster query still needs its own screened-by-me branch so the member
 *  shows up in the list, not just remains individually reachable.
 *
 *  Each row carries `hasOpenFlag` so a coach can see who needs attention
 *  before tapping in (product owner, 2026-08-11: list-level flag visibility). */
export async function getCoachMembers() {
  const session = await requireStaff();
  if (session.role !== 'coach') return getManagerMembers();

  const [bookingRows, sessionRows, screenedRows] = await Promise.all([
    db
      .selectDistinct({ id: schema.bookings.memberId })
      .from(schema.bookings)
      .where(eq(schema.bookings.coachId, session.staffId)),
    db
      .selectDistinct({ id: schema.sessions.memberId })
      .from(schema.sessions)
      .where(eq(schema.sessions.coachId, session.staffId)),
    // Latest screening per member, then keep only the ones this coach did —
    // "most recent screener" can't be expressed as a simple WHERE, so this
    // resolves it in JS rather than a correlated subquery per member.
    db
      .select({ memberId: schema.parqScreenings.memberId, staffId: schema.parqScreenings.staffId, createdAt: schema.parqScreenings.createdAt })
      .from(schema.parqScreenings)
      .orderBy(desc(schema.parqScreenings.createdAt)),
  ]);
  const latestScreenerByMember = new Map<string, string>();
  for (const row of screenedRows) {
    if (!latestScreenerByMember.has(row.memberId)) latestScreenerByMember.set(row.memberId, row.staffId);
  }
  const screenedByMeIds = [...latestScreenerByMember.entries()].filter(([, staffId]) => staffId === session.staffId).map(([memberId]) => memberId);

  const assignedIds = [...new Set([...bookingRows.map((r) => r.id), ...sessionRows.map((r) => r.id), ...screenedByMeIds])];

  const [assignedMembers, unscreenedMembers] = await Promise.all([
    assignedIds.length > 0
      ? db
          .select({ id: schema.members.id, name: schema.members.name, parqCleared: schema.members.parqCleared })
          .from(schema.members)
          .where(inArray(schema.members.id, assignedIds))
      : Promise.resolve([]),
    db
      .select({ id: schema.members.id, name: schema.members.name, parqCleared: schema.members.parqCleared })
      .from(schema.members)
      .where(and(eq(schema.members.siteId, session.siteId), eq(schema.members.parqCleared, false))),
  ]);
  const members = [...new Map([...assignedMembers, ...unscreenedMembers].map((m) => [m.id, m])).values()];
  if (members.length === 0) return [];

  const ids = members.map((m) => m.id);
  const openFlags = await db
    .selectDistinct({ memberId: schema.flags.memberId })
    .from(schema.flags)
    .where(and(inArray(schema.flags.memberId, ids), isNull(schema.flags.clearedAt)));
  const flagged = new Set(openFlags.map((f) => f.memberId));
  return members.map((m) => ({ ...m, hasOpenFlag: flagged.has(m.id) }));
}

/** Roster at `siteId` (contact fields included), defaulted to the manager's
 *  own site if omitted — a UX default, not a security gate: open roster
 *  (`docs/adr/0018` point 3) already lets a manager open any member's
 *  record regardless of site, this just controls what the list shows by
 *  default so it doesn't dump the whole company's roster (point 5). */
export async function getManagerMembers(siteId?: string) {
  const session = await requireStudioManager();
  const scopedSiteId = siteId ?? session.siteId;
  return db.select().from(schema.members).where(eq(schema.members.siteId, scopedSiteId)).orderBy(schema.members.name);
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

  const [checkins, pastSessions, assessments, flags, parqScreenings, programs] = await Promise.all([
    db.select().from(schema.checkins).where(eq(schema.checkins.memberId, memberId)).orderBy(desc(schema.checkins.at)).limit(5),
    db.select().from(schema.sessions).where(eq(schema.sessions.memberId, memberId)).orderBy(desc(schema.sessions.completedAt)).limit(10),
    db.select().from(schema.assessments).where(eq(schema.assessments.memberId, memberId)).orderBy(desc(schema.assessments.capturedAt)).limit(5),
    db.select().from(schema.flags).where(and(eq(schema.flags.memberId, memberId), isNull(schema.flags.clearedAt))),
    db.select().from(schema.parqScreenings).where(eq(schema.parqScreenings.memberId, memberId)).orderBy(desc(schema.parqScreenings.createdAt)).limit(1),
    db.select().from(schema.programs).where(eq(schema.programs.memberId, memberId)).orderBy(desc(schema.programs.assignedAt)).limit(1),
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
    program: programs[0] ?? null,
    checkins,
    sessions: pastSessions,
    assessments,
    measurements,
    flags,
  };
}
