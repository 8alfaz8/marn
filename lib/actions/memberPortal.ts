'use server';

import { eq, isNull, and, desc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { getMemberScores } from '@/lib/scores';

/**
 * The Phase 1 member portal's only entry point (docs/adr/0013). No staff
 * session involved — the token itself, checked live against the database on
 * every call, is the sole credential. A missing, mistyped, or revoked token
 * returns `null` rather than throwing, so the page can render a plain
 * "this link isn't valid" state instead of an error screen.
 */
export async function getMemberPortalData(token: string) {
  const [tokenRow] = await db
    .select({ memberId: schema.memberAccessTokens.memberId })
    .from(schema.memberAccessTokens)
    .where(and(eq(schema.memberAccessTokens.token, token), isNull(schema.memberAccessTokens.revokedAt)))
    .limit(1);
  if (!tokenRow) return null;

  const [member] = await db
    .select({ id: schema.members.id, name: schema.members.name })
    .from(schema.members)
    .where(eq(schema.members.id, tokenRow.memberId))
    .limit(1);
  if (!member) return null;

  const [scores, sessions] = await Promise.all([
    getMemberScores(member.id),
    db
      .select({
        id: schema.sessions.id,
        completedAt: schema.sessions.completedAt,
        mins: schema.sessions.mins,
        modalities: schema.sessions.modalities,
        painBefore: schema.sessions.painBefore,
        painAfter: schema.sessions.painAfter,
        memberSummary: schema.sessions.memberSummary,
      })
      .from(schema.sessions)
      .where(eq(schema.sessions.memberId, member.id))
      .orderBy(desc(schema.sessions.completedAt))
      .limit(20),
  ]);

  return { member, ...scores, sessions };
}
