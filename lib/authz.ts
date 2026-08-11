import { headers } from 'next/headers';
import { eq, and } from 'drizzle-orm';
import { auth } from './auth';
import { db, schema } from '@/db';

/* Every server action and route handler authorizes against this, never a
   client-supplied id (Iron Rule: "a member id supplied by the client is an
   input to validate, never a fact"). Session identity comes from
   better-auth's cookie; the business-domain role comes from `staff`, joined
   by authUserId — identity and role are deliberately two different tables
   (blueprint §10.1). */

export type StaffSession = {
  authUserId: string;
  name: string;
  staffId: string;
  role: typeof schema.staff.$inferSelect.role;
  siteId: string;
};

export async function getStaffSession(): Promise<StaffSession | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [row] = await db
    .select()
    .from(schema.staff)
    .where(eq(schema.staff.authUserId, session.user.id))
    .limit(1);
  if (!row || !row.active) return null;

  return { authUserId: row.authUserId, name: row.name, staffId: row.id, role: row.role, siteId: row.siteId };
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Not signed in');
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Not permitted for this role') {
    super(message);
  }
}

/** Any active staff member — coach or studio manager. */
export async function requireStaff(): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

/** Studio-manager-only actions: shift assignment, booking approval, staff/member CRM with
 *  contact/payment, capacity and earnings — per docs/adr/0008-studio-manager-role.md. */
export async function requireStudioManager(): Promise<StaffSession> {
  const session = await requireStaff();
  if (session.role !== 'studio_manager') throw new ForbiddenError('Studio manager only');
  return session;
}

/** Coach-only actions: assessment/session capture, flag management on their own assigned members. */
export async function requireCoach(): Promise<StaffSession> {
  const session = await requireStaff();
  if (session.role !== 'coach') throw new ForbiddenError('Coach only');
  return session;
}

/**
 * Every per-member read or write goes through this, not just the roster
 * listing — otherwise a coach who already knows another coach's member id
 * could read past it (docs/adr/0008: a coach only ever sees members with a
 * booking or session tied to them, at their own site). Studio managers are
 * scoped to their site only, no per-coach narrowing.
 */
export async function assertMemberInScope(session: StaffSession, memberId: string) {
  const [member] = await db.select().from(schema.members).where(eq(schema.members.id, memberId)).limit(1);
  if (!member || member.siteId !== session.siteId) throw new ForbiddenError('Member not at your site');
  if (session.role === 'studio_manager') return member;

  const [booking] = await db
    .select({ id: schema.bookings.id })
    .from(schema.bookings)
    .where(and(eq(schema.bookings.memberId, memberId), eq(schema.bookings.coachId, session.staffId)))
    .limit(1);
  if (booking) return member;

  const [sessionRow] = await db
    .select({ id: schema.sessions.id })
    .from(schema.sessions)
    .where(and(eq(schema.sessions.memberId, memberId), eq(schema.sessions.coachId, session.staffId)))
    .limit(1);
  if (sessionRow) return member;

  throw new ForbiddenError('Member not assigned to you');
}
