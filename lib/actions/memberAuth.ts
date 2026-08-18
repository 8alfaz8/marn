'use server';

import { randomUUID } from 'crypto';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { auth } from '@/lib/auth';
import { notifyRecorded } from '@/lib/integrations/notifications';

/**
 * Self-registration, second half (blueprint Phase 2 exit criterion — "a
 * member joins... with no staff intervention"). The first half runs
 * client-side: `app/join/page.tsx` calls `authClient.signUp.email(...)`
 * directly (not a server action) specifically so the browser receives and
 * stores the session cookie the normal way — a server action calling
 * `auth.api.signUpEmail` has no request/response cycle to attach that
 * cookie to. This action runs immediately after, already authenticated,
 * and does only the domain-specific part: read the live session, insert
 * the `members` row with `authUserId` set and `addedByStaffId` left null
 * (the self-registered counterpart to Phase 1's staff-added path).
 *
 * Not audit-logged: `audit_log.actorStaffId` is a non-null foreign key to
 * `staff`, and self-registration has no staff actor to attribute it to —
 * `members.createdAt` is the record of when this happened. Not a gap, a
 * boundary: audit_log tracks staff actions on member data, not members'
 * own actions on their own data.
 */
export async function completeMemberRegistration(input: { phone: string; siteId: string }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('Sign-up did not complete. Try again.');

  const [existing] = await db.select({ id: schema.members.id }).from(schema.members).where(eq(schema.members.authUserId, session.user.id)).limit(1);
  if (existing) return existing.id;

  const id = `mem_${randomUUID()}`;
  await db.insert(schema.members).values({
    id,
    name: session.user.name,
    phone: input.phone,
    email: session.user.email,
    authUserId: session.user.id,
    siteId: input.siteId,
  });

  await notifyRecorded({ memberId: id, template: 'welcome', channel: 'whatsapp', payload: {} });
  return id;
}

/** Public — feeds the /join site picker. No auth needed to see the list of
 *  studios one can join. */
export async function getActiveSites() {
  return db
    .select({ id: schema.sites.id, name: schema.sites.name, city: schema.sites.city })
    .from(schema.sites)
    .where(eq(schema.sites.active, true))
    .orderBy(schema.sites.name);
}
