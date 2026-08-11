import { cookies, headers } from 'next/headers';
import { eq, and } from 'drizzle-orm';
import { auth } from './auth';
import { db, schema } from '@/db';

/* Every server action and route handler authorizes against this, never a
   client-supplied id (Iron Rule: "a member id supplied by the client is an
   input to validate, never a fact"). Session identity comes from
   better-auth's cookie; the business-domain role comes from `staff`, joined
   by authUserId — identity and role are deliberately two different tables
   (blueprint §10.1). */

/** Set by `lib/actions/impersonation.ts`, read only here. httpOnly — never
 *  readable or settable from the browser. Holds a target `staff.id`, and is
 *  worthless on its own: it is honoured only when the request *also* carries
 *  a better-auth session resolving to an active superadmin (docs/adr/0012). */
export const ACT_AS_COOKIE = 'marn_act_as';

/* A discriminated union, not a flat `siteId: string`: `coach`/`studio_manager`
   are always pinned to one site, `superadmin` never is (docs/adr/0011).
   Narrowing on `role` (as `requireStudioManager`/`requireCoach`/
   `requireSuperadmin` do below) gives every existing site-scoped call site
   a guaranteed non-null `session.siteId` with no change needed at the call
   site itself — only `requireStaff`'s callers see the full union.

   `impersonatedBy` is null in the normal case and carries the real
   superadmin when a session is being acted-as (docs/adr/0012). */
type Impersonator = { staffId: string; name: string } | null;

export type StaffSession =
  | { authUserId: string; name: string; staffId: string; role: 'coach'; siteId: string; impersonatedBy: Impersonator }
  | { authUserId: string; name: string; staffId: string; role: 'studio_manager'; siteId: string; impersonatedBy: Impersonator }
  | { authUserId: string; name: string; staffId: string; role: 'superadmin'; siteId: null; impersonatedBy: null };

function toSession(row: typeof schema.staff.$inferSelect, impersonatedBy: Impersonator): StaffSession {
  const base = { authUserId: row.authUserId, name: row.name, staffId: row.id };
  if (row.role === 'superadmin') return { ...base, role: 'superadmin', siteId: null, impersonatedBy: null };
  // Invariant enforced at write time, not by the (now-nullable-for-superadmin)
  // column: a coach/studio_manager row is never created without a siteId.
  if (row.role === 'coach') return { ...base, role: 'coach', siteId: row.siteId as string, impersonatedBy };
  return { ...base, role: 'studio_manager', siteId: row.siteId as string, impersonatedBy };
}

/**
 * The signed-in human, ignoring any active impersonation. Everything that
 * governs impersonation itself must use this rather than `getStaffSession`:
 * while acting as a coach the effective session *says* `coach`, so a
 * `requireSuperadmin()` check against the effective session would refuse to
 * let the real superadmin switch back (docs/adr/0012).
 */
export async function getRealStaffSession(): Promise<StaffSession | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [row] = await db
    .select()
    .from(schema.staff)
    .where(eq(schema.staff.authUserId, session.user.id))
    .limit(1);
  if (!row || !row.active) return null;

  return toSession(row, null);
}

/**
 * The *effective* session — the identity the app should behave as. Identical
 * to `getRealStaffSession` except that an active superadmin carrying a valid
 * act-as cookie is resolved to the target staff member instead.
 *
 * The impersonation check is re-run from scratch on every request, against
 * the live `staff` row: revoking the real account, deactivating it, or
 * deactivating the target ends the impersonation immediately, with no
 * session to invalidate.
 */
export async function getStaffSession(): Promise<StaffSession | null> {
  const real = await getRealStaffSession();
  if (!real || real.role !== 'superadmin') return real;

  const targetId = (await cookies()).get(ACT_AS_COOKIE)?.value;
  if (!targetId) return real;

  const [target] = await db.select().from(schema.staff).where(eq(schema.staff.id, targetId)).limit(1);
  // A stale or hand-set cookie degrades to "no impersonation", never to an
  // error and never to elevated access: only an active coach/studio_manager
  // is impersonable, so this can only ever narrow what the superadmin sees.
  if (!target || !target.active || target.role === 'superadmin') return real;

  return toSession(target, { staffId: real.staffId, name: real.name });
}

/** Where a signed-in session's own console lives — used by the three
 *  role-gated pages so hitting the wrong one redirects to yours instead of
 *  always bouncing to `/coach` (the old two-role assumption). */
export function roleHome(role: StaffSession['role']): '/coach' | '/studio' | '/superadmin' {
  if (role === 'coach') return '/coach';
  if (role === 'studio_manager') return '/studio';
  return '/superadmin';
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
export async function requireStudioManager(): Promise<Extract<StaffSession, { role: 'studio_manager' }>> {
  const session = await requireStaff();
  if (session.role !== 'studio_manager') throw new ForbiddenError('Studio manager only');
  return session;
}

/** Coach-only actions: assessment/session capture, flag management on their own assigned members. */
export async function requireCoach(): Promise<Extract<StaffSession, { role: 'coach' }>> {
  const session = await requireStaff();
  if (session.role !== 'coach') throw new ForbiddenError('Coach only');
  return session;
}

/** Superadmin-only actions: cross-site dashboards, site creation, staff-to-
 *  site assignment (docs/adr/0011). Not site-scoped — `session.siteId` is
 *  `null` for this role. */
export async function requireSuperadmin(): Promise<Extract<StaffSession, { role: 'superadmin' }>> {
  const session = await requireStaff();
  if (session.role !== 'superadmin') throw new ForbiddenError('Superadmin only');
  return session;
}

/** Shared by reads both a studio manager (own site) and a superadmin (any/
 *  all sites) can call — coach workload today (docs/adr/0011). The caller
 *  narrows scope itself by checking `session.role`. */
export async function requireStudioManagerOrSuperadmin(): Promise<
  Extract<StaffSession, { role: 'studio_manager' } | { role: 'superadmin' }>
> {
  const session = await requireStaff();
  if (session.role !== 'studio_manager' && session.role !== 'superadmin') {
    throw new ForbiddenError('Studio manager or superadmin only');
  }
  return session;
}

/**
 * Every per-member read or write goes through this, not just the roster
 * listing — otherwise a coach who already knows another coach's member id
 * could read past it (docs/adr/0008: a coach only ever sees members with a
 * booking or session tied to them, at their own site). Studio managers are
 * scoped to their site only, no per-coach narrowing. A superadmin is not
 * site-scoped at all (docs/adr/0011) — full cross-site access, the same
 * unrestricted read a studio manager has at their own site, just not
 * site-locked.
 */
export async function assertMemberInScope(session: StaffSession, memberId: string) {
  const [member] = await db.select().from(schema.members).where(eq(schema.members.id, memberId)).limit(1);
  if (!member) throw new ForbiddenError('Member not found');
  if (session.role === 'superadmin') return member;
  if (member.siteId !== session.siteId) throw new ForbiddenError('Member not at your site');
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
