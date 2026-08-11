'use server';

import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { ACT_AS_COOKIE, ForbiddenError, getRealStaffSession, getStaffSession } from '@/lib/authz';
import { logAudit } from '@/lib/audit';

/* Superadmin "act as" — see docs/adr/0012-superadmin-impersonation.md.

   Everything here authorizes against `getRealStaffSession()`, never
   `getStaffSession()`: while acting as a coach the effective session reports
   `role: 'coach'`, and gating on that would strand the real superadmin with
   no way back. The real session is the only thing that grants any of this. */

async function requireRealSuperadmin() {
  const real = await getRealStaffSession();
  if (!real || real.role !== 'superadmin') throw new ForbiddenError('Superadmin only');
  return real;
}

/** Everyone a superadmin can act as: active coaches and studio managers,
 *  across every site. Superadmins are excluded — impersonating a peer would
 *  gain nothing and muddies who really acted. */
export async function getImpersonationOptions() {
  await requireRealSuperadmin();
  const [staff, sites] = await Promise.all([
    db.select().from(schema.staff).orderBy(schema.staff.name),
    db.select().from(schema.sites),
  ]);
  const siteName = new Map(sites.map((s) => [s.id, s.name]));
  return staff
    .filter((s) => s.active && s.role !== 'superadmin')
    .map((s) => ({
      staffId: s.id,
      name: s.name,
      role: s.role as 'coach' | 'studio_manager',
      siteName: s.siteId ? siteName.get(s.siteId) ?? s.siteId : null,
    }));
}

/** What the chrome needs to render the switcher: null for anyone who isn't
 *  really a superadmin, so no other role ever sees the control. */
export async function getImpersonationContext() {
  const real = await getRealStaffSession();
  if (!real || real.role !== 'superadmin') return null;

  const effective = await getStaffSession();
  return {
    options: await getImpersonationOptions(),
    activeStaffId: effective && effective.impersonatedBy ? effective.staffId : null,
    activeName: effective && effective.impersonatedBy ? effective.name : null,
  };
}

export async function startImpersonation(staffId: string) {
  const real = await requireRealSuperadmin();

  const [target] = await db.select().from(schema.staff).where(eq(schema.staff.id, staffId)).limit(1);
  if (!target || !target.active) throw new Error('That staff account is not available.');
  if (target.role === 'superadmin') throw new Error('Superadmin accounts cannot be acted as.');

  (await cookies()).set(ACT_AS_COOKIE, target.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  // The real superadmin is the actor, always — the audit trail records who
  // actually did this, not the borrowed identity (Iron Rule: authorization
  // and accountability are server-side facts, never the client's claim).
  await logAudit(real.staffId, 'staff_impersonated', 'staff', target.id);
}

export async function stopImpersonation() {
  await requireRealSuperadmin();
  (await cookies()).delete(ACT_AS_COOKIE);
}
