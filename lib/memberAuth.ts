import { headers } from 'next/headers';
import { eq, desc } from 'drizzle-orm';
import { auth } from './auth';
import { db, schema } from '@/db';

/* Member identity, mirroring lib/authz.ts's shape but not its content —
   members and staff are separate domain tables joined to the SAME
   better-auth session/user tables (docs/adr/0014), never conflated. A
   staff person's session resolves here to `null` (no `members` row for
   their authUserId) exactly as a member's session resolves to `null`
   against lib/authz.ts's resolvers — two disjoint domains sharing one
   identity/session mechanism, not one merged domain. */

export type MemberSession = {
  authUserId: string;
  memberId: string;
  name: string;
  siteId: string;
  parqCleared: boolean;
  /* Distinguishes "never screened yet" from "screened, and referred to a
     doctor" — `parqCleared: false` alone can't tell those apart, and a
     member who was referred should see that, not a generic "pending". */
  referredToDoctor: boolean;
};

export class UnauthorizedError extends Error {
  constructor() {
    super('Not signed in');
  }
}

export async function getMemberSession(): Promise<MemberSession | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [row] = await db
    .select()
    .from(schema.members)
    .where(eq(schema.members.authUserId, session.user.id))
    .limit(1);
  if (!row) return null;

  let referredToDoctor = false;
  if (!row.parqCleared) {
    const [latest] = await db
      .select({ redFlag: schema.parqScreenings.redFlag })
      .from(schema.parqScreenings)
      .where(eq(schema.parqScreenings.memberId, row.id))
      .orderBy(desc(schema.parqScreenings.createdAt))
      .limit(1);
    referredToDoctor = latest?.redFlag ?? false;
  }

  return {
    authUserId: session.user.id,
    memberId: row.id,
    name: row.name,
    siteId: row.siteId,
    parqCleared: row.parqCleared,
    referredToDoctor,
  };
}

export async function requireMember(): Promise<MemberSession> {
  const session = await getMemberSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
